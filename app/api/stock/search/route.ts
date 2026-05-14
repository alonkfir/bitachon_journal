export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  if (!q) return Response.json({ result: [] })

  const key = process.env.FINNHUB_API_KEY
  if (!key) return Response.json({ result: [], error: "missing_key" }, { status: 500 })

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${key}`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return Response.json({ result: [] }, { status: res.status })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ result: [] }, { status: 500 })
  }
}
