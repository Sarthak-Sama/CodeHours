const UserTime = require("../models/time.model");
const { webhooks } = require("@clerk/clerk-sdk-node");

module.exports.handlePfpUpdate = async (req, res) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  let event;
  try {
    // Verify the webhook signature using Clerk's helper
    event = webhooks.verifyWebhookSignature(
      req.body, // The raw request body
      req.headers["clerk-signature"], // Signature sent by Clerk in the headers
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send("Invalid webhook signature");
  }

  console.log("Received Clerk webhook event:", event); // To be removed in production

  if (event.type === "user.updated") {
    const userData = event.data;
    const userId = userData.id; // Clerk's user ID
    const newProfilePicture = userData.profile_image_url; // Updated profile picture URL

    await UserTime.findOneAndUpdate(
      { userId: userId },
      { pfpUrl: newProfilePicture }
    );
  }

  // Always respond with a 200 status to acknowledge receipt
  res.status(200).send("Webhook received");
};
