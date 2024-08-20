import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { fetchFromApi } from "./fetchFromApi";

// Define the type for the mock fetch function
type MockFetch = jest.Mock<() => Promise<Response>>;

// Mock fetch globally to control its behavior in tests
global.fetch = jest.fn() as MockFetch;

const API_KEY = "test-api-key";
const API_URL = "https://api.example.com";

process.env["API_KEY"] = API_KEY;
process.env["API_URL"] = API_URL;
process.env["ENFORCE_APP_CHECK"] = "no";

describe("fetchFromApi", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const createMockResponse = (data: unknown, status = 200): Response => {
    return {
      ok: status >= 200 && status < 300,
      status: status,
      statusText: status === 200 ? "OK" : "Error",
      json: async () => Promise.resolve(data),
      text: async () => Promise.resolve(JSON.stringify(data)),
      headers: new Headers(),
      redirected: false,
      type: "basic",
      url: "",
      clone: () => createMockResponse(data, status),
      body: null,
      bodyUsed: false
    } as Response;
  };

  it("should make a GET request without a body", async () => {
    const headers = { "Custom-Header": "CustomValue" };

    // Mock the fetch implementation
    (fetch as MockFetch).mockResolvedValue(
      createMockResponse({ message: "success" })
    );

    const response = await fetchFromApi(API_URL, "GET", API_KEY, headers);

    expect(fetch).toHaveBeenCalledWith(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...headers
      }
    });

    expect(response).toEqual({ message: "success" });
  });

  it("should make a POST request with a JSON body", async () => {
    const headers = {};
    const body = { key: "value" };

    (fetch as MockFetch).mockResolvedValue(
      createMockResponse({ message: "success" })
    );

    const response = await fetchFromApi(
      API_URL,
      "POST",
      API_KEY,
      headers,
      body
    );

    expect(fetch).toHaveBeenCalledWith(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    expect(response).toEqual({ message: "success" });
  });

  it("should make a POST request with a string body", async () => {
    const headers = { "Content-Type": "text/plain" };
    const body = "some string data";

    (fetch as MockFetch).mockResolvedValue(
      createMockResponse({ message: "success" })
    );

    const response = await fetchFromApi(
      API_URL,
      "POST",
      API_KEY,
      headers,
      body
    );

    expect(fetch).toHaveBeenCalledWith(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...headers
      },
      body: body
    });

    expect(response).toEqual({ message: "success" });
  });

  it("should throw an error if the response is not ok", async () => {
    (fetch as MockFetch).mockResolvedValue(
      createMockResponse({ error: "Internal Server Error" }, 500)
    );

    await expect(fetchFromApi(API_URL, "GET", API_KEY, {})).rejects.toThrow(
      "API request failed with status 500"
    );

    expect(fetch).toHaveBeenCalledWith(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`
      }
    });
  });

  it("should set Content-Type to application/json by default if a body is provided", async () => {
    const headers = {};
    const body = { key: "value" };

    (fetch as MockFetch).mockResolvedValue(
      createMockResponse({ message: "success" })
    );

    const response = await fetchFromApi(
      API_URL,
      "POST",
      API_KEY,
      headers,
      body
    );

    expect(fetch).toHaveBeenCalledWith(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    expect(response).toEqual({ message: "success" });
  });

  it("should not overwrite Content-Type if it's already set in headers", async () => {
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const body = "key=value";

    (fetch as MockFetch).mockResolvedValue(
      createMockResponse({ message: "success" })
    );

    const response = await fetchFromApi(
      API_URL,
      "POST",
      API_KEY,
      headers,
      body
    );

    expect(fetch).toHaveBeenCalledWith(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...headers
      },
      body: body
    });

    expect(response).toEqual({ message: "success" });
  });
});
