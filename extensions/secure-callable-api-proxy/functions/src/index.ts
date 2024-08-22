import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin";
import { fetchFromApi } from "./fetchFromApi";
import type { ApiProxyRequest } from "./schema";
import { getFetchOptions } from "./getFetchOptions";
import { ConfigSchema } from "./schema";

// Parse the environment configuration
const config = ConfigSchema.parse(process.env);

// Initialize Firebase Admin
initializeApp();

export const apiproxy = functions
  .region(config.LOCATION)
  .https.onCall(
    async (data: ApiProxyRequest, context: functions.https.CallableContext) => {
      try {
        // Enforce Firebase Auth if enabled
        if (config.ENFORCE_AUTH) {
          if (!context.auth) {
            throw new functions.https.HttpsError(
              "unauthenticated",
              "Request is unauthenticated."
            );
          }
        }
        // Enforce Firebase App Check if enabled
        if (config.ENFORCE_APP_CHECK) {
          enforceAppCheck(context);
        }

        const fetchOptions = await getFetchOptions(
          config,
          data,
          config.CONFIG_DOCUMENT_PATH
        );

        const apiUrl = config.API_URL;

        const apiResponse = await fetchFromApi(
          apiUrl,
          fetchOptions.httpMethod || "GET",
          fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
          fetchOptions.headers
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

function enforceAppCheck(context: functions.https.CallableContext): void {
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
