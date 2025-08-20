"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const PERSONAS = [
  { id: "retiree", label: "Retiree" },
  { id: "digital_nomad", label: "Digital Nomad" },
  { id: "remote_worker", label: "Remote Worker" },
  { id: "second_home", label: "Second Home" },
];

const REGIONS = {
  World: { center: [0, 20], zoom: 1 },
  "North America": { center: [-100, 40], zoom: 2 },
  "Central America": { center: [-90, 15], zoom: 3 },
  "South America": { center: [-60, -15], zoom: 2 },
  Europe: { center: [15, 50], zoom: 2.5 },
  "SE Asia": { center: [105, 10], zoom: 3 },
  "E Asia": { center: [110, 30], zoom: 2.8 },
  Africa: { center: [20, 0], zoom: 2.2 },
  "Middle East": { center: [45, 25], zoom: 3 },
};

export default function MobilityExplorer() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  // UI state
  const [persona, setPersona] = useState("retiree");
  const [age, setAge] = useState(37);
  const [income, setIncome] = useState(50000);
  const [region, setRegion] = useState("World");
  const [hoverCountry, setHoverCountry] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Demo rules (replace later with /data/visa_rules.json)
  const rules = {
    Spain: {
      visas: [
        { label: "Non-Lucrative Visa", categories: ["retiree"], min_income_usd: 30000 },
        { label: "Digital Nomad Visa", categories: ["digital_nomad"], min_income_usd: 35000 },
      ],
    },
    Thailand: {
      visas: [
        { label: "Retirement Visa", categories: ["retiree"], min_age: 50, min_income_usd: 24000 },
        { label: "Long Term Resident", categories: ["remote_worker"], min_income_usd: 80000 },
      ],
    },
  };

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return; // only initialize once
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [0, 20],
      zoom: 1,
    });

    // Hover + click events
    mapRef.current.on("mousemove", (e) => {
      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ["country-fills"],
      });
      if (features.length > 0) {
        setHoverCountry(features[0].properties.ADMIN);
      } else {
        setHoverCountry("");
      }
    });

    mapRef.current.on("click", (e) => {
      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ["country-fills"],
      });
      if (features.length > 0) {
        setSelectedCountry(features[0].properties.ADMIN);
      }
    });

    // Add country borders
    mapRef.current.on("load", () => {
      mapRef.current.addSource("countries", {
        type: "vector",
        url: "mapbox://mapbox.country-boundaries-v1",
      });

      mapRef.current.addLayer({
        id: "country-fills",
        type: "fill",
        source: "countries",
        "source-layer": "country_boundaries",
        paint: {
          "fill-color": "#d6d6da",
          "fill-outline-color": "#fff",
        },
      });
    });
  }, []);

  // Fly to region when user changes region
  useEffect(() => {
    if (!mapRef.current) return;
    const pos = REGIONS[region];
    mapRef.current.flyTo({ center: pos.center, zoom: pos.zoom });
  }, [region]);

  // Compute eligibility for demo
  const eligibilityByCountry = useMemo(() => {
    const out = {};
    for (const [country, data] of Object.entries(rules)) {
      let matches = data.visas.filter((v) => {
        const categories = (v.categories || []).map((c) => c.toLowerCase());
        const personaMatch = categories.includes(persona);
        const ageOk = v.min_age ? age >= v.min_age : true;
        const incomeOk = v.min_income_usd ? income >= v.min_income_usd : true;
        return personaMatch && ageOk && incomeOk;
      });
      out[country] = matches;
    }
    return out;
  }, [persona, age, income]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{ padding: 16, borderRight: "1px solid #eee" }}>
        <h2>Mobility Explorer (Demo)</h2>
        <label>Region</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle}>
          {Object.keys(REGIONS).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <label style={{ marginTop: 12 }}>Persona</label>
        <select value={persona} onChange={(e) => setPersona(e.target.value)} style={inputStyle}>
          {PERSONAS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <label style={{ marginTop: 12 }}>Age: {age}</label>
        <input type="range" min="18" max="85" value={age} onChange={(e) => setAge(parseInt(e.target.value))} style={{ width: "100%" }} />

        <label style={{ marginTop: 12 }}>Annual Income (USD): ${income.toLocaleString()}</label>
        <input type="range" min="0" max="200000" step="1000" value={income} onChange={(e) => setIncome(parseInt(e.target.value))} style={{ width: "100%" }} />

        {selectedCountry && (
          <div style={{ marginTop: 20 }}>
            <h3>{selectedCountry}</h3>
            {eligibilityByCountry[selectedCountry] && eligibilityByCountry[selectedCountry].length > 0 ? (
              <ul>
                {eligibilityByCountry[selectedCountry].map((visa, i) => (
                  <li key={i}>{visa.label}</li>
                ))}
              </ul>
            ) : (
              <p>No matching visas for current filters.</p>
            )}
          </div>
        )}
      </aside>

      {/* Map */}
      <main>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100vh" }} />
        <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: "white", padding: "4px 8px", borderRadius: 4 }}>
          {hoverCountry ? <>Hovering: <b>{hoverCountry}</b></> : "Hover a country"}
        </div>
      </main>
    </div>
  );
}

const inputStyle = { width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", marginTop: 4 };
