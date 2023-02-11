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

import Axios, { AxiosInstance } from "axios";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import config from "./config";
import * as logs from "./logs";
import Template from "./template";

enum ChangeType {
  CREATE,
  DELETE,
  UPDATE,
}

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
    if (config.templatePath) {
      this.template = new Template(admin.firestore().doc(config.templatePath));
    }
    this.apiUrl = apiURL;
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
    let metadata = snapshot.data().metadata;

    if (!metadata || !metadata.status) {
      await this.setMetaData(snapshot, { status: "unprocessed" });
      metadata = { status: "unprocessed" }
    }

    if (metadata && metadata.status === "unprocessed") {
      await this.setMetaData(snapshot, { status: "pending" });

      const body = this.extractBody(snapshot);
      const currentVersion = metadata?.currentVersion || 0;

      try {
        const response = await this.instance.post(this.apiUrl, body);

        const data = config.responseField ? response.data[config.responseField] : response.data;

        if (this.template) {
          const { data: transformedData, shouldUpdate } = await this.template.render({ data, currentVersion });

          if (shouldUpdate) {
            const { output, currentVersion } = transformedData;
            await this.updateDocument(snapshot, output);
            await this.setMetaData(snapshot, { currentVersion, status: "processed" });
          }
          return;
        }

        await this.updateDocument(snapshot, data);
        await this.setMetaData(snapshot, { status: "processed" });

        return;
      } catch (err) {
        logs.error(err);
      }
    }
  }

  protected async updateDocument(
    snapshot: admin.firestore.DocumentSnapshot,
    output: any
  ): Promise<void> {
    // Wrapping in transaction to allow for automatic retries (#48)
    await admin.firestore().runTransaction((transaction) => {
      transaction.update(snapshot.ref, this.outputFieldName, output);
      return Promise.resolve();
    });
    this.logs.updateDocumentComplete(snapshot.ref.path);
  }

  protected async setMetaData(
    snapshot: admin.firestore.DocumentSnapshot,
    metadata: any
  ): Promise<void> {
    // this.logs.updateDocument(snapshot.ref.path);
    // Wrapping in transaction to allow for automatic retries (#48)
    await admin.firestore().runTransaction((transaction) => {
      transaction.set(snapshot.ref, { metadata }, { merge: true });
      return Promise.resolve();
    });
    // this.logs.updateDocumentComplete(snapshot.ref.path);
  }
}
