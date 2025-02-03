const express = require("express");
const expressSession = require("express-session");
const { connectDB } = require("./config/db.config");
const timerController = require("./controllers/timer.controller");
const cors = require("cors");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://p652kfhs-3000.inc1.devtunnels.ms",
      "https://your-production-domain.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true, // Allow cookies
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  expressSession({
    secret: process.env.EXPRESS_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevents client-side access
      secure: false,
    },
  })
);

connectDB();

// Routes
app.post("/api/logTime", timerController.logCodingTime);
app.post("/api/fetchUser", timerController.fetchUser);
app.post("/api/updateAboutSection", timerController.updateAboutSection);
app.post("/api/clerkUpdate", timerController.clerkUpdate);
app.get("/api/stats", timerController.getUserTimeStats);
app.get("/api/leaderboard", timerController.getLeaderboard);
app.get("/api/activityData", timerController.getActivityData);
app.get("/api/codingTime", timerController.getCodingTime);
// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
