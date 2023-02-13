# Firestore Post Request

**Author**: Jacob Cable - [github.com/cabljac](https://github.com/cabljac)

**Description**: Post data written to firestore to a specified API, transform the response and write it back to firestore



**Details**: Use this extension to hit an API with a post request, using data written to firestore as the body.

This extension listens to your specified Cloud Firestore collection. If you add data to a specified field in any document within that collection, this extension:

- Makes a post request to a specified URL, using the data as the body of the request.
- Uses (either a preset or user-specified) handlebar template to transform the response.
- Adds the transformed response to a separate specified field in the same document.

Currently the extension supports authentication through a Bearer token, which you can provide as a secret upon installation.

If the original non-processed field of the document is updated, then the output will be automatically updated as well.

#### Custom templates


#### Versioning templates and update strategy

(to be added)

#### Billing
To install an extension, your project must be on the [Blaze (pay as you go) plan](https://firebase.google.com/pricing)

- You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).
- This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service’s no-cost tier:
  - Cloud Firestore
  - Cloud Functions (Node.js 10+ runtime. [See FAQs](https://firebase.google.com/support/faq#extensions-pricing))


**Configuration Parameters:**




**Cloud Functions:**

* **firestorePostRequest:** Listens for writes of input to your specified Cloud Firestore collection, posts to an API specified in your params, then writes the result back to the same document, possibly transforming via handlebar templates.

* **firestorePostRequestBackfill:** Searches your specified Cloud Firestore collection for existing unprocessed documents or documents with an older template version, processes the input field data, then writes the processed strings back to the same document.



**APIs Used**:

(see presets for a list, but the API can be developer-specified)



**Access Required**:



This extension will operate with the following project IAM roles:

* datastore.user (Reason: Allows the extension to write translated strings to Cloud Firestore.)
