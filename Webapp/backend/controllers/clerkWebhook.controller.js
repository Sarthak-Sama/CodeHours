const UserTime = require("../models/time.model");
const crypto = require("crypto");
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

  // Get the required Svix headers for verification
  const svix_id = headers["svix-id"];
  const svix_timestamp = headers["svix-timestamp"];
  const svix_signature = headers["svix-signature"];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({
      success: false,
      message: "Error: Missing svix headers",
    });
  }

  let evt;
  try {
    // Verify the webhook payload using Svix
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
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
      const { id: userId, username, fullname, image_url: pfpUrl } = eventData;

      if (!userId || !username || !fullname || pfpUrl) {
        return res
          .status(400)
          .json({ error: "All credentials are not provided in event data" });
      }

      const existingUser = await UserTime.findOne({ userId });

      if (!existingUser) {
        if (!pfpUrl || !username) {
          return res
            .status(400)
            .json({ error: "PfpUrl or Username not provided in event data" });
        }

        // Create a unique session token
        const sessionKey = crypto.randomBytes(16).toString("hex");

        const newUser = await UserTime.create({
          token: sessionKey,
          userId,
          username,
          fullname,
          pfpUrl,
          total_time: 0,
          daily_time: 0,
          weekly_time: 0,
          language_time: [],
          last_updated: new Date(),
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
      const { id: userId, image_url: pfpUrl } = eventData;
      if (!userId) {
        return res
          .status(400)
          .json({ error: "User Id not provided in event data" });
      }

      const existingUser = await UserTime.findOne({ userId });
      if (!existingUser) {
        return res.status(404).json({ error: "User not found for update" });
      }

      // Update the fields if provided
      if (pfpUrl) existingUser.pfpUrl = pfpUrl;
      existingUser.last_updated = new Date();

      await existingUser.save();
      console.log("User updated via webhook:", existingUser);
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
