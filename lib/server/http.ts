import "server-only";

export class UpstreamApiError extends Error {
  status: number;

  constructor(status: number, message = "Upstream request failed") {
    super(message);
    this.name = "UpstreamApiError";
    this.status = status;
  }
}

export async function postJsonToUpstream<TPayload>(
  url: string,
  payload: TPayload,
  options: {
    bearerToken: string;
    timeoutMs: number;
  }
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${options.bearerToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new UpstreamApiError(response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamApiError(504, "Upstream request timed out");
    }

    if (error instanceof UpstreamApiError) {
      throw error;
    }

    throw new UpstreamApiError(502, "Could not reach upstream API");
  } finally {
    clearTimeout(timeoutId);
  }
}
