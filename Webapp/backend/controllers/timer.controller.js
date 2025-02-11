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

  // We assume that the client (or a server–side adjustment) determines the effectiveStartTime.
  const effectiveStartTime = startTimestamp;
  const effectiveTimeSpent = endTimestamp - effectiveStartTime;
  if (effectiveTimeSpent <= 0) {
    return res.status(200).json({ message: "No new time to log." });
  }
  const currentTime = endTimestamp;

  // Calculate the cutoff date for log entries older than 24 hours.
  const cutoff = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

  // Build the new log entry.
  const newLogEntry = {
    instanceId,
    startTime: effectiveStartTime,
    endTime: currentTime,
    duration: effectiveTimeSpent,
    language,
  };

  try {
    // Step 1: Push the new log entry.
    // The query ensures that there is no overlapping log in the time_logs array.
    const query = {
      token,
      time_logs: {
        $not: {
          $elemMatch: {
            startTime: { $lt: endTimestamp },
            endTime: { $gt: effectiveStartTime },
          },
        },
      },
    };

    let user = await UserTime.findOneAndUpdate(
      query,
      { $push: { time_logs: newLogEntry } },
      { new: true }
    );

    if (!user) {
      return res
        .status(400)
        .json({ error: "Overlapping log exists or user not found." });
    }

    // Step 2: Update totals, session fields, and remove old logs.
    user = await UserTime.findOneAndUpdate(
      { token },
      {
        $pull: { time_logs: { endTime: { $lt: cutoff } } },
        $inc: {
          total_time: effectiveTimeSpent,
          daily_time: effectiveTimeSpent,
        },
        $set: { last_updated: currentTime },
        $max: { longest_coding_session: effectiveTimeSpent },
      },
      { new: true }
    );

    // Step 3: Update language-specific aggregates.
    const langUpdateResult = await UserTime.updateOne(
      { token, "language_time.language": language },
      {
        $inc: {
          "language_time.$.total_time": effectiveTimeSpent,
          "language_time.$.daily_time": effectiveTimeSpent,
          "language_time.$.weekly_time": effectiveTimeSpent,
        },
        $set: { "language_time.$.last_updated": currentTime },
      }
    );

    // If no record was updated (i.e. no language record exists), push a new one.
    if (langUpdateResult.nModified === 0) {
      await UserTime.updateOne(
        { token },
        {
          $push: {
            language_time: {
              language,
              total_time: effectiveTimeSpent,
              daily_time: effectiveTimeSpent,
              weekly_time: effectiveTimeSpent,
              last_updated: currentTime,
            },
          },
        },
        {}
      );
    }

    // Step 4: Update the DailyTime document for today.
    await DailyTime.findOneAndUpdate(
      { userId: user.userId, date: getDailyKey() },
      {
        $inc: { totalTime: effectiveTimeSpent },
        $setOnInsert: { userId: user.userId, date: getDailyKey() },
      },
      { upsert: true, new: true }
    );

    // Step 5: Update the user's level.
    // (Assuming total_time is in milliseconds and XP is calculated in minutes.)
    const currentXP = user.total_time / (60 * 1000);
    const newLevel = calculateLevel(currentXP);
    const currentLevelThreshold = getXpForLevel(newLevel);
    const nextLevelThreshold = getXpForLevel(newLevel + 1);
    const xpIntoCurrentLevel = currentXP - currentLevelThreshold;

    await UserTime.updateOne(
      { token },
      {
        $set: {
          "level.xpAtCurrentLevel": xpIntoCurrentLevel,
          "level.xpForNextLevel": nextLevelThreshold - currentLevelThreshold,
        },
        $max: { "level.current": newLevel },
      },
      {}
    );

    // Re-fetch the updated user document.
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

    // Use findOneAndUpdate with a $set operator to update the about field atomically.
    const updatedUser = await UserTime.findOneAndUpdate(
      { userId },
      { $set: { about: content } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "About section updated successfully",
      aboutSection: updatedUser.about,
    });
  } catch (error) {
    return handleError(res, error, "update about section");
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
    const weekly_time = dailyTimes.reduce((sum, doc) => sum + doc.totalTime, 0);

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
