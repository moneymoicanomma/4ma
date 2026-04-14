import type { Metadata } from "next";

import {
  contactEmail,
  defaultOgImagePath,
  eventDateIso,
  eventLocationCity,
  eventLocationName,
  siteDescription,
  siteLanguage,
  siteLocale,
  siteName,
  siteSocialProfiles,
  siteUrl,
  xHandle
} from "@/lib/site";

type SeoConfig = {
  path: `/${string}` | "/";
  title: string;
  description: string;
  keywords?: readonly string[];
  noIndex?: boolean;
};

const defaultKeywords = [
  "Money Moicano MMA",
  "MMA Brasil",
  "evento de MMA",
  "Renato Moicano",
  "lutas de MMA",
  "fantasy MMA",
  "transmissao de MMA",
  "ingressos MMA",
  "card de lutas",
  "evento esportivo"
] as const;

const defaultSocialImage = {
  url: defaultOgImagePath,
  width: 1200,
  height: 630,
  alt: `${siteName} em ${eventLocationName}, ${eventLocationCity}`
} as const;

function dedupeKeywords(keywords: readonly string[]) {
  return [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))];
}

function createRobots(noIndex = false): Metadata["robots"] {
  if (noIndex) {
    return {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true
      }
    };
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  };
}

function createVerification(): Metadata["verification"] | undefined {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const facebookDomainVerification = process.env.FACEBOOK_DOMAIN_VERIFICATION?.trim();

  if (!google && !facebookDomainVerification) {
    return undefined;
  }

  return {
    google: google || undefined,
    other: facebookDomainVerification
      ? {
          "facebook-domain-verification": facebookDomainVerification
        }
      : undefined
  };
}

export function createPageMetadata({
  path,
  title,
  description,
  keywords = [],
  noIndex = false
}: SeoConfig): Metadata {
  const resolvedKeywords = dedupeKeywords([...defaultKeywords, ...keywords]);

  return {
    title,
    description,
    keywords: resolvedKeywords,
    alternates: {
      canonical: path
    },
    robots: createRobots(noIndex),
    openGraph: {
      type: "website",
      locale: siteLocale,
      siteName,
      url: path,
      title,
      description,
      images: [defaultSocialImage]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: xHandle,
      site: xHandle,
      images: [defaultSocialImage.url]
    }
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: siteName,
  description: siteDescription,
  keywords: dedupeKeywords(defaultKeywords),
  alternates: {
    canonical: "/"
  },
  authors: [
    {
      name: siteName
    }
  ],
  creator: siteName,
  publisher: siteName,
  category: "sports",
  verification: createVerification(),
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml"
      },
      {
        url: "/favicon.ico",
        sizes: "any"
      }
    ],
    shortcut: "/favicon.ico"
  },
  ...createPageMetadata({
    path: "/",
    title: siteName,
    description: siteDescription,
    keywords: [
      "evento Money Moicano MMA",
      "evento ao vivo de MMA",
      "selecao de atletas MMA",
      "parcerias esportivas"
    ]
  })
};

export const siteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      url: siteUrl,
      email: contactEmail,
      sameAs: [...siteSocialProfiles],
      logo: `${siteUrl}${defaultOgImagePath}`
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: siteName,
      description: siteDescription,
      inLanguage: siteLanguage,
      publisher: {
        "@id": `${siteUrl}/#organization`
      }
    },
    {
      "@type": "SportsEvent",
      "@id": `${siteUrl}/#event`,
      name: siteName,
      url: siteUrl,
      description: siteDescription,
      image: `${siteUrl}${defaultOgImagePath}`,
      startDate: eventDateIso,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
      inLanguage: siteLanguage,
      location: {
        "@type": "Place",
        name: eventLocationName,
        address: {
          "@type": "PostalAddress",
          addressLocality: eventLocationCity,
          addressCountry: "BR"
        }
      },
      organizer: {
        "@id": `${siteUrl}/#organization`
      }
    }
  ]
} as const;
