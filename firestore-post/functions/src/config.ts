/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export default {
  bearerAccessToken: process.env.BEARER_ACCESS_TOKEN,
  collectionPath: process.env.COLLECTION_PATH,
  location: process.env.LOCATION,
  outputFieldName: process.env.OUTPUT_FIELD_NAME || "output",
  inputFieldName: process.env.INPUT_FIELD_NAME || "input",
  apiURL: process.env.API_URL,
  templatePath: process.env.TEMPLATE_PATH,
  responseField: process.env.RESPONSE_FIELD,
  updatedTemplateStrategy: process.env.UPDATED_TEMPLATE_STRATEGY,
  preset: process.env.PRESET_NAME,
  doBackfill: process.env.DO_BACKFILL,
};
