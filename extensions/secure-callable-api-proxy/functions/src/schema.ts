import { z } from "zod";

export const ConfigSchema = z
  .object({
    API_URL: z
      .string()
      .url("Invalid URL format for API_URL.")
      .refine((url) => url.startsWith("https://"), {
        message: "API_URL must start with 'https://'."
      }),
    API_KEY_STRATEGY: z
      .enum(["header", "query"])
      .default("header")
      .describe("API_KEY_STRATEGY should be either 'header' or 'query'."),
    API_KEY_HEADER_OR_QUERY_PARAM: z
      .string()
      .optional()
      .describe("Name of the header or query parameter for the API key."),
    API_KEY: z
      .string()
      .optional()
      .describe("API_KEY is optional and can be empty."),
    ENFORCE_AUTH: z
      .enum(["yes", "no"])
      .default("yes")
      .describe("ENFORCE_AUTH should be either 'yes' or 'no'.")
      .transform((value) => value === "yes"),
    ENFORCE_APP_CHECK: z
      .enum(["yes", "no"])
      .default("no")
      .describe("ENFORCE_APP_CHECK should be either 'yes' or 'no'.")
      .transform((value) => value === "yes"),
    LOCATION: z
      .string()
      .default("us-central1")
      .describe("Cloud Functions location."),
    HTTP_HEADERS: z
      .string()
      .default("{}")
      .transform((str) => {
        try {
          const parsed = JSON.parse(str) as unknown;
          if (typeof parsed === "object" && parsed !== null) {
            return Object.entries(parsed).reduce<Record<string, string>>(
              (acc, [key, value]) => {
                if (typeof value === "string") {
                  acc[key] = value;
                } else {
                  throw new Error("All header values must be strings.");
                }
                return acc;
              },
              {}
            );
          }
          throw new Error("HTTP_HEADERS must be a valid JSON object.");
        } catch (e) {
          throw new Error("HTTP_HEADERS must be a valid JSON object.");
        }
      }),
    HTTP_BODY: z.string().optional(),
    HTTP_METHOD: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
      .default("GET"),
    CONFIG_DOCUMENT_PATH: z
      .string()
      .optional()
      .describe("Path to the Firestore document containing the configuration.")
  })
  .passthrough();

export type Config = z.infer<typeof ConfigSchema>;

export const ApiProxyRequestSchema = z
  .object({
    headers: z.record(z.string()).optional(),
    body: z
      .union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.any()),
        z.record(z.any()),
        z.null(),
        z.undefined()
      ])
      .optional(),
    httpMethod: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
      .optional()
  })
  .passthrough();

export type ApiProxyRequest = z.infer<typeof ApiProxyRequestSchema>;
