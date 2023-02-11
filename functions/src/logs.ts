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

import { logger } from "firebase-functions";
import config from "./config";

const obfuscatedConfig = {
  ...config,
  bearerAccessToken: "********",
};

export const complete = () => {
  logger.log("Completed execution of extension");
};

export const error = (err: Error) => {
  logger.error("Error when processing doc", err);
};

export const fieldNamesNotDifferent = () => {
  logger.error(
    "The `input` and `output` field names must be different for this extension to function correctly"
  );
};

export const init = () => {
  logger.log("Initializing extension with configuration", obfuscatedConfig);
};

export const start = () => {
  logger.log(
    "Started execution of extension with configuration",
    obfuscatedConfig
  );
};

export const updateDocument = (path: string) => {
  logger.log(`Updating Cloud Firestore document: '${path}'`);
};

export const updateDocumentComplete = (path: string) => {
  logger.log(`Finished updating Cloud Firestore document: '${path}'`);
};
