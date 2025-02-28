const mongoose = require("mongoose");

// Language aggregate subdocument; _id is disabled.
const LanguageTimeSchema = new mongoose.Schema(
  {
    daily_time: { type: Number, default: 0 },
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
      xpForNextLevel: { type: Number, default: 100 },
    },
    total_time: { type: Number, default: 0 }, // Cumulative time in milliseconds
    daily_time: { type: Number, default: 0 }, // Today's total coding time (resets at 00:00 IST)
    weekly_time: { type: Number, default: 0 },
    // Language aggregates stored as a Map keyed by language code.
    language_time: {
      type: Map,
      of: LanguageTimeSchema,
      default: {},
    },
    current_session_start: { type: Date, default: Date.now },
    // New field: tracks which IST day the daily_time applies to (format: "YYYY-MM-DD")
    daily_ist_date: { type: String },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically.
  }
);

module.exports = mongoose.model("UserTime", UserTimeSchema);
