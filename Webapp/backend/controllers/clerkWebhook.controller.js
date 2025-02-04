const UserTime = require("../models/time.model");
const { Webhook } = require("svix");

const handleError = (res, error, context) => {
  console.error(`${context} Error:`, error);
  return res.status(500).json({
    error: `Failed to ${context}`,
    message: error.message,
  });
};

module.exports.handlePfpUpdate = async (req, res) => {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    return handleError(
      res,
      new Error("SIGNING_SECRET is missing from environment variables"),
      "verify webhook signature"
    );
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers and body
  const headers = req.headers;
  const payload = req.body;

  // Get Svix headers for verification
  const svix_id = headers["svix-id"];
  const svix_timestamp = headers["svix-timestamp"];
  const svix_signature = headers["svix-signature"];

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({
      success: false,
      message: "Error: Missing svix headers",
    });
  }

  let evt;

  // Attempt to verify the incoming webhook
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    return handleError(res, err, "verify webhook signature");
  }

  // Extracting data from the event (evt)
  console.log(evt); // Remove this in production
  const eventType = evt.type;

  if (eventType === "user.updated") {
    const { id, profile_image_url } = evt.data;

    try {
      const updateResult = await UserTime.findOneAndUpdate(
        { userId: id },
        { pfpUrl: profile_image_url },
        { new: true }
      );

      if (!updateResult) {
        return res.status(404).json({
          success: false,
          message: `User with ID ${id} not found for profile update`,
        });
      }
    } catch (err) {
      return handleError(res, err, "update user profile image URL in database");
    }
  }

  return res.status(200).json({
    success: true,
    message: "Updated the profile image via Clerk / Svix Webhook.",
  });
};
