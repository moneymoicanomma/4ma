import { ImageResponse } from "next/og";

export const alt = "Money Moicano MMA";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const imageUrl =
    "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev/open-graph-v2.jpg";

  const res = await fetch(imageUrl);
  const arrayBuffer = await res.arrayBuffer();

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
