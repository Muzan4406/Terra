const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"]);

export function getTelegramUrl(value?: string | null): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !TELEGRAM_HOSTS.has(url.hostname.toLowerCase())) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}