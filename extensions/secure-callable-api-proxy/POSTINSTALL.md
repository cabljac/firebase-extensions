
# Secure API Proxy Extension

## Congratulations on Installing the Secure API Proxy Extension!

You have successfully installed the Secure API Proxy extension. This extension helps you securely proxy API requests to your specified API endpoint, protecting your API key and preventing resource abuse.

## How to Use This Extension

### Making Requests

You can now make requests to the deployed callable Cloud Function, which will securely proxy these requests to your target API.

Here’s how to call the function from your app:

```javascript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const callApiProxy = httpsCallable(functions, 'apiproxy');

callApiProxy({ 
  endpoint: 'your-endpoint-path', 
  method: 'GET or POST', 
  body: { key: 'value' } 
})
.then((result) => {
  console.log(result.data);
})
.catch((error) => {
  console.error("Error calling API Proxy:", error);
});
```

### Parameters

- `endpoint`: The relative path to the API endpoint (required).
- `method`: The HTTP method to use for the request, e.g., GET, POST (required).
- `body`: The body of the request, if applicable (optional).

### Response Handling

The response from your target API will be returned directly to your app. Handle the response or errors as needed in your application.

## Monitoring and Debugging

### Logs

You can monitor the logs for the Cloud Function in the Firebase console under the "Functions" section. This can be helpful for debugging issues or monitoring the requests being proxied.

### Firebase Authentication and App Check

If you enabled Firebase Authentication and/or App Check enforcement, make sure that your requests are authenticated and/or validated as required. Unauthorized requests will be rejected with an appropriate error message.

## Advanced usage: Config Document Path

The optional parameter `Config Document Path` specifies the path to a Firestore document that contains configuration settings for the API proxy. The configuration document allows you to dynamically define the request structure and behavior for the proxy without reconfiguring the extension.

The document should follow a specific schema where the headers field can be a map of key-value pairs representing HTTP headers, the body field can contain any valid JSON data type (string, number, boolean, array, object, null, or undefined), and the httpMethod field should be one of the supported HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, or OPTIONS. This configuration enables flexible and fine-tuned control over how the proxy handles requests to your target API. Ensure that your Firestore document adheres to this structure to avoid runtime errors.

## Updates and Uninstallation

### Updating the Extension

To update the extension to the latest version, visit the Firebase console's "Extensions" section and check for available updates. Follow the prompts to update.

### Uninstalling the Extension

If you need to uninstall the extension, go to the Firebase console, navigate to the "Extensions" section, and select "Uninstall" for this extension. Note that this will remove all resources created by the extension.

## Getting Support

If you encounter any issues or have questions, please refer to the [GitHub repository](https://github.com/cabljac/firebase-extensions/tree/main/extensions/secure-callable-api-proxy) for documentation and support.
