import { z } from "zod";

const ConfigSchema = z
  .object({
    API_URL: z
      .string()
      .url("Invalid URL format for API_URL.")
      .refine((url) => url.startsWith("https://"), {
        message: "API_URL must start with 'https://'."
      }),
    API_KEY: z.string().nonempty("API_KEY is required and cannot be empty."),
    ENFORCE_APP_CHECK: z
      .enum(["yes", "no"])
      .default("no")
      .describe("ENFORCE_APP_CHECK should be either 'yes' or 'no'."),
    LOCATION: z.string().default("us-central1")
  })
  .passthrough();

// Parse and validate environment variables
export const config = ConfigSchema.parse(process.env);
