export async function fetchFromApi(
  url: string,
  method: string,
  headers: Record<string, string> = {},
  apiKeyStrategy?: "header" | "query",
  apiKeyHeaderOrQueryParam?: string,
  apiKey?: string,
  body?: string | Record<string, unknown> | null
): Promise<unknown> {
  // Initialize the headers object
  const finalHeaders: Record<string, string> = { ...headers };

  // Handle API key according to the strategy
  if (apiKey && apiKeyHeaderOrQueryParam) {
    if (apiKeyStrategy === "header") {
      finalHeaders[apiKeyHeaderOrQueryParam] = apiKey;
    } else if (apiKeyStrategy === "query") {
      // Append the API key as a query parameter
      const urlObj = new URL(url);
      urlObj.searchParams.append(apiKeyHeaderOrQueryParam, apiKey);
      url = urlObj.toString();
    }
  }

  // Initialize the request object
  const request: RequestInit = {
    method: method.toUpperCase(),
    headers: finalHeaders
  };

  // If a body is provided, handle it accordingly
  if (body !== undefined && body !== null) {
    // If Content-Type is not set, default to JSON
    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }

    // Stringify the body for JSON payloads
    request.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  // Perform the API request
  const response = await fetch(url, request);

  // Handle errors
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  // Return the response as JSON
  return response.json();
}
