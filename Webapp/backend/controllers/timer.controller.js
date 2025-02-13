const UserTime = require("../models/time.model");
const DailyTime = require("../models/dailyTime.model");
const crypto = require("crypto");
const moment = require("moment");

// Helper functions
const getDailyKey = () => moment().utc().startOf("day").toDate();

const handleError = (res, error, context) => {
  console.error(`${context} Error:`, error);
  return res.status(500).json({
    error: `Failed to ${context}`,
    message: error.message,
  });
};

// XP and Level calculations remain the same.
function calculateLevel(totalXP) {
  const discriminant = 1 + (4 * totalXP) / 50;
  const n = (1 + Math.sqrt(discriminant)) / 2;
  return Math.max(1, Math.floor(n));
}

function getXpForLevel(level) {
  if (level <= 1) return 0;
  return (100 * (level - 1) * level) / 2;
}

/**
 * logCodingTime
 * Logs a new coding session, removes logs older than 24h, updates aggregates,
 * updates language-specific stats using the Map field, updates DailyTime, and adjusts level.
 */
module.exports.logCodingTime = async (req, res) => {
  console.log("chala");
  const { token, language, startTime, endTime, instanceId } = req.body;

  // Validate inputs.
  if (!token || !language || !startTime || !endTime) {
    return res.status(400).json({
      error:
        "Invalid request. Token, language, startTime, and endTime are required.",
    });
  }

  // Parse timestamps.
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

  const effectiveTimeSpent = endTimestamp - startTimestamp;
  if (effectiveTimeSpent <= 0) {
    return res.status(200).json({ message: "No new time to log." });
  }
  const currentTime = endTimestamp;
  const cutoff = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

  // Build log entry.
  const newLogEntry = {
    instanceId,
    startTime: startTimestamp,
    endTime: currentTime,
    duration: effectiveTimeSpent,
    language,
  };

  try {
    // Step 1: Atomically push new log and pull out old logs, and increment total_time.
    // The query ensures there is no overlapping log.
    const query = {
      token,
      time_logs: {
        $not: {
          $elemMatch: {
            startTime: { $lt: endTimestamp },
            endTime: { $gt: startTimestamp },
          },
        },
      },
    };
    const updateOps = {
      $push: { time_logs: newLogEntry },
      $pull: { time_logs: { endTime: { $lt: cutoff } } },
      $inc: { total_time: effectiveTimeSpent },
      $set: { updatedAt: currentTime }, // using Mongoose timestamps instead of manual last_updated
    };

    let user = await UserTime.findOneAndUpdate(query, updateOps, {
      new: true,
    }).lean();
    if (!user) {
      return res
        .status(400)
        .json({ error: "Overlapping log exists or user not found." });
    }

    // Step 2: Recalculate daily_time from time_logs.
    const recalculatedDailyTime = user.time_logs.reduce(
      (acc, log) => acc + log.duration,
      0
    );
    user = await UserTime.findOneAndUpdate(
      { token },
      { $set: { daily_time: recalculatedDailyTime, updatedAt: currentTime } },
      { new: true }
    ).lean();

    // Step 3: Update language-specific aggregates using the Map.
    // Construct the dynamic keys for the language field.
    const langKeyTotal = `language_time.${language}.total_time`;
    const langKeyDaily = `language_time.${language}.daily_time`;
    const langKeyWeekly = `language_time.${language}.weekly_time`;
    const langKeyLastUpdated = `language_time.${language}.last_updated`;

    // Try updating existing language stats.
    const langUpdate = await UserTime.updateOne(
      { token, [`language_time.${language}`]: { $exists: true } },
      {
        $inc: {
          [langKeyTotal]: effectiveTimeSpent,
          [langKeyDaily]: effectiveTimeSpent,
          [langKeyWeekly]: effectiveTimeSpent,
        },
        $set: { [langKeyLastUpdated]: currentTime },
      }
    );
    // If no language record exists, then add one.
    if (langUpdate.modifiedCount === 0) {
      // Create a new subdocument object.
      const newLangEntry = {
        daily_time: effectiveTimeSpent,
        weekly_time: effectiveTimeSpent,
        total_time: effectiveTimeSpent,
        last_updated: currentTime,
      };
      await UserTime.updateOne(
        { token },
        { $set: { [`language_time.${language}`]: newLangEntry } }
      );
    }

    // Step 4: Update DailyTime for today.
    await DailyTime.findOneAndUpdate(
      { userId: user.userId, date: getDailyKey() },
      {
        $inc: { totalTime: effectiveTimeSpent },
        $setOnInsert: { userId: user.userId, date: getDailyKey() },
      },
      { upsert: true, new: true }
    );

    // Step 5: Update level info based on total_time.
    const currentXP = user.total_time / (60 * 1000); // XP in minutes
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
      }
    );

    // Re-fetch updated user.
    const updatedUser = await UserTime.findOne({ token }).lean();
    return res.status(200).json({
      message: "Time logged successfully",
      user: updatedUser,
    });
  } catch (error) {
    return handleError(res, error, "log coding time");
  }
};

/**
 * updateAboutSection
 * Updates the user's about section.
 */
module.exports.updateAboutSection = async (req, res) => {
  try {
    const { userId, content } = req.body;
    if (!userId) return res.status(400).json({ error: "User Id is required." });

    const updatedUser = await UserTime.findOneAndUpdate(
      { userId },
      { $set: { about: content } },
      { new: true }
    ).lean();

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      message: "About section updated successfully",
      aboutSection: updatedUser.about,
    });
  } catch (error) {
    return handleError(res, error, "update about section");
  }
};

/**
 * getUserTimeStats
 * Returns time statistics based on a requested period.
 */
module.exports.getUserTimeStats = async (req, res) => {
  const { token, period } = req.query;
  const validPeriods = ["daily", "weekly", "monthly", "yearly", "total"];
  if (!token || !period || !validPeriods.includes(period)) {
    return res.status(400).json({
      error: `Valid token and period (${validPeriods.join(", ")}) are required`,
    });
  }
  try {
    const user = await UserTime.findOne({ token }).lean();
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

// Helper functions for stats.
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

/**
 * fetchUser
 * Fetches a user document and computes weekly_time from DailyTime records.
 */
module.exports.fetchUser = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "User Id not provided" });
  try {
    const user = await UserTime.findOne({ userId }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(
      startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000
    );

    const dailyTimes = await DailyTime.find({
      userId,
      date: { $gte: sevenDaysAgo },
    }).lean();

    const weekly_time = dailyTimes.reduce((sum, doc) => sum + doc.totalTime, 0);
    user.weekly_time = weekly_time;
    return res.status(200).json({ message: "User fetched successfully", user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * getLeaderboard
 * Returns the top 100 users sorted by daily_time.
 */
module.exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await UserTime.find()
      .sort({ daily_time: -1 })
      .limit(100)
      .lean();
    return res.status(200).json({
      message: "Leaderboard fetched successfully.",
      data: leaderboard,
    });
  } catch (error) {
    return handleError(res, error, "fetch leaderboard");
  }
};

/**
 * getActivityData
 * Returns all DailyTime records for a given user.
 */
module.exports.getActivityData = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const activityData = await DailyTime.find({ userId }).lean();
    if (!activityData.length) {
      return res
        .status(404)
        .json({ message: "No activity data found for this user" });
    }
    return res.status(200).json({
      message: "Activity Data fetched successfully.",
      data: activityData,
    });
  } catch (error) {
    console.error("Error fetching activity data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * clerkUpdate
 * Processes webhooks from Clerk to update profile picture.
 */
module.exports.clerkUpdate = async (req, res) => {
  try {
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
      await UserTime.updateOne({ userId: id }, { $set: { pfpUrl: image_url } });
      console.log(`Updated profile picture for user ${id}`);
    }
    return res.status(200).json({ message: "Webhook received successfully" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * getCodingTime
 * Returns coding time statistics for a user and whether the user is actively coding.
 */
module.exports.getCodingTime = async (req, res) => {
  try {
    const username = req.query.user;
    if (!username)
      return res.status(400).json({ error: "User parameter is required." });

    const userTime = await UserTime.findOne({ username }).lean();
    if (!userTime) return res.status(404).json({ error: "User not found." });

    let totalTime;
    const timespan = req.query.timespan;
    if (timespan === "daily") totalTime = userTime.daily_time;
    else if (timespan === "weekly") totalTime = userTime.weekly_time;
    else totalTime = userTime.total_time;

    const now = new Date();
    const diffSeconds = (now - userTime.updatedAt) / 1000;
    const isCoding = diffSeconds <= 120; // adjust threshold as needed

    return res.json({
      totalTime,
      isCoding,
      lastUpdated: userTime.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error in getCodingTime:", error);
    return res.status(500).json({ error: "Server error." });
  }
};

/**
 * getDailyTime
 * Returns the daily_time field for a given user based on token.
 */
module.exports.getDailyTime = async (req, res) => {
  const { token } = req.query;
  if (!token)
    return res.status(400).json({ error: "Token parameter is missing." });
  try {
    const userTime = await UserTime.findOne({ token }).lean();
    if (!userTime) return res.status(404).json({ error: "User not found." });
    return res.status(200).json({ daily_time: userTime.daily_time });
  } catch (error) {
    console.error("Error retrieving daily time:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
