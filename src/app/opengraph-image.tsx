import { ImageResponse } from "next/og";

export const alt = "Factoo — Facturez et faites-vous payer depuis WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: 80,
          background: "linear-gradient(135deg, #04201D 0%, #0F766E 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#2DD4BF" }}>Factoo</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 28 }}>
          Facturez en 2 minutes.
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.1, color: "#FBBF24" }}>
          Payé depuis WhatsApp.
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 36, opacity: 0.85 }}>
          Wave · Orange Money · Carte — sans compte client
        </div>
      </div>
    ),
    size,
  );
}
