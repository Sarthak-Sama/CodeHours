const UserTime = require("../models/time.model");
const crypto = require("crypto");
const moment = require("moment");
const { Webhook } = require("svix");

module.exports.handleUserWebhook = async (req, res) => {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error(
      "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env"
    );
  }

  // Create a new Svix instance with the secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers and the raw payload from the request.
  const headers = req.headers;
  const payload = req.body;

  let evt;
  try {
    // Verify the webhook payload using Svix
    evt = wh.verify(payload, headers);
  } catch (err) {
    console.error("Error verifying webhook:", err.message);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Process the event based on its type
  const eventType = evt.type;
  const eventData = evt.data;
  try {
    if (eventType === "user.created") {
      // Create a new user if one does not exist
      const {
        id: userId,
        username,
        first_name,
        last_name,
        image_url: pfpUrl,
      } = eventData;

      // Add validation for required fields
      if (!userId) {
        console.log("Error: userId is required but not provided");
        return res.status(400).json({ error: "userId is required" });
      }

      const randomFourDigits = Math.floor(1000 + Math.random() * 9000);
      const fullname =
        [first_name, last_name].filter((n) => n).join(" ") || "Anonymous";
      const finalUsername =
        username ||
        `${first_name || "User"}${last_name || ""}${randomFourDigits}`;

      const existingUser = await UserTime.findOne({ userId });

      if (!existingUser) {
        // Create a unique session token
        const sessionKey = crypto.randomBytes(16).toString("hex");

        const newUser = await UserTime.create({
          token: sessionKey,
          userId,
          username: finalUsername,
          fullname,
          pfpUrl: pfpUrl || "", // Handle cases where pfpUrl might be null
          total_time: 0,
          daily_time: 0,
          weekly_time: 0,
          language_time: new Map(), // Initialize as Map
          last_updated: moment().utc(),
        });

        console.log("New user created via webhook:", newUser);
      } else {
        console.log(
          "User already exists for webhook user.created event:",
          existingUser
        );
      }
    } else if (eventType === "user.deleted") {
      // Delete the user if one exists
      const { id: userId } = eventData;
      if (!userId) {
        return res
          .status(400)
          .json({ error: "User Id not provided in event data" });
      }
      const deletedUser = await UserTime.findOneAndDelete({ userId });
      if (deletedUser) {
        console.log("User deleted via webhook:", deletedUser);
      } else {
        console.log("User not found for deletion:", userId);
      }
    } else if (eventType === "user.updated") {
      // Update the user's profile picture (and optionally username/fullname)
      const { id: userId, username, image_url: pfpUrl } = eventData;
      if (!userId) {
        return res
          .status(400)
          .json({ error: "User Id not provided in event data" });
      }

      try {
        const existingUser = await UserTime.findOne({ userId });
        if (!existingUser) {
          console.log("User not found for update.");
          return res.status(404).json({ error: "User not found for update" });
        }

        // Update pfpUrl only if it's provided and valid
        if (pfpUrl && typeof pfpUrl === "string") {
          existingUser.pfpUrl = pfpUrl;
          existingUser.username = username || existingUser.username;
          console.log("[DEBUG] Setting pfpUrl to:", pfpUrl);
        } else {
          console.log("[DEBUG] pfpUrl not provided or invalid:", pfpUrl);
        }

        existingUser.last_updated = moment().utc();

        // Explicitly mark the field as modified (for nested or mixed schemas)
        existingUser.markModified("username");
        existingUser.markModified("pfpUrl");

        // Save and log the result
        await existingUser.save();
        console.log("[DEBUG] User saved successfully:", existingUser);
      } catch (err) {
        console.error("[ERROR] Failed to save user:", err.message);
        return res.status(500).json({ error: "Database save failed" });
      }
    } else {
      console.log("Unhandled event type:", eventType);
    }

    return res

      .status(200)
      .json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("Error handling webhook event:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
