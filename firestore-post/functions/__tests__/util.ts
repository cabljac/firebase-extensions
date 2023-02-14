import * as admin from "firebase-admin";

export const waitForDocField = async (
  firestore: admin.firestore.Firestore,
  filePath: string,
  fieldName: string,
  timeout: number = 1000,
  maxAttempts: number = 20
) => {
  let exists: [boolean];

  const promise = new Promise((resolve, reject) => {
    let timesRun = 0;
    const interval = setInterval(async () => {
      timesRun += 1;
      try {
        const snap = await firestore.doc(filePath).get();

        const data = snap.data();

        if (data && data[fieldName]) {
          exists = [true];
        }
      } catch (e) {}
      if (exists && exists[0]) {
        clearInterval(interval);
        resolve(exists[0]);
      }
      if (timesRun > maxAttempts) {
        clearInterval(interval);
        reject("timed out without finding file " + filePath);
      }
    }, timeout);
  });

  return await promise;
};
