export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol")?.trim().toUpperCase()
  if (!symbol) return Response.json({})

  const key = process.env.FINNHUB_API_KEY
  if (!key) return Response.json({ error: "missing_key" }, { status: 500 })

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`,
      { next: { revalidate: 10 } }
    )
    if (!res.ok) return Response.json({}, { status: res.status })
    const data = await res.json()
    if (data.error) return Response.json({}, { status: 400 })
    return Response.json(data)
  } catch {
    return Response.json({}, { status: 500 })
  }
}
