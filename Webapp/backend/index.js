const express = require("express");
const expressSession = require("express-session");
const MongoStore = require("connect-mongo");
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
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // Use your MongoDB connection string
      collectionName: "sessions", // Optional: Specify collection name
      ttl: 7 * 60 * 60 * 24, // 7 day session expiry (in seconds)
    }),
    secret: process.env.EXPRESS_SECRET || "super-secret-key", // Use a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevents XSS attacks
      secure: false, // to be changed to process.env.NODE_ENV === 'production' later
      maxAge: 7 * 1000 * 60 * 60 * 24, // 7-day session expiration
    },
  })
);

connectDB();

// Routes

// GET Routes
app.get("/api/stats", timerController.getUserTimeStats);
app.get("/api/leaderboard", timerController.getLeaderboard);
app.get("/api/activityData", timerController.getActivityData);
app.get("/api/codingTime", timerController.getCodingTime);

// POST Routes
app.post("/api/logTime", timerController.logCodingTime);
app.post("/api/fetchUser", timerController.fetchUser);
app.post("/api/updateAboutSection", timerController.updateAboutSection);

// Clerk Webhook route
app.post("/webhooks/clerk", clerkWebhookController.handlePfpUpdate),
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

module.exports = app;
