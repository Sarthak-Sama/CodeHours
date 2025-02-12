const mongoose = require("mongoose");

// Update LogEntrySchema to include instanceId for deduplication.
const LogEntrySchema = new mongoose.Schema({
  instanceId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // Duration in milliseconds
  language: { type: String },
});

const LanguageTimeSchema = new mongoose.Schema({
  language: { type: String, required: true },
  daily_time: { type: Number, default: 0 },
  weekly_time: { type: Number, default: 0 },
  total_time: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now },
});

const UserTimeSchema = new mongoose.Schema({
  token: { type: String, unique: true, required: true },
  userId: { type: String, unique: true, required: true },
  username: { type: String, unique: true, required: true },
  fullname: { type: String, required: true },
  pfpUrl: { type: String },
  about: { type: String },
  level: {
    current: { type: Number, default: 1 },
    xpAtCurrentLevel: { type: Number, default: 0 },
    xpForNextLevel: { type: Number, default: 100 }, // Starting threshold (for level 2)
  },
  total_time: { type: Number, default: 0 }, // Cumulative total time
  daily_time: { type: Number, default: 0 }, // Time spent in the last 24 hours
  weekly_time: { type: Number, default: 0 }, // Time spent in the last 7 days
  language_time: [LanguageTimeSchema], // Aggregated language-specific times
  current_session_start: { type: Date, default: Date.now },
  time_logs: [LogEntrySchema],
  last_updated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserTime", UserTimeSchema);
