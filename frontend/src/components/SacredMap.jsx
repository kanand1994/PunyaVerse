import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

async function fetchOsrmRoute(points) {
  if (points.length < 2) return null;
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    if (!r.ok) return null;
    const data = await r.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      polyline: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distance_km: route.distance / 1000,
      duration_h: route.duration / 3600,
    };
  } catch {
    return null;
  }
}

export default function SacredMap({ points = [], height = 360, zoom = 5, withRoute = false }) {
  const validPoints = points.filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
  const center = validPoints[0] ? [validPoints[0].lat, validPoints[0].lng] : [25.5, 82.0];
  const [route, setRoute] = useState(null);

  useEffect(() => {
    if (withRoute && validPoints.length >= 2) {
      fetchOsrmRoute(validPoints).then(setRoute);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withRoute, validPoints.map((p) => p.id).join(",")]);

  return (
    <div style={{ height }} data-testid="sacred-map">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validPoints.map((p, idx) => (
          <Marker key={p.id || `${p.lat},${p.lng}`} position={[p.lat, p.lng]}>
            <Popup>
              <strong>{idx + 1}. {p.name}</strong>
              <br />
              {p.state_or_country || ""}
            </Popup>
          </Marker>
        ))}
        {route && <Polyline positions={route.polyline} color="#D4AF37" weight={4} opacity={0.85} />}
      </MapContainer>
      {route && (
        <p className="text-xs text-muted-foreground mt-2 font-overline">
          OSRM · {route.distance_km.toFixed(0)} km · ~{route.duration_h.toFixed(1)} hrs by road
        </p>
      )}
    </div>
  );
}
