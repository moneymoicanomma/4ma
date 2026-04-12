const defaultSiteAssetBaseUrl = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";
const publicLandingAssetBasePath = "/assets/landing";
const publicLandingAssetRevision = "20260412";

const intrinsicSiteAssetDimensions = {
  "logo money moicano mma.svg": { width: 283, height: 218 },
  "logo money moicano mma extenso.svg": { width: 694, height: 68 },
  "Video-Game-Logo-Streamplay--Streamline-Ultimate.svg": { width: 32, height: 32 },
  "Fists-Crashing-Conflict--Streamline-Ultimate.svg": { width: 32, height: 32 },
  "Microphone-Podcast-2--Streamline-Ultimate.svg": { width: 32, height: 32 },
  "Stadium-Classic-2--Streamline-Ultimate.svg": { width: 32, height: 32 },
  "cornerman.svg": { width: 24, height: 21 },
  "cornerman - slogan.svg": { width: 959, height: 193 },
  "joyagear.svg": { width: 59, height: 41 },
  "instagram_logo.svg": { width: 23, height: 23 },
  "youtube_logo.svg": { width: 30, height: 21 },
  "x_logo.svg.svg": { width: 23, height: 21 },
  "cabmma.svg": { width: 220, height: 58 }
} as const;

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

function normalizeAssetFileName(assetPath: string) {
  try {
    const url = new URL(assetPath, "https://assets.local");
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? assetPath);
  } catch {
    return decodeURIComponent(assetPath.split("/").filter(Boolean).pop() ?? assetPath);
  }
}

export const siteAssetBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_ASSET_BASE_URL);
export const fallbackSiteAssetBaseUrl = defaultSiteAssetBaseUrl;

export function siteAsset(fileName: string) {
  return `${siteAssetBaseUrl}/${encodeAssetPath(fileName)}`;
}

export function fallbackSiteAsset(fileName: string) {
  return `${fallbackSiteAssetBaseUrl}/${encodeAssetPath(fileName)}`;
}

export function publicSiteAsset(fileName: string, revision = publicLandingAssetRevision) {
  const assetPath = `${publicLandingAssetBasePath}/${encodeAssetPath(fileName)}`;

  return revision ? `${assetPath}?v=${revision}` : assetPath;
}

export function getSiteAssetIntrinsicDimensions(assetPath: string) {
  const fileName = normalizeAssetFileName(assetPath);

  return intrinsicSiteAssetDimensions[fileName as keyof typeof intrinsicSiteAssetDimensions] ?? null;
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
