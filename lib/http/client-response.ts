export class ApiResponseError extends Error {
  status: number;
  payload: { requiresAuth?: boolean; requiresUpgrade?: boolean };

  constructor(message: string, status: number, payload: { requiresAuth?: boolean; requiresUpgrade?: boolean } = {}) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.payload = payload;
  }
}

export async function readApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  let payload: unknown = null;
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    await response.text().catch(() => "");
  }

  if (!response.ok) {
    const details = isErrorPayload(payload) ? payload : {};
    const message = response.status === 413
      ? "That upload is too large for the server. Please choose an image under 10MB and try again."
      : details.error ?? fallbackMessage;
    throw new ApiResponseError(message, response.status, details);
  }
  if (!contentType.includes("application/json") || payload === null) throw new ApiResponseError(fallbackMessage, response.status);
  return payload as T;
}

function isErrorPayload(value: unknown): value is { error?: string; requiresAuth?: boolean; requiresUpgrade?: boolean } {
  return typeof value === "object" && value !== null && (!("error" in value) || typeof value.error === "string");
}
