import { findPlace } from "@/lib/restaurant-search/places";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }

  try {
    const place = await findPlace(query, apiKey);
    if (!place) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json(place);
  } catch {
    return Response.json({ error: "upstream_failed" }, { status: 502 });
  }
}
