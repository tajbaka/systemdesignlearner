import type { ApiEndpoint } from "@/domains/practice/types";

type HttpMethod = ApiEndpoint["method"];

const normalizePathKey = (value: string) => value.trim().replace(/^\/+/, "");

const FALLBACK_PLACEHOLDER =
  "Describe the request/response format, validation, and any special behavior.";

const METHOD_PLACEHOLDERS: Record<HttpMethod, string> = {
  POST: "Request Body: { ... what fields? ... }\n\nResponse (2xx): { ... what data to return? ... }\nResponse (4xx): { ... error cases? ... }\n\nBehavior: What happens when this endpoint is called?",
  GET: "Query Params: What parameters are needed?\n\nResponse (2xx): What should be returned?\nResponse (4xx): What error cases could occur?\n\nBehavior: How should this endpoint behave? Any caching considerations?",
  PATCH:
    "Request Body: { ... what can be updated? ... }\n\nResponse (2xx): { ... what to return? ... }\nResponse (4xx): { ... error cases? ... }\n\nValidation: What rules and authorization?\nBehavior: What gets updated and how?",
  PUT: "Request Body: { ... complete resource representation ... }\n\nResponse (2xx): { ... what to return? ... }\nResponse (4xx): { ... error cases? ... }\n\nValidation: What rules and authorization?\nBehavior: How is the resource created or replaced?",
  DELETE:
    "Request Body: Typically none for DELETE\n\nResponse (2xx): What indicates success?\nResponse (4xx): What error cases?\n\nValidation: Authorization requirements?\nBehavior: What gets deleted? Any cleanup needed?",
};

const SPECIFIC_PLACEHOLDERS: Array<{
  method: HttpMethod;
  path: string;
  placeholder: string;
}> = [
  {
    method: "POST",
    path: "api/v1/urls",
    placeholder:
      "Request Body: { ... what fields are needed to create a short URL? ... }\n\nResponse (2xx): { ... what data should be returned to the client? ... }\nResponse (4xx): { ... what validation errors could occur? ... }\n\nBehavior: How is the shortened URL created and stored?",
  },
  {
    method: "GET",
    path: "{slug}",
    placeholder:
      "Request: Where does the slug come from? Query params or path?\n\nResponse (3xx): What happens on success?\nResponse (4xx): What if slug doesn't exist?\n\nBehavior: Where do you check for the slug? How do you handle the redirect?",
  },
];

export const getApiNotesPlaceholder = (method: HttpMethod, rawPath: string): string => {
  const normalizedPath = normalizePathKey(rawPath);
  const special = SPECIFIC_PLACEHOLDERS.find(
    (entry) => entry.method === method && normalizePathKey(entry.path) === normalizedPath
  );

  if (special) {
    return special.placeholder;
  }

  return METHOD_PLACEHOLDERS[method] ?? FALLBACK_PLACEHOLDER;
};
