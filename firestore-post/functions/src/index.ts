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

import * as functions from "firebase-functions";
import { Poster } from "./poster";
import config from "./config";

const poster = new Poster(
  config.inputFieldName,
  config.outputFieldName,
  config.bearerAccessToken,
  config.preset === "none" ? config.apiURL : config.preset
);

export const firestorePostRequest = functions.firestore
  .document(config.collectionPath)
  .onWrite(async (change) => {
    return poster.onDocumentWrite(change);
  });

export const firestorePostRequestBackfill = functions.tasks
  .taskQueue()
  .onDispatch(async (data: any) => {
    return poster.onDispatch(data);
  });
