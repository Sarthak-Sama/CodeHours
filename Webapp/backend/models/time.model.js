// models/UserTime.js
const mongoose = require("mongoose");

// Update LogEntrySchema to include instanceId for deduplication.
const LogEntrySchema = new mongoose.Schema({
  instanceId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // Duration in milliseconds
});

// Define a sub-schema for language time data.
// We use _id: false so that Mongoose does not create an _id for each subdocument.
const LanguageTimeSubSchema = new mongoose.Schema(
  {
    daily_time: { type: Number, default: 0 },
    total_time: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Use a Map to store language-specific data keyed by language name.
// With this approach, the field will be stored as a plain object when converted to JSON.
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
  // Change language_time to a Map so we can use dot-notation atomic updates.
  language_time: {
    type: Map,
    of: LanguageTimeSubSchema,
    default: {},
  },
  current_session_start: { type: Date, default: Date.now },
  longest_coding_session: { type: Number, default: 0 },
  log_entries: [LogEntrySchema],
  last_updated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserTime", UserTimeSchema);
