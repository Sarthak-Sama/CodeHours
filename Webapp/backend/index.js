const express = require("express");
const { connectDB } = require("./config/db.config");
const timerController = require("./controllers/timer.controller");
const clerkWebhookController = require("./controllers/clerkWebhook.controller");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cookieParser());
app.use("/webhooks/clerk", bodyParser.raw({ type: "application/json" }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://p652kfhs-3000.inc1.devtunnels.ms",
      "https://code-tracker-frontend.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true, // Allow cookies
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use("/api/webhooks", bodyParser.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();

// Routes

// GET Routes
app.get("/api/stats", timerController.getUserTimeStats);
app.get("/api/leaderboard", timerController.getLeaderboard);
app.get("/api/activityData", timerController.getActivityData);
app.get("/api/codingTime", timerController.getCodingTime);
app.get("/api/getDailyTime", timerController.getDailyTime);

// POST Routes
app.post("/api/logTime", timerController.logCodingTime);
app.post("/api/fetchUser", timerController.fetchUser);
app.post("/api/updateAboutSection", timerController.updateAboutSection);

// Clerk Webhook route
app.post(
  "/api/webhooks",
  bodyParser.raw({ type: "application/json" }),
  clerkWebhookController.handleUserWebhook
),
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

module.exports = app;
