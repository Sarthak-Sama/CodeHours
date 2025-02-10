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

module.exports.logCodingTime = async (req, res) => {
  const { token, language, startTime, endTime, instanceId } = req.body;

  if (!token || !language || !startTime || !endTime) {
    return res.status(400).json({
      error:
        "Invalid request. Token, language, startTime, and endTime are required.",
    });
  }

  const startTimestamp = new Date(startTime);
  const endTimestamp = new Date(endTime);
  if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
    return res.status(400).json({
      error: "Invalid startTime or endTime format.",
    });
  }
  if (endTimestamp <= startTimestamp) {
    return res
      .status(400)
      .json({ error: "endTime must be greater than startTime." });
  }

  try {
    let user = await UserTime.findOne({ token });
    if (!user) {
      return res.status(404).json({ error: "User session not found." });
    }

    let effectiveStartTime = startTimestamp;
    if (user.last_updated && new Date(user.last_updated) > startTimestamp) {
      effectiveStartTime = new Date(user.last_updated);
    }
    const effectiveTimeSpent = endTimestamp - effectiveStartTime;

    if (effectiveTimeSpent <= 0) {
      return res.status(200).json({ message: "No new time to log.", user });
    }

    const currentTime = endTimestamp;
    const THRESHOLD_MS = 3 * 60 * 1000;

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

    const logEntry = {
      startTime: effectiveStartTime,
      endTime: endTimestamp,
      duration: effectiveTimeSpent,
    };

    const twentyFourHoursAgo = new Date(
      currentTime.getTime() - 24 * 60 * 60 * 1000
    );

    // Atomic update for UserTime
    const updatedUser = await UserTime.findOneAndUpdate(
      { token },
      {
        $push: { log_entries: logEntry },
        $pull: { log_entries: { endTime: { $lte: twentyFourHoursAgo } } },
        $inc: { total_time: effectiveTimeSpent },
        $set: {
          daily_time: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$log_entries",
                    as: "entry",
                    cond: { $gt: ["$$entry.endTime", twentyFourHoursAgo] },
                  },
                },
                as: "entry",
                in: "$$entry.duration",
              },
            },
          },
          last_updated: currentTime,
          current_session_start: newSessionStart,
          longest_coding_session: newLongestCodingSession,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User session not found." });
    }

    // Update DailyTime document
    const today = moment().utc().startOf("day").toDate();
    await DailyTime.findOneAndUpdate(
      { userId: updatedUser.userId, date: today },
      { $inc: { totalTime: effectiveTimeSpent } },
      { upsert: true }
    );

    const currentXP = updatedUser.total_time / (60 * 1000);
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
      }
    );

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

  if (!token || !period) {
    return res.status(400).json({
      error: "Valid token and period are required",
    });
  }

  try {
    const user = await UserTime.findOne({ token });
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailyTime = user.log_entries
      .filter((entry) => entry.endTime > twentyFourHoursAgo)
      .reduce((total, entry) => total + entry.duration, 0);

    const weeklyTimeDocs = await DailyTime.find({
      userId: user.userId,
      date: { $gte: sevenDaysAgo },
    });

    const weeklyTime = weeklyTimeDocs.reduce(
      (total, doc) => total + doc.totalTime,
      0
    );

    let stats = {};
    switch (period) {
      case "daily":
        stats = { time: dailyTime };
        break;
      case "weekly":
        stats = { time: weeklyTime };
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
    const user = await UserTime.findOne({ userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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
