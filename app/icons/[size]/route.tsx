import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

function TradeIcon({ dim }: { dim: number }) {
  const inner = Math.round(dim * 0.68)
  return (
    <div
      style={{
        width: dim,
        height: dim,
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={inner}
        height={inner}
        viewBox="0 0 100 100"
        style={{ display: "block" }}
      >
        <polyline
          points="6,78 26,56 48,30 68,46 94,12"
          stroke="#10b981"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="94" cy="12" r="9" fill="#10b981" />
        {/* Subtle baseline */}
        <line
          x1="6" y1="90" x2="94" y2="90"
          stroke="#1e293b"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeStr } = await params
  const dim = parseInt(sizeStr, 10)

  if (![192, 512].includes(dim)) {
    return new Response("Not found", { status: 404 })
  }

  return new ImageResponse(<TradeIcon dim={dim} />, { width: dim, height: dim })
}
