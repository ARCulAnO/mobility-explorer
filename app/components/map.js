"use client";

import { useState } from "react";
import Map, { NavigationControl } from "react-map-gl";

export default function WorldMap() {
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.3,
  });

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
      >
        <NavigationControl position="bottom-right" />
      </Map>
    </div>
  );
}

