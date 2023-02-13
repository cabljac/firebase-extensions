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

import * as admin from "firebase-admin";
import * as Mustache from "mustache";
import presets from "./presets";

interface TemplateData {
  template: object;
  version: number;
}

export default class Template {
  document?: admin.firestore.DocumentReference;
  private templateData: TemplateData;
  private ready: boolean;
  private waits: (() => void)[];
  public version: number;

  constructor({ document, preset }: { document?: admin.firestore.DocumentReference, preset?: string }) {
    if (preset) {
      this.templateData = {
        template: presets[preset].template,
        version: 0,
      };
      this.version = 0;
      this.ready = true;
      this.waits = [];
      return;
    } else if (document) {
      this.document = document;
      this.document.onSnapshot(this.updateTemplates.bind(this));
      this.ready = false;
      this.waits = [];
    } else {
      throw new Error("No template source provided");
    }
  }

  waitUntilReady(): Promise<void> {
    if (this.ready) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.waits.push(resolve);
    });
  }

  private updateTemplates(
    snap: admin.firestore.DocumentSnapshot<TemplateData>
  ) {
    const data = snap.data();

    this.templateData = data;
    this.version = data.version;

    this.ready = true;
    this.waits.forEach((wait) => wait());
  }

  checkTemplateExists = async () => {
    const snap = await this.document.get();
    return snap.data().exists;
  };

  async render({
    data,
  }: {
    data: any;
    currentVersion?: number;
  }): Promise<any> {
    await this.waitUntilReady();

    if (!this.templateData) {
      //fallback, check if template does exist, results may be cached
      // checkingMissingTemplate(name);
      const templateExists = this.checkTemplateExists();

      if (!templateExists)
        return Promise.reject(
          new Error(`Tried to render non-existent template`)
        );
    }

    const template = this.templateData.template;
    const version = this.templateData.version;

    return {
      data: {
        output: JSON.parse(Mustache.render(JSON.stringify(template), data)),
        currentVersion: version,
      }
    };
  }
}