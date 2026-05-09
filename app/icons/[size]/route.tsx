import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import fs from "fs"
import path from "path"

export const runtime = "nodejs"   // needs fs — cannot be edge

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeStr } = await params
  const dim = parseInt(sizeStr, 10)

  if (![192, 512].includes(dim)) {
    return new Response("Not found", { status: 404 })
  }

  const imgPath = path.join(process.cwd(), "public", "logo.png")
  const imgData = fs.readFileSync(imgPath)
  const base64  = imgData.toString("base64")
  const dataUrl = `data:image/png;base64,${base64}`

  const bg = dim === 512 ? "#f5e6b8" : "#ffffff"

  return new ImageResponse(
    <div
      style={{
        width: dim,
        height: dim,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        width={Math.round(dim * 0.85)}
        height={Math.round(dim * 0.85)}
        alt="logo"
      />
    </div>,
    { width: dim, height: dim },
  )
}
