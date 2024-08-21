import { firestore } from "firebase-admin";
import { ApiProxyRequest, ApiProxyRequestSchema, Config } from "./schema";

export async function getFetchOptions(
  config: Config,
  data: unknown,
  configDocPath?: string
): Promise<ApiProxyRequest> {
  const configData = {
    headers: config.HTTP_HEADERS,
    body: config.HTTP_BODY,
    httpMethod: config.HTTP_METHOD
  };

  const callData = ApiProxyRequestSchema.parse(data);

  const firestoreData = configDocPath
    ? await getFirestoreData(configDocPath)
    : {};

  return mergeObjectsByPriority<ApiProxyRequest>([
    callData,
    firestoreData,
    configData
  ]);
}

async function getFirestoreData(
  configDocPath: string
): Promise<ApiProxyRequest> {
  let firestoreData: ApiProxyRequest = {};

  const docSnapshot = await firestore().doc(configDocPath).get();

  if (docSnapshot.exists) {
    const parsedFirestoreData = ApiProxyRequestSchema.safeParse(
      docSnapshot.data()
    );
    if (parsedFirestoreData.success) {
      firestoreData = parsedFirestoreData.data;
    } else {
      console.warn("Invalid Firestore configuration data. Using defaults.");
    }
  } else {
    console.warn("Configuration document not found. Using defaults.");
  }

  return firestoreData;
}

function mergeObjectsByPriority<T extends Record<string, unknown>>(
  objects: T[]
): T {
  return objects.reduce((acc, obj) => {
    return { ...obj, ...acc };
  }, {} as T);
}
