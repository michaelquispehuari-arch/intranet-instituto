export async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: unknown };

    if (typeof data.message === "string" && data.message.trim().length > 0) {
      return data.message;
    }
  } catch {
    // Some failures, like redirects or proxy errors, may not include JSON.
  }

  return fallback;
}
