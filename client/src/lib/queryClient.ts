import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_REQUEST_TIMEOUT_MS = 10_000;
const STARTUP_RETRY_DELAYS_MS = [500, 1000, 1500, 2000, 2000, 2000] as const;

async function fetchOnceWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Le serveur met trop de temps à répondre. Réessaie dans quelques instants.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  let response = await fetchOnceWithTimeout(input, init);

  for (const fallbackDelay of STARTUP_RETRY_DELAYS_MS) {
    if (response.status !== 503) {
      break;
    }

    const body = await response
      .clone()
      .json()
      .catch(() => null) as { status?: string } | null;
    if (body?.status !== "starting") {
      break;
    }

    const retryAfterSeconds = Number(response.headers.get("Retry-After"));
    const delay =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.min(retryAfterSeconds * 1000, 3000)
        : fallbackDelay;
    await new Promise((resolve) => setTimeout(resolve, delay));
    response = await fetchOnceWithTimeout(input, init);
  }

  return response;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let message = res.statusText;

    if (
      res.headers.get("content-type")?.includes("text/html") ||
      /^\s*<!doctype html|^\s*<html\b/i.test(text)
    ) {
      message = "Le serveur a renvoyé une page d’erreur. Réessaie dans quelques instants.";
    } else {
      try {
        const json = JSON.parse(text);
        message = json.message || json.error || res.statusText;
      } catch {
        message = text || res.statusText;
      }
    }

    throw new Error(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetchWithTimeout(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetchWithTimeout(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
