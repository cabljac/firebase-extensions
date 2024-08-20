import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin";
import { config } from "./config";
import { fetchFromApi } from "./fetchFromApi";

initializeApp();

const ENFORCE_APP_CHECK = config.ENFORCE_APP_CHECK === "yes";
// Define the structure of the data expected in the onCall function
interface ApiProxyRequest {
  headers?: Record<string, string>;
  httpMethod: string;
  body?: string | Record<string, unknown> | null;
  endpoint: string;
}

// Main onCall function for proxying requests
export const apiProxy = functions
  .region(config.LOCATION)
  .https.onCall(
    async (data: ApiProxyRequest, context: functions.https.CallableContext) => {
      try {
        // Enforce Firebase App Check if enabled
        if (ENFORCE_APP_CHECK) {
          const appCheckToken = context.app?.token;
          const appCheckTokenAlreadyConsumed = context.app?.alreadyConsumed;

          if (!appCheckToken) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "App Check token is missing."
            );
          }
          if (appCheckTokenAlreadyConsumed) {
            throw new functions.https.HttpsError(
              "failed-precondition",
              "App Check token has already been consumed."
            );
          }
        }

        // Construct the full API URL
        const apiUrl = `${config.API_URL}${data.endpoint}`;

        // Proxy the request to the API
        const apiResponse = await fetchFromApi(
          apiUrl,
          data.httpMethod,
          config.API_KEY,
          data.headers || {},
          data.body
        );

        return { data: apiResponse };
      } catch (error: unknown) {
        console.error("Error processing request", error);
        if (error instanceof Error) {
          throw new functions.https.HttpsError("internal", error.message);
        } else {
          throw new functions.https.HttpsError(
            "internal",
            "Unknown error occurred."
          );
        }
      }
    }
  );
