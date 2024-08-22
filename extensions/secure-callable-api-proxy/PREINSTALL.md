
# Secure API Proxy Extension

## Overview

The Secure API Proxy extension deploys a secure backend callable function to Firebase, which acts as a proxy to your specified API endpoint. This helps protect your API key and prevents resource abuse by optionally enforcing Firebase App Check and Firebase Authentication.

## Features

- Securely proxy API requests to your target API endpoint.
- Optionally enforce Firebase App Check to ensure that only authorized apps can make requests.
- Optionally enforce Firebase Authentication to ensure that only authenticated users can make requests.

## Billing

This extension requires a paid-tier Firebase project. The functions deployed by this extension may incur charges, especially if they handle a significant volume of requests. Review your project's billing details before proceeding.

## Configuration Parameters

The extension requires the following configuration parameters:

- **Cloud Functions Location (`LOCATION`)**: The region where you want to deploy the Cloud Functions created by this extension. For more information, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).
  
- **Target API URL (`API_URL`)**: The base URL of the API that the extension will proxy requests to.

- **API Key (`API_KEY`)**: The API key used when making requests to the target API. This key is stored securely using Firebase's Secret Manager.

- **Enforce Authentication (`ENFORCE_AUTH`)**: Specifies whether Firebase Authentication should be enforced for function calls. The default value is "Yes."

- **Enforce App Check (`ENFORCE_APP_CHECK`)**: Specifies whether App Check should be enforced for function calls to ensure that only authorized apps can make requests. The default value is "No."

## Advanced usage: Config Document Path

The optional parameter `Config Document Path` specifies the path to a Firestore document that contains configuration settings for the API proxy. The configuration document allows you to dynamically define the request structure and behavior for the proxy without reconfiguring the extension.

The document should follow a specific schema where the headers field can be a map of key-value pairs representing HTTP headers, the body field can contain any valid JSON data type (string, number, boolean, array, object, null, or undefined), and the httpMethod field should be one of the supported HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, or OPTIONS. This configuration enables flexible and fine-tuned control over how the proxy handles requests to your target API. Ensure that your Firestore document adheres to this structure to avoid runtime errors.


```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

async function addConfigDocument() {
  // Define the configuration document data
  const configData = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY',
    },
    body: {
      key1: 'value1',
      key2: 123,
      key3: true,
      nestedObject: {
        nestedKey: 'nestedValue',
      },
      arrayField: [1, 2, 3, 'four'],
    },
    httpMethod: 'POST',
  };

  // Path to the Firestore document
  const documentPath = 'configs/apiProxyConfig';

  // Add the document to Firestore
  await db.doc(documentPath).set(configData);

  console.log(`Config document added to Firestore at path: ${documentPath}`);
}

// Call the function to add the document
addConfigDocument().catch(console.error);
```

## Additional Setup

To use this extension, you may need to:

1. **Set Up Firebase App Check** (if enforced): Follow the [Firebase App Check documentation](https://firebase.google.com/docs/app-check) to configure App Check for your project.
  
2. **Set Up Firebase Authentication** (if enforced): Follow the [Firebase Authentication documentation](https://firebase.google.com/docs/auth) to configure Firebase Authentication for your project.

## Resources Created

This extension will create the following resources in your Firebase project:

- **Cloud Functions**: A callable function that proxies requests to your specified API endpoint.

## Further Reading

For more detailed information about this extension and its functionality, visit the [GitHub repository](https://github.com/cabljac/firebase-extensions/tree/main/extensions/secure-callable-api-proxy).
