import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Make sure admin is initialized exactly once (other files may also initialize)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Re-export your existing functions so they keep working
export { incomingFaxWebhook, handleIncomingFaxWebhook } from "./incomingFaxWebhook";
export { provisionFaxNumber, releaseFaxNumber } from "./provisioning";
export { sendFaxReceivedNotification } from "./notifications";

// Import the shared handler
import { handleIncomingFaxWebhook } from "./incomingFaxWebhook";

/**
 * Public webhook endpoint (2nd Gen, Cloud Run) for Sinch to POST to
 * This delegates to the same handler logic as incomingFaxWebhook (1st Gen)
 */
export const sinchFaxWebhook = onRequest(
  { region: "us-central1", invoker: "public" },
  async (req, res) => {
    // Use the shared handler logic
    return handleIncomingFaxWebhook(req, res);
  }
);
