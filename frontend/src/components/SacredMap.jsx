import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default marker fix for webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function SacredMap({ points = [], height = 360, zoom = 5 }) {
  const validPoints = points.filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
  const center = validPoints[0] ? [validPoints[0].lat, validPoints[0].lng] : [25.5, 82.0];
  return (
    <div style={{ height }} data-testid="sacred-map">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validPoints.map((p) => (
          <Marker key={p.id || `${p.lat},${p.lng}`} position={[p.lat, p.lng]}>
            <Popup>
              <strong>{p.name}</strong>
              <br />
              {p.state_or_country || ""}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
