import { ImageResponse } from "next/og";

import { fallbackSiteAsset, siteAsset } from "@/lib/site-assets";

export const alt = "Money Moicano MMA";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const imageUrl = siteAsset("open-graph-v2.jpg");
  let response: Response;

  try {
    response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Could not load Open Graph image from ${imageUrl}.`);
    }
  } catch {
    response = await fetch(fallbackSiteAsset("open-graph-v2.jpg"));
  }

  const arrayBuffer = await response.arrayBuffer();

  return new ImageResponse(
    <img
      src={`data:image/jpeg;base64,${Buffer.from(arrayBuffer).toString(
        "base64",
      )}`}
      alt="Money Moicano MMA"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />,
    size,
  );
}
