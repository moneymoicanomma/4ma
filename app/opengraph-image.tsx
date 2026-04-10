import { ImageResponse } from "next/og";

import {
  eventDateLabel,
  eventLocationCity,
  eventLocationName,
  siteDescription,
  siteName
} from "@/lib/site";

export const alt = `${siteName} - ${eventDateLabel}`;
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #080608 0%, #161012 42%, #2c1416 100%)",
          color: "#f6eee2",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 22% 22%, rgba(255, 166, 77, 0.28), transparent 34%), radial-gradient(circle at 82% 18%, rgba(255, 70, 70, 0.18), transparent 24%), linear-gradient(115deg, transparent 0%, transparent 48%, rgba(255, 255, 255, 0.06) 48%, rgba(255, 255, 255, 0.03) 60%, transparent 60%)"
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "56px 64px"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16
            }}
          >
            <div
              style={{
                display: "flex",
                height: 14,
                width: 14,
                borderRadius: "999px",
                background: "#ffb15c",
                boxShadow: "0 0 24px rgba(255, 177, 92, 0.8)"
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 22,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#ffcf92"
              }}
            >
              Evento ao vivo
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              maxWidth: 820
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 78,
                lineHeight: 0.94,
                fontWeight: 900,
                textTransform: "uppercase"
              }}
            >
              <span>{siteName}</span>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 32,
                lineHeight: 1.3,
                color: "#f2d9b7"
              }}
            >
              {siteDescription}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 24
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap"
              }}
            >
              {[
                eventDateLabel,
                `${eventLocationName}, ${eventLocationCity}`,
                "Fantasy Card e transmissao"
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    padding: "12px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(255, 226, 183, 0.24)",
                    background: "rgba(9, 8, 10, 0.42)",
                    fontSize: 24,
                    color: "#fff1d8"
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 22,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#ffcf92"
              }}
            >
              moneymoicanomma.com.br
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
