Deno.serve(async () => {
  const KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!KEY) return new Response("nokey", { status: 503 });
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent("Destinos com a Ju")}&language=pt-BR&key=${KEY}`);
  const d = await r.json();
  const out = (d.results || []).slice(0, 8).map((x: any) => ({ id: x.place_id, name: x.name, addr: x.formatted_address, total: x.user_ratings_total }));
  return new Response(JSON.stringify({ status: d.status, out }), { headers: { "Content-Type": "application/json" } });
});
