export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol")?.trim().toUpperCase()
  if (!symbol) return Response.json({})

  const key = process.env.FINNHUB_API_KEY
  if (!key) return Response.json({})

  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`,
    { next: { revalidate: 10 } }
  )
  const data = await res.json()
  return Response.json(data)
}
