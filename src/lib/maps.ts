// Atstumai ir laikas. Su GOOGLE_MAPS_API_KEY naudojamas Google Routes API (su eismu),
// be rakto – apytikslis skaičiavimas (tiesi linija × 1.35, 22 km/h).
type LatLng = { lat: number; lng: number };

export async function geocode(address: string): Promise<LatLng | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?region=lt&language=lt&address=${encodeURIComponent(address)}&key=${key}`;
  const r = await fetch(url);
  const j = await r.json();
  const loc = j.results?.[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

export async function route(a: LatLng | null, b: LatLng | null, departure?: Date): Promise<{ km: number; min: number; source: "google" | "estimate" }> {
  if (!a || !b) return { km: 6, min: 18, source: "estimate" };
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (key) {
    try {
      const r = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
          destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          ...(departure && departure > new Date() ? { departureTime: departure.toISOString() } : {}),
        }),
      });
      const j = await r.json();
      const rt = j.routes?.[0];
      if (rt) return { km: Math.round(rt.distanceMeters / 100) / 10, min: Math.ceil(parseInt(rt.duration) / 60), source: "google" };
    } catch { /* naudojame apytikslį */ }
  }
  const R = 6371, rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  const km = Math.max(1, Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.35 * 10) / 10);
  return { km, min: Math.max(5, Math.round((km / 22) * 60)), source: "estimate" };
}

export const mapsLink = (from: string, to: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`;
