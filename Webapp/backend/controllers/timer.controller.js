const UserTime = require("../models/time.model");
const crypto = require("crypto");
const moment = require("moment");
const DailyTime = require("../models/dailyTime.model");

// Helper functions
const getDailyKey = () => moment().utc().startOf("day").toDate();
const handleError = (res, error, context) => {
  console.error(`${context} Error:`, error);
  return res.status(500).json({
    error: `Failed to ${context}`,
    message: error.message,
  });
};

// Using the formula: XP_total(n) = 100 * (n-1)*n/2
function calculateLevel(totalXP) {
  const discriminant = 1 + (4 * totalXP) / 50;
  const n = (1 + Math.sqrt(discriminant)) / 2;
  return Math.max(1, Math.floor(n));
}

// Helper function to get the total XP threshold for a given level.
function getXpForLevel(level) {
  // For level 1, threshold is 0 XP.
  if (level <= 1) return 0;
  return (100 * (level - 1) * level) / 2;
}

/**
 * Runs the given transaction function with retry logic.
 * If a transient error (like WriteConflict) occurs, the transaction is retried.
 *
 * @param {Function} txnFunc - The function that performs the transaction. Receives the session as its argument.
 */
async function runTransactionWithRetry(txnFunc) {
  const session = await UserTime.startSession();
  while (true) {
    try {
      session.startTransaction();
      await txnFunc(session);
      await session.commitTransaction();
      session.endSession();
      break; // success – exit the retry loop.
    } catch (error) {
      // If error is transient, retry.
      if (
        error.hasErrorLabel &&
        error.hasErrorLabel("TransientTransactionError")
      ) {
        console.warn(
          "TransientTransactionError, retrying transaction...",
          error
        );
        await session.abortTransaction();
        // Optionally: add a delay before retrying.
        continue;
      } else {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    }
  }
}

module.exports.logCodingTime = async (req, res) => {
  const { token, language, startTime, endTime, instanceId } = req.body;

  // Validate input.
  if (!token || !language || !startTime || !endTime) {
    return res.status(400).json({
      error:
        "Invalid request. Token, language, startTime, and endTime are required.",
    });
  }

  // Convert incoming timestamps to Date objects.
  const startTimestamp = new Date(startTime);
  const endTimestamp = new Date(endTime);
  if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
    return res
      .status(400)
      .json({ error: "Invalid startTime or endTime format." });
  }
  if (endTimestamp <= startTimestamp) {
    return res
      .status(400)
      .json({ error: "endTime must be greater than startTime." });
  }

  try {
    await runTransactionWithRetry(async (session) => {
      // Retrieve the user document within the session.
      let user = await UserTime.findOne({ token }).session(session);
      if (!user) {
        // Throwing an error here will abort the transaction and bubble up.
        throw new Error("User session not found.");
      }

      // Deduplication: Determine the effective start time.
      // If the new log's start is earlier than user.last_updated, only count from user.last_updated onward.
      let effectiveStartTime = startTimestamp;
      if (user.last_updated && new Date(user.last_updated) > startTimestamp) {
        effectiveStartTime = new Date(user.last_updated);
      }
      const effectiveTimeSpent = endTimestamp - effectiveStartTime;
      if (effectiveTimeSpent <= 0) {
        throw new Error("No new time to log.");
      }

      // Use the incoming endTimestamp as the current time.
      const currentTime = endTimestamp;

      // --- Overlapping Interval Deduplication ---
      // Two intervals overlap if: new.start < existing.end AND new.end > existing.start.
      const overlappingLog = user.time_logs.find((log) => {
        const logStart = new Date(log.startTime);
        const logEnd = new Date(log.endTime);
        return effectiveStartTime < logEnd && currentTime > logStart;
      });
      if (overlappingLog) {
        throw new Error("Overlapping log already exists.");
      }

      // --- Session Handling ---
      const THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
      let newSessionStart;
      let newLongestCodingSession = user.longest_coding_session || 0;
      if (
        !user.current_session_start ||
        currentTime - new Date(user.last_updated) > THRESHOLD_MS
      ) {
        if (user.current_session_start && user.last_updated) {
          const endedSessionDuration =
            new Date(user.last_updated) - new Date(user.current_session_start);
          newLongestCodingSession = Math.max(
            newLongestCodingSession,
            endedSessionDuration
          );
        }
        newSessionStart = currentTime;
      } else {
        newSessionStart = user.current_session_start;
        const sessionDuration =
          currentTime - new Date(user.current_session_start);
        newLongestCodingSession = Math.max(
          newLongestCodingSession,
          sessionDuration
        );
      }

      // --- Append the New Log Entry and Recalculate daily_time Using Logs ---
      const newLogEntry = {
        instanceId: instanceId,
        startTime: effectiveStartTime,
        endTime: currentTime,
        duration: effectiveTimeSpent,
        language: language,
      };

      // Append the new log.
      user.time_logs.push(newLogEntry);

      // Remove log entries older than 24 hours.
      const cutoff = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
      user.time_logs = user.time_logs.filter(
        (log) => new Date(log.endTime) >= cutoff
      );

      // Recalculate overall daily_time as the sum of durations from the logs in the last 24 hours.
      const recalculatedDailyTime = user.time_logs.reduce(
        (sum, log) => sum + log.duration,
        0
      );
      user.daily_time = recalculatedDailyTime;

      // Update the cumulative total time.
      user.total_time += effectiveTimeSpent;

      // --- Update Language-Specific Aggregates ---
      let langRecord = user.language_time.find(
        (item) => item.language === language
      );
      const languageLogs = user.time_logs.filter(
        (log) => log.language === language
      );
      const languageDailyTime = languageLogs.reduce(
        (sum, log) => sum + log.duration,
        0
      );

      if (langRecord) {
        langRecord.total_time += effectiveTimeSpent;
        langRecord.daily_time = languageDailyTime;
        // weekly_time can be updated elsewhere (e.g., from DailyTime docs)
        langRecord.weekly_time += effectiveTimeSpent;
        langRecord.last_updated = currentTime;
      } else {
        user.language_time.push({
          language: language,
          total_time: effectiveTimeSpent,
          daily_time: effectiveTimeSpent,
          weekly_time: effectiveTimeSpent,
          last_updated: currentTime,
        });
      }

      // --- Update Session Fields and Last Updated ---
      user.current_session_start = newSessionStart;
      user.longest_coding_session = newLongestCodingSession;
      user.last_updated = currentTime;

      // Save the updated user document within the transaction.
      await user.save({ session });

      // --- Update DailyTime Document ---
      // This document (keyed by userId and today's midnight) is used later for weekly time calculations.
      const today = getDailyKey(); // e.g., a function that returns today's date at midnight.
      await DailyTime.findOneAndUpdate(
        { userId: user.userId, date: today },
        {
          $inc: { totalTime: effectiveTimeSpent },
          $setOnInsert: { userId: user.userId, date: today },
        },
        { upsert: true, session }
      );

      // --- Update User Level ---
      // Assume total_time is in milliseconds; convert to minutes for XP calculations.
      const currentXP = user.total_time / (60 * 1000);
      const newLevel = calculateLevel(currentXP);
      const currentLevelThreshold = getXpForLevel(newLevel);
      const nextLevelThreshold = getXpForLevel(newLevel + 1);
      const xpIntoCurrentLevel = currentXP - currentLevelThreshold;
      const xpRequiredForNextLevel = nextLevelThreshold - currentLevelThreshold;

      await UserTime.updateOne(
        { token },
        {
          $set: {
            "level.xpAtCurrentLevel": xpIntoCurrentLevel,
            "level.xpForNextLevel": xpRequiredForNextLevel,
          },
          $max: { "level.current": newLevel },
        },
        { session }
      );
    });

    // After a successful transaction, re-fetch the updated user document.
    const updatedUser = await UserTime.findOne({ token });
    return res.status(200).json({
      message: "Time logged successfully",
      user: updatedUser,
    });
  } catch (error) {
    return handleError(res, error, "log coding time");
  }
};

module.exports.updateAboutSection = async (req, res) => {
  try {
    const { userId, content } = req.body;

    // Find the user by userId and update the 'about' field with the new content
    const updatedUser = await UserTime.findOneAndUpdate(
      { userId }, // Filter to find the user by userId
      { $set: { about: content } }, // Update the 'about' field
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the updated user information
    return res.status(200).json({
      message: "About section updated successfully",
      aboutSection: updatedUser.about,
    });
  } catch (error) {
    handleError(error);
  }
};

module.exports.getUserTimeStats = async (req, res) => {
  const { token, period } = req.query;
  const validPeriods = ["daily", "weekly", "monthly", "yearly", "total"];

  if (!token || !period || !validPeriods.includes(period)) {
    return res.status(400).json({
      error: `Valid token and period (${validPeriods.join(", ")}) are required`,
    });
  }

  try {
    const user = await UserTime.findOne({ token });
    if (!user) return res.status(404).json({ error: "User not found" });

    let stats = {};
    switch (period) {
      case "daily":
        stats = { time: user.daily_time };
        break;
      case "weekly":
        stats = { time: user.weekly_time };
        break;
      case "monthly":
        stats = await getMonthlyStats(user.userId);
        break;
      case "yearly":
        stats = await getYearlyStats(user.userId);
        break;
      case "total":
        stats = { time: user.total_time };
        break;
    }

    return res.status(200).json(stats);
  } catch (error) {
    return handleError(res, error, "fetch statistics");
  }
};

// Helper functions for stats
const getMonthlyStats = async (userId) => {
  const startOfMonth = moment().utc().startOf("month").toDate();
  const result = await DailyTime.aggregate([
    { $match: { userId, date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: "$totalTime" } } },
  ]);
  return { time: result.length ? result[0].total : 0 };
};

const getYearlyStats = async (userId) => {
  const startOfYear = moment().utc().startOf("year").toDate();
  const result = await DailyTime.aggregate([
    { $match: { userId, date: { $gte: startOfYear } } },
    { $group: { _id: null, total: { $sum: "$totalTime" } } },
  ]);
  return { time: result.length ? result[0].total : 0 };
};

module.exports.fetchUser = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User Id not provided" });
  }

  try {
    // Fetch the user document
    const user = await UserTime.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate the start of today (midnight)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Determine the date 6 days before today so that we cover 7 days (today plus the previous 6 days)
    const sevenDaysAgo = new Date(
      startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000
    );

    // Fetch DailyTime documents for this user from the past 7 days
    const dailyTimes = await DailyTime.find({
      userId,
      date: { $gte: sevenDaysAgo },
    });

    // Sum the totalTime from the fetched DailyTime documents to calculate weekly_time
    let weekly_time = 0;
    dailyTimes.forEach((doc) => {
      weekly_time += doc.totalTime;
    });

    // Optionally update the user document's weekly_time field (if you want to reflect it here)
    user.weekly_time = weekly_time;

    return res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await UserTime.find()
      .sort({ daily_time: -1 })
      .limit(100);

    return res.status(200).json({
      message: "Leaderboard fetched successfully.",
      data: leaderboard,
    });
  } catch (error) {
    return handleError(res, error, "fetch leaderboard");
  }
};

module.exports.getActivityData = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const activityData = await DailyTime.find({ userId });

    if (!activityData.length) {
      return res
        .status(404)
        .json({ message: "No activity data found for this user" });
    }

    res.status(200).json({
      message: "Activity Data fetched successfully.",
      data: activityData,
    });
  } catch (error) {
    console.error("Error fetching activity data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.clerkUpdate = async (req, res) => {
  try {
    // Verify webhook signature (for security)
    const signature = req.headers["clerk-signature"];
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", process.env.CLERK_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    const { type, data } = req.body;

    if (type === "user.updated") {
      const { id, image_url } = data;

      // Update the user's profile picture in your database
      await UserTime.updateOne({ userId: id }, { $set: { pfpUrl: image_url } });

      console.log(`Updated profile picture for user ${id}`);
    }

    res.status(200).json({ message: "Webhook received successfully" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.getCodingTime = async (req, res) => {
  try {
    // Extract the required user parameter and optional timespan from the query string.
    const username = req.query.user;
    if (!username) {
      return res.status(400).json({ error: "User parameter is required." });
    }

    // Find the user's coding time data in the database.
    const userTime = await UserTime.findOne({ username: username });
    if (!userTime) {
      return res.status(404).json({ error: "User not found." });
    }

    // Determine which time value to return:
    // If a timespan is specified (daily or weekly), return that; otherwise, use total_time.
    let totalTime;
    const timespan = req.query.timespan;
    if (timespan === "daily") {
      totalTime = userTime.daily_time;
    } else if (timespan === "weekly") {
      totalTime = userTime.weekly_time;
    } else {
      totalTime = userTime.total_time;
    }

    // Determine if the user is actively coding.
    // For this example, we assume that if the time elapsed since the last update is less than 150 seconds, the user is coding.
    const now = new Date();
    const lastUpdated = userTime.last_updated;
    const diffSeconds = (now - lastUpdated) / 1000;
    const isCoding = diffSeconds <= 120; // adjust threshold as needed

    // Respond with data formatted for the widget.
    res.json({
      totalTime: totalTime,
      isCoding: isCoding,
      lastUpdated: lastUpdated.toISOString(),
    });
  } catch (error) {
    console.error("Error in getCodingTime:", error);
    res.status(500).json({ error: "Server error." });
  }
};

module.exports.getDailyTime = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token parameter is missing." });
  }

  try {
    const userTime = await UserTime.findOne({ token });
    if (!userTime) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ daily_time: userTime.daily_time });
  } catch (error) {
    console.error("Error retrieving daily time:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
