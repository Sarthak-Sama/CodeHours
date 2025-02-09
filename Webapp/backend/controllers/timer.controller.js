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
  // Destructure the new fields from the request body.
  const { token, language, startTime, endTime, instanceId } = req.body;

  // Validate input
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
    // Retrieve the user document by token.
    let user = await UserTime.findOne({ token });
    if (!user) {
      return res.status(404).json({ error: "User session not found." });
    }

    // Deduplication: determine the effective start time.
    // If the new interval's start is earlier than user.last_updated,
    // then only count from user.last_updated onward.
    let effectiveStartTime = startTimestamp;
    if (user.last_updated && new Date(user.last_updated) > startTimestamp) {
      effectiveStartTime = new Date(user.last_updated);
    }
    const effectiveTimeSpent = endTimestamp - effectiveStartTime;

    // If nothing new to add, simply return success.
    if (effectiveTimeSpent <= 0) {
      return res.status(200).json({ message: "No new time to log.", user });
    }

    // Use the incoming endTimestamp as the current time for logging.
    const currentTime = endTimestamp;

    // Define a threshold for rolling 24 hours.
    const twentyFourHoursAgo = new Date(
      currentTime.getTime() - 24 * 60 * 60 * 1000
    );

    // Define a threshold (in milliseconds) for a gap that ends a session.
    // Since logs are sent every 2 minutes, a gap longer than 3 minutes indicates a new session.
    const THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

    // Determine session boundaries.
    let newSessionStart;
    let newLongestCodingSession = user.longest_coding_session || 0;
    if (
      !user.current_session_start ||
      currentTime - new Date(user.last_updated) > THRESHOLD_MS
    ) {
      // If a session existed, calculate its duration.
      if (user.current_session_start && user.last_updated) {
        const endedSessionDuration =
          new Date(user.last_updated) - new Date(user.current_session_start);
        newLongestCodingSession = Math.max(
          newLongestCodingSession,
          endedSessionDuration
        );
      }
      // Start a new session.
      newSessionStart = currentTime;
    } else {
      // Session is continuing.
      newSessionStart = user.current_session_start;
      const sessionDuration =
        currentTime - new Date(user.current_session_start);
      newLongestCodingSession = Math.max(
        newLongestCodingSession,
        sessionDuration
      );
    }

    // Prepare date keys for daily/weekly updates.
    const today = getDailyKey();
    const lastWeek = moment().utc().subtract(7, "days").startOf("day").toDate();

    // Atomic update for UserTime using an aggregation pipeline.
    const updatedUser = await UserTime.findOneAndUpdate(
      { token },
      [
        {
          $set: {
            total_time: { $add: ["$total_time", effectiveTimeSpent] },
            daily_time: {
              $cond: {
                if: { $lt: ["$last_updated", twentyFourHoursAgo] },
                then: effectiveTimeSpent,
                else: { $add: ["$daily_time", effectiveTimeSpent] },
              },
            },
            weekly_time: {
              $cond: {
                if: { $lt: ["$last_updated", lastWeek] },
                then: effectiveTimeSpent,
                else: { $add: ["$weekly_time", effectiveTimeSpent] },
              },
            },
            last_updated: currentTime,
            language_time: {
              $cond: {
                if: { $not: { $in: [language, "$language_time.language"] } },
                then: {
                  $concatArrays: [
                    "$language_time",
                    [
                      {
                        language,
                        daily_time: effectiveTimeSpent,
                        weekly_time: effectiveTimeSpent,
                        total_time: effectiveTimeSpent,
                        last_updated: currentTime,
                      },
                    ],
                  ],
                },
                else: {
                  $map: {
                    input: "$language_time",
                    as: "lang",
                    in: {
                      $cond: {
                        if: { $eq: ["$$lang.language", language] },
                        then: {
                          language: "$$lang.language",
                          daily_time: {
                            $cond: {
                              if: {
                                $lt: [
                                  "$$lang.last_updated",
                                  twentyFourHoursAgo,
                                ],
                              },
                              then: effectiveTimeSpent,
                              else: {
                                $add: ["$$lang.daily_time", effectiveTimeSpent],
                              },
                            },
                          },
                          weekly_time: {
                            $cond: {
                              if: { $lt: ["$$lang.last_updated", lastWeek] },
                              then: effectiveTimeSpent,
                              else: {
                                $add: [
                                  "$$lang.weekly_time",
                                  effectiveTimeSpent,
                                ],
                              },
                            },
                          },
                          total_time: {
                            $add: ["$$lang.total_time", effectiveTimeSpent],
                          },
                          last_updated: currentTime,
                        },
                        else: "$$lang",
                      },
                    },
                  },
                },
              },
            },
            // Update session fields.
            current_session_start: newSessionStart,
            longest_coding_session: newLongestCodingSession,
          },
        },
      ],
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User session not found." });
    }

    // Update DailyTime with an atomic operation.
    await DailyTime.findOneAndUpdate(
      { userId: updatedUser.userId, date: today },
      {
        $inc: { totalTime: effectiveTimeSpent },
        $setOnInsert: { userId: updatedUser.userId, date: today },
      },
      { upsert: true }
    );

    // Updating User Level.
    // Here we assume total_time is in milliseconds, so we convert to minutes.
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

// Old fetchUser function, Now we are handling user creation with the clerk webhook
// module.exports.fetchUser = async (req, res) => {
//   const { userId, pfpUrl, username, fullname } = req.body;

//   if (!userId) {
//     return res.status(400).json({ error: "User Id not provided" });
//   }

//   try {
//     const existingUser = await UserTime.findOne({ userId });

//     if (!existingUser) {
//       if (!pfpUrl || !username) {
//         return res
//           .status(400)
//           .json({ error: "PfpUrl, Username or Fullname not provided" });
//       }
//       const sessionKey = crypto.randomBytes(16).toString("hex");
//       const newUser = await UserTime.create({
//         token: sessionKey,
//         userId,
//         username,
//         fullname,
//         pfpUrl,
//         total_time: 0,
//         daily_time: 0,
//         weekly_time: 0,
//         language_time: [],
//         last_updated: new Date(),
//       });

//       return res.status(200).json({
//         message: "New user created.",
//         user: newUser,
//       });
//     }

//     return res.status(200).json({
//       message: "User already exists",
//       user: existingUser,
//     });
//   } catch (error) {
//     return handleError(res, error, "create session");
//   }
// };

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
