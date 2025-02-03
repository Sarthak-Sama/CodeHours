const mongoose = require("mongoose");

const DailyTimeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true }, // Midnight timestamp
    totalTime: { type: Number, default: 0 },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 365, // Set to expire after 1 year
    },
  },
  {
    timestamps: true,
    index: [{ userId: 1, date: 1 }, { unique: true }],
  }
);

module.exports = mongoose.model("DailyTime", DailyTimeSchema);
