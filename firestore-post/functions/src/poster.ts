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
import { getExtensions } from "firebase-admin/extensions";
import Axios, { AxiosInstance } from "axios";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import config from "./config";
import * as logs from "./logs";
import Template from "./template";
import { getFunctions } from "firebase-admin/functions";
import presets from "./presets";

enum ChangeType {
  CREATE,
  DELETE,
  UPDATE,
}

const DOCS_PER_BACKFILL = 250;

export class Poster {
  protected logs = logs;
  protected template: Template | undefined;
  private instance: AxiosInstance;
  private apiUrl: string;

  constructor(
    protected inputFieldName: string,
    protected outputFieldName: string,
    bearerAccessToken: string,
    apiURL: string
  ) {
    this.inputFieldName = inputFieldName;
    this.outputFieldName = outputFieldName;
    // Initialize the Firebase Admin SDK
    admin.initializeApp();

    this.apiUrl = apiURL;


    if (config.preset !== "none") {
      this.template = new Template({ preset: config.preset });
      this.apiUrl = presets[config.preset].url;
    } else if (config.templatePath) {
      this.template = new Template({
        document: admin.firestore().doc(config.templatePath),
      });
    }

    this.instance = Axios.create({
      headers: {
        Authorization: `Bearer ${bearerAccessToken}`,
        "Content-Type": "application/json",
      },
    });

    logs.init();
  }

  public async onDocumentWrite(
    change: functions.Change<admin.firestore.DocumentSnapshot>
  ) {
    this.logs.start();

    if (this.inputFieldName === this.outputFieldName) {
      this.logs.fieldNamesNotDifferent();
      return;
    }

    const changeType = this.getChangeType(change);

    switch (changeType) {
      case ChangeType.CREATE:
        await this.handleCreateDocument(change.after);
        break;
      case ChangeType.DELETE:
        this.handleDeleteDocument();
        break;
      case ChangeType.UPDATE:
        await this.handleUpdateDocument(change.before, change.after);
        break;
      default: {
        throw new Error(`Invalid change type: ${changeType}`);
      }
    }

    this.logs.complete();
  }

  public async onDispatch(data: any) {
    const runtime = getExtensions().runtime();
    if (!config.doBackfill) {
      await runtime.setProcessingState(
        "PROCESSING_COMPLETE",
        'Existing documents were not processed because "Process existing documents?" is configured to false. ' +
        "If you want to fill in missing translations, reconfigure this instance."
      );
      return;
    }

    const offset = (data["offset"] as number) ?? 0;
    const pastSuccessCount = (data["successCount"] as number) ?? 0;
    const pastErrorCount = (data["errorCount"] as number) ?? 0;
    // We also track the start time of the first invocation, so that we can report the full length at the end.
    const startTime = (data["startTime"] as number) ?? Date.now();

    const snapshot = await admin
      .firestore()
      .collection(process.env.COLLECTION_PATH)
      .offset(offset)
      .limit(DOCS_PER_BACKFILL)
      .get();

    // Since we will be writing many docs to Firestore, use a BulkWriter for better performance.
    const writer = admin.firestore().bulkWriter();

    const processedDocs = await Promise.allSettled(
      snapshot.docs.map((snapshot) => {
        return this.handleExistingDocument(snapshot, writer);
      })
    );

    await writer.close();
    const newSucessCount =
      pastSuccessCount +
      processedDocs.filter((p) => p.status === "fulfilled").length;
    const newErrorCount =
      pastErrorCount +
      processedDocs.filter((p) => p.status === "rejected").length;

    if (snapshot.size == DOCS_PER_BACKFILL) {
      // Stil have more documents to translate, enqueue another task.
      // logs.enqueueNext(offset + DOCS_PER_BACKFILL);
      const queue = getFunctions().taskQueue(
        "firestorePostRequestBackfill",
        process.env.EXT_INSTANCE_ID
      );
      await queue.enqueue({
        offset: offset + DOCS_PER_BACKFILL,
        successCount: newSucessCount,
        errorCount: newErrorCount,
        startTime: startTime,
      });
    } else {
      // No more documents to translate, time to set the processing state.
      // logs.backfillComplete(newSucessCount, newErrorCount);
      if (newErrorCount == 0) {
        return await runtime.setProcessingState(
          "PROCESSING_COMPLETE",
          `Successfully processed ${newSucessCount} documents in ${Date.now() - startTime
          }ms.`
        );
      } else if (newErrorCount > 0 && newSucessCount > 0) {
        return await runtime.setProcessingState(
          "PROCESSING_WARNING",
          `Successfully processed ${newSucessCount} documents, ${newErrorCount} errors in ${Date.now() - startTime
          }ms. See function logs for specific error messages.`
        );
      }
      return await runtime.setProcessingState(
        "PROCESSING_FAILED",
        `Successfully processed ${newSucessCount} documents, ${newErrorCount} errors in ${Date.now() - startTime
        }ms. See function logs for specific error messages.`
      );
    }
  }

  protected extractBody(snapshot: admin.firestore.DocumentSnapshot) {
    return snapshot.get(this.inputFieldName);
  }

  private getChangeType(
    change: functions.Change<admin.firestore.DocumentSnapshot>
  ) {
    if (!change.after.exists) {
      return ChangeType.DELETE;
    }
    if (!change.before.exists) {
      return ChangeType.CREATE;
    }
    return ChangeType.UPDATE;
  }

  private async handleExistingDocument(
    snapshot: admin.firestore.DocumentSnapshot,
    writer: admin.firestore.BulkWriter
  ) {
    const body = this.extractBody(snapshot);
    if (body) {
      let output = snapshot.data().output;

      let shouldProcess = !output;

      if (this.template) {
        await this.template?.waitUntilReady();

        const templateVersion = this.template.version;
        const currentVersion = snapshot.data().currentVersion;

        shouldProcess = shouldUpdate(templateVersion, currentVersion);
      }

      if (shouldProcess) {
        const body = this.extractBody(snapshot);
        try {
          const response = await this.instance.post(this.apiUrl, body);

          const data = config.responseField
            ? response.data[config.responseField]
            : response.data;

          if (this.template) {
            const { data: transformedData } = await this.template.render({
              data,
            });
            // await this.updateDocument(snapshot, transformedData);

            await writer.update(
              snapshot.ref,
              config.outputFieldName,
              transformedData
            );
            await writer.update(
              snapshot.ref,
              "currentVersion",
              data.currentVersion
            );
            return;
          }

          await writer.update(snapshot.ref, config.outputFieldName, data);

          // transaction.update(snapshot.ref, "currentVersion", data.currentVersion);
          // await this.updateDocument(snapshot, data);
          return;
        } catch (err) {
          logs.error(err);
        }
      }
    }
  }

  private async handleCreateDocument(
    snapshot: admin.firestore.DocumentSnapshot
  ) {
    const body = this.extractBody(snapshot);
    if (body) {
      // this.logs.documentCreatedWithUrl();
      await this.processSnapshot(snapshot);
    } else {
      // this.logs.documentCreatedNoUrl();
    }
  }

  private handleDeleteDocument() {
    // this.logs.documentDeleted();
  }

  private async handleUpdateDocument(
    before: admin.firestore.DocumentSnapshot,
    after: admin.firestore.DocumentSnapshot
  ) {
    const bodyAfter = this.extractBody(after);
    const bodyBefore = this.extractBody(before);

    if (bodyAfter === bodyBefore) {
      // this.logs.documentUpdatedUnchangedUrl();
    } else if (bodyAfter) {
      // this.logs.documentUpdatedChangedUrl();
      await this.processSnapshot(after);
    } else if (bodyBefore) {
      // this.logs.documentUpdatedDeletedUrl();
      await this.updateDocument(after, admin.firestore.FieldValue.delete());
    } else {
      // this.logs.documentUpdatedNoUrl();
    }
  }

  protected async processSnapshot(
    snapshot: admin.firestore.DocumentSnapshot
  ): Promise<void> {
    let output = snapshot.data().output;

    let shouldProcess = !output;

    if (this.template) {
      await this.template?.waitUntilReady();

      const templateVersion = this.template.version;
      const currentVersion = snapshot.data().currentVersion;

      shouldProcess = shouldUpdate(templateVersion, currentVersion);
    }
    console.log('test', shouldProcess)
    if (shouldProcess) {
      const body = this.extractBody(snapshot);
      try {
        const response = await this.instance.post(this.apiUrl, body);

        const data = config.responseField
          ? response.data[config.responseField]
          : response.data;

        console.log('DATA>>>', data)

        if (this.template) {
          const { data: transformedData } = await this.template.render({
            data,
          });
          await this.updateDocument(snapshot, transformedData);
          return;
        }

        await this.updateDocument(snapshot, data);
        return;
      } catch (err) {
        logs.error(err);
      }
    }
  }

  protected async updateDocument(
    snapshot: admin.firestore.DocumentSnapshot,
    data: any
  ): Promise<void> {
    // Wrapping in transaction to allow for automatic retries (#48)
    await admin.firestore().runTransaction((transaction) => {
      transaction.update(snapshot.ref, this.outputFieldName, data.output);
      if (data.currentVersion) {
        transaction.update(snapshot.ref, "currentVersion", data.currentVersion);
      }
      return Promise.resolve();
    });
    this.logs.updateDocumentComplete(snapshot.ref.path);
  }
}

function shouldUpdate(templateVersion: number, docVersion: number) {
  switch (config.updatedTemplateStrategy) {
    case "always":
      return true;
    case "never":
      return false;
    case "ifNewer":
      return templateVersion > docVersion;
    default:
      return false;
  }
}
