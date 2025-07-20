// src/pages/MapPage.js
import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { flattenGeoData } from "../GeoVisionAI.js";

// — you can replace this with a fetch or prop in a real app —
const geoData = {
  dog_walk: {
    "2025-06-13": {
      "41.9069_-71.4287": [
        "2025-06-13T120004.793Z.png",
        "2025-06-13T120004.793Z.txt",
      ],
      "41.9072_-71.4285": [
        "2025-06-13T115934.840Z.png",
        "2025-06-13T115934.840Z.txt",
      ],
      "41.9075_-71.4283": [
        "2025-06-13T115855.555Z.png",
        "2025-06-13T115855.555Z.txt",
        "2025-06-13T115855.584Z.png",
        "2025-06-13T115855.584Z.txt",
        "2025-06-13T115900.048Z.png",
        "2025-06-13T115900.048Z.txt",
        "2025-06-13T115904.671Z.png",
        "2025-06-13T115904.671Z.txt",
      ],
      "41.9076_-71.4283": [
        "2025-06-13T115832.789Z.png",
        "2025-06-13T115832.789Z.txt",
        "2025-06-13T115837.753Z.png",
        "2025-06-13T115837.753Z.txt",
        "2025-06-13T115842.772Z.png",
        "2025-06-13T115842.772Z.txt",
      ],
      "41.9077_-71.4282": [
        "2025-06-13T115807.644Z.png",
        "2025-06-13T115807.644Z.txt",
        "2025-06-13T115807.764Z.png",
        "2025-06-13T115807.764Z.txt",
        "2025-06-13T115812.732Z.png",
        "2025-06-13T115812.732Z.txt",
        "2025-06-13T115817.803Z.png",
        "2025-06-13T115817.803Z.txt",
        "2025-06-13T115822.802Z.png",
        "2025-06-13T115822.802Z.txt",
      ],
      "41.9077_-71.4283": [
        "2025-06-13T115827.819Z.png",
        "2025-06-13T115827.819Z.txt",
      ],
    },
  },
};

export default function MapPage() {
  const points = flattenGeoData(geoData);

  // center on first point (or fallback to [0,0])
  const center = points.length ? [points[0].lat, points[0].lon] : [0, 0];

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ width: "100%", height: "100vh" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {points.map((pt, i) => (
        <Marker key={i} position={[pt.lat, pt.lon]}>
          <Popup>
            <strong>Project:</strong> {pt.project}
            <br />
            <strong>Date:</strong> {pt.date}
            <br />
            <strong>Files:</strong>
            <ul style={{ margin: "0.5em 0 0 1em", padding: 0 }}>
              {pt.files.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
