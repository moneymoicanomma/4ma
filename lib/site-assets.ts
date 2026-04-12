const defaultSiteAssetBaseUrl = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";

function resolveBaseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return new URL(`https://${value}`);
  }
}

function normalizeBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return defaultSiteAssetBaseUrl;
  }

  try {
    return resolveBaseUrl(trimmed).toString().replace(/\/+$/, "");
  } catch {
    return defaultSiteAssetBaseUrl;
  }
}

function encodeAssetPath(fileName: string) {
  return fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export const siteAssetBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_ASSET_BASE_URL);
export const fallbackSiteAssetBaseUrl = defaultSiteAssetBaseUrl;

export function siteAsset(fileName: string) {
  return `${siteAssetBaseUrl}/${encodeAssetPath(fileName)}`;
}

export function fallbackSiteAsset(fileName: string) {
  return `${fallbackSiteAssetBaseUrl}/${encodeAssetPath(fileName)}`;
}

export function getSiteAssetRemotePatterns() {
  const seen = new Set<string>();

  return [defaultSiteAssetBaseUrl, siteAssetBaseUrl]
    .map((baseUrl) => {
      const url = resolveBaseUrl(baseUrl);
      const pathname = url.pathname.replace(/\/+$/, "");
      const protocol = url.protocol.replace(":", "");
      const key = `${protocol}//${url.hostname}:${url.port}${pathname}`;

      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      return {
        protocol: protocol as "http" | "https",
        hostname: url.hostname,
        port: url.port,
        pathname: pathname ? `${pathname}/**` : "/**"
      };
    })
    .filter((pattern): pattern is NonNullable<typeof pattern> => Boolean(pattern));
}
