const mongoose = require("mongoose");

// Log entry subdocument; we disable _id to reduce overhead.
const LogEntrySchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // Duration in milliseconds
    language: { type: String, required: true },
  },
  { _id: false }
);

// Language aggregate subdocument; _id is disabled.
const LanguageTimeSchema = new mongoose.Schema(
  {
    daily_time: { type: Number, default: 0 },
    weekly_time: { type: Number, default: 0 },
    total_time: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserTimeSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true, required: true, index: true },
    userId: { type: String, unique: true, required: true, index: true },
    username: { type: String, unique: true, required: true, index: true },
    fullname: { type: String, required: true },
    pfpUrl: { type: String },
    about: { type: String },
    level: {
      current: { type: Number, default: 1 },
      xpAtCurrentLevel: { type: Number, default: 0 },
      xpForNextLevel: { type: Number, default: 100 }, // Starting threshold for level 2
    },
    total_time: { type: Number, default: 0 }, // Cumulative time in milliseconds
    daily_time: { type: Number, default: 0 }, // Time in the last 24 hours
    weekly_time: { type: Number, default: 0 }, // Time in the last 7 days
    // Language aggregates stored as a Map keyed by language code.
    language_time: {
      type: Map,
      of: LanguageTimeSchema,
      default: {},
    },
    current_session_start: { type: Date, default: Date.now },
    // Embedded log entries; if these grow too large, consider a separate collection.
    time_logs: { type: [LogEntrySchema], default: [] },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically.
  }
);

module.exports = mongoose.model("UserTime", UserTimeSchema);
