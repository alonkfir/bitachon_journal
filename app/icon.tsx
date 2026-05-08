import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"
export const runtime = "edge"

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 7,
      }}
    >
      <svg width={22} height={22} viewBox="0 0 100 100" style={{ display: "block" }}>
        <polyline
          points="6,78 26,56 48,30 68,46 94,12"
          stroke="#10b981"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="94" cy="12" r="12" fill="#10b981" />
      </svg>
    </div>,
    size,
  )
}
