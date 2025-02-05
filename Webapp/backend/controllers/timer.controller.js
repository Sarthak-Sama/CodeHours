const UserTime = require("../models/time.model");
const crypto = require("crypto");
const moment = require("moment");
const DailyTime = require("../models/dailyTime.model");

// Helper functions
const getDailyKey = () => moment().startOf("day").toDate();
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
  const { token, language, timeSpent } = req.body;

  // Validate input
  if (!token || !language || typeof timeSpent !== "number") {
    return res.status(400).json({
      error:
        "Invalid request. Token, language, and numeric timeSpent are required.",
    });
  }

  try {
    const currentTime = new Date();
    // Define a threshold (in milliseconds) for a gap that ends a session.
    // Since logs are sent every 2 minutes, a gap longer than 3 minutes indicates a new session.
    const THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

    // Retrieve the current user document so we can determine session continuity.
    let user = await UserTime.findOne({ token });
    if (!user) {
      return res.status(404).json({ error: "User session not found" });
    }

    // Determine if this log is part of an ongoing session or starts a new one.
    // If there is no stored current_session_start or if the gap between the previous log
    // (user.last_updated) and now is greater than our threshold, then we start a new session.
    let newSessionStart;
    if (
      !user.current_session_start ||
      currentTime - user.last_updated > THRESHOLD_MS
    ) {
      newSessionStart = currentTime;
    } else {
      newSessionStart = user.current_session_start;
    }

    // Compute the current session's duration in milliseconds.
    const sessionDuration = currentTime - newSessionStart;
    // If the current session duration exceeds the stored longest_coding_session,
    // then update longest_coding_session. (Assume these times are stored in ms.)
    const newLongestCodingSession =
      sessionDuration > (user.longest_coding_session || 0)
        ? sessionDuration
        : user.longest_coding_session;

    // Prepare date keys for daily/weekly updates.
    const today = getDailyKey(); // Assuming this returns a date key or similar value for today.
    const lastWeek = moment().subtract(7, "days").startOf("day").toDate();

    // Atomic update for UserTime using an aggregation pipeline.
    // We update all the timing fields as before and, additionally,
    // set the current_session_start and longest_coding_session using the values computed above.
    const updatedUser = await UserTime.findOneAndUpdate(
      { token },
      [
        {
          $set: {
            total_time: { $add: ["$total_time", timeSpent] },
            daily_time: {
              $cond: {
                if: { $lt: ["$last_updated", today] },
                then: timeSpent,
                else: { $add: ["$daily_time", timeSpent] },
              },
            },
            weekly_time: {
              $cond: {
                if: { $lt: ["$last_updated", lastWeek] },
                then: timeSpent,
                else: { $add: ["$weekly_time", timeSpent] },
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
                        daily_time: timeSpent,
                        weekly_time: timeSpent,
                        total_time: timeSpent,
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
                              if: { $lt: ["$$lang.last_updated", today] },
                              then: timeSpent,
                              else: { $add: ["$$lang.daily_time", timeSpent] },
                            },
                          },
                          weekly_time: {
                            $cond: {
                              if: { $lt: ["$$lang.last_updated", lastWeek] },
                              then: timeSpent,
                              else: { $add: ["$$lang.weekly_time", timeSpent] },
                            },
                          },
                          total_time: {
                            $add: ["$$lang.total_time", timeSpent],
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
            // Update our new session fields:
            current_session_start: newSessionStart,
            longest_coding_session: newLongestCodingSession,
          },
        },
      ],
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User session not found" });
    }

    // Update DailyTime with an atomic operation (as before).
    await DailyTime.findOneAndUpdate(
      { userId: updatedUser.userId, date: today },
      {
        $inc: { totalTime: timeSpent },
        $setOnInsert: { userId: updatedUser.userId, date: today },
      },
      { upsert: true }
    );

    // Updating User Level

    // currentXP is calculated from total_time (assumed to be in milliseconds),
    // so convert to minutes.
    const currentXP = updatedUser.total_time / (60 * 1000);
    // Calculate the new level based on the updated XP
    const newLevel = calculateLevel(currentXP);

    // Determine XP thresholds for the current level and the next level.
    const currentLevelThreshold = getXpForLevel(newLevel);
    const nextLevelThreshold = getXpForLevel(newLevel + 1);

    // Calculate XP progress within the current level.
    const xpIntoCurrentLevel = currentXP - currentLevelThreshold;
    // XP required to level up.
    const xpRequiredForNextLevel = nextLevelThreshold - currentLevelThreshold;

    // If the new level is higher than the current stored level, update it and the XP is upadted each time.
    await UserTime.updateOne(
      { token },
      {
        $set: {
          "level.xpAtCurrentLevel": xpIntoCurrentLevel,
          "level.xpForNextLevel": xpRequiredForNextLevel,
        },
        $max: {
          "level.current": newLevel,
        },
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
  const startOfMonth = moment().startOf("month").toDate();
  const result = await DailyTime.aggregate([
    { $match: { userId, date: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: "$totalTime" } } },
  ]);
  return { time: result.length ? result[0].total : 0 };
};

const getYearlyStats = async (userId) => {
  const startOfYear = moment().startOf("year").toDate();
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
