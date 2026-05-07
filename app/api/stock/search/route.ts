export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  if (!q) return Response.json({ result: [] })

  const key = process.env.FINNHUB_API_KEY
  if (!key) return Response.json({ result: [] }, { status: 500 })

  const res = await fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${key}`,
    { next: { revalidate: 30 } }
  )
  const data = await res.json()
  return Response.json(data)
}
