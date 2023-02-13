import * as admin from "firebase-admin";
import { config } from "dotenv";
import * as path from "path";
import * as axios from "axios";
import { waitForDocField } from "./util";
// import { waitForDoc } from "./util";

const envLocalPath = path.resolve(
  __dirname,
  "../../_emulator/extensions/firestore-post.env.local"
);

config({ path: envLocalPath, debug: true, override: true });

let firestore: admin.firestore.Firestore;

process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_FIRESTORE_EMULATOR_ADDRESS = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
process.env.PUBSUB_EMULATOR_HOST = "localhost:8085";
process.env.GOOGLE_CLOUD_PROJECT = "demo-test";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

describe("test123", () => {
  beforeAll(async () => {
    //     // if there is no app, initialize one
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: "firestore-post-test",
        storageBucket: "firestore-post-test.appspot.com",
      });
    }
    firestore = admin.firestore();
  });
  afterAll(async () => {
    // clear all data from firestore
    await axios.default.delete(
      `http://localhost:8080/emulator/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/databases/(default)/documents`
    );
  });

  test("should process doc", async () => {
    const col = firestore.collection("example");
    const templateDoc = firestore.doc("templates/1");
    const docRef = firestore.doc("example/testststs");

    templateDoc.set({
      version: 1,
      template: {
        templateFoo: "{{json.foo}}",
      },
    });

    await waitForDocField(firestore, "templates/1", "version");

    const doc = await col.add({ input: { foo: "bar" } });

    await waitForDocField(firestore, `example/${doc.id}`, "output");

    const data = (await doc.get()).data();

    expect(data).toEqual({
      input: { foo: "bar" },
      output: { templateFoo: "bar" },
      currentVersion: 1,
    });
    // wait for file to be uploaded to storage:
  }, 12000);
});
