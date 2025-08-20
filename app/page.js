"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import * as topojson from "topojson-client";

// Local TopoJSON for world map (already in your repo)
const WORLD_URL = "/world-110m.json";
// Local rules (we'll fetch from /public/data)
const RULES_URL = "/data/visa_rules.json";

const PERSONAS = [
  { id: "retiree", label: "Retiree" },
  { id: "digital_nomad", label: "Digital Nomad" },
  { id: "remote_worker", label: "Remote Worker" },
  { id: "second_home", label: "Second Home" }
];

// Region presets (center [lng, lat], zoom)
const REGIONS = {
  World:         { center: [0, 20],    zoom: 1 },
  "North America":  { center: [-100, 40], zoom: 2 },
  "Central America":{ center: [-90, 15],  zoom: 3 },
  "South America":  { center: [-60, -15], zoom: 2 },
  Europe:        { center: [15, 50],   zoom: 2.5 },
  "SE Asia":     { center: [105, 10],  zoom: 3 },
  "E Asia":      { center: [110, 30],  zoom: 2.8 },
  Africa:        { center: [20, 0],    zoom: 2.2 },
  "Middle East": { center: [45, 25],   zoom: 3 }
};

// handle naming quirks
const NAME_ALIASES = {
  "Viet Nam": "Vietnam",
};

function normalizeName(name) {
  return NAME_ALIASES[name] || name;
}

export default function MobilityExplorer() {
  // UI state
  const [persona, setPersona] = useState("retiree");
  const [age, setAge] = useState(37);
  const [income, setIncome] = useState(50000);
  const [region, setRegion] = useState("World");

  // Map state
  const [position, setPosition] = useState(REGIONS["World"]);
  const [hoverName, setHoverName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Data
  const [worldFeatures, setWorldFeatures] = useState([]); // GeoJSON
  const [rules, setRules] = useState({});                 // visa rules by country

  // Load world geometry
  useEffect(() => {
    (async () => {
      const topo = await fetch(WORLD_URL).then(r => r.json());
      // Support either TopoJSON or GeoJSON file
      let features = [];
      if (topo.type === "Topology" && topo.objects && topo.objects.countries) {
        features = topojson.feature(topo, topo.objects.countries).features;
      } else if (topo.type === "FeatureCollection") {
        features = topo.features;
      }
      setWorldFeatures(features);
    })();
  }, []);

  // Load visa rules
  useEffect(() => {
    fetch(RULES_URL).then(r => r.json()).then(setRules);
  }, []);

  // Change region view
  useEffect(() => {
    setPosition(REGIONS[region] || REGIONS["World"]);
  }, [region]);

  // Determine highlight color based on filters & rules
  const eligibilityByCountry = useMemo(() => {
    // fallback categories if user picks retiree but age < min_age
    const fallbacksWhenTooYoung = ["second_home", "investor", "remote_worker"];

    const out = {};
    for (const feat of worldFeatures) {
      const name = normalizeName(feat.properties?.name || "");
      const countryRules = rules[name];

      if (!countryRules) {
        out[name] = { status: "unknown", matches: [] };
        continue;
      }

      // find all visas that match persona and meet thresholds
      let matches = countryRules.visas.filter(v => {
        const categories = (v.categories || []).map(c => c.toLowerCase());
        const personaMatch = categories.includes(persona);

        // if retiree and too young, allow certain fallbacks
        const canFallback =
          persona === "retiree" &&
          categories.some(c => fallbacksWhenTooYoung.includes(c));

        const ageOk = v.min_age ? age >= v.min_age : true;
        const incomeOk = v.min_income_usd ? income >= v.min_income_usd : true;

        if (personaMatch) return ageOk && incomeOk;
        if (!ageOk && canFallback) return incomeOk; // fallback path
        return false;
      });

      if (matches.length > 0) {
        out[name] = { status: "eligible", matches };
      } else {
        out[name] = { status: "ineligible", matches: [] };
      }
    }
    return out;
  }, [worldFeatures, rules, persona, age, income]);

  const colorFor = (name) => {
    const e = eligibilityByCountry[name];
    if (!e) return "#EEE";
    if (e.status === "eligible") return "#4CAF50"; // green
    if (e.status === "unknown")  return "#ECECEC";
    return "#D6D6DA"; // grey
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: "100vh" }}>
      {/* Left panel */}
      <aside style={{ padding: 16, borderRight: "1px solid #eee" }}>
        <h2 style={{ marginTop: 0 }}>Mobility Explorer (Demo)</h2>

        <div style={{ fontSize: 13, background: "#fff8e1", padding: 8, borderRadius: 6, marginBottom: 12 }}>
          <b>Note:</b> Demo data only. Not legal advice.
        </div>

        <label style={{ display: "block", marginTop: 12 }}>Region</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle}>
          {Object.keys(REGIONS).map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <label style={{ display: "block", marginTop: 12 }}>Persona</label>
        <select value={persona} onChange={(e) => setPersona(e.target.value)} style={inputStyle}>
          {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        <label style={{ display: "block", marginTop: 12 }}>
          Age: <b>{age}</b>
        </label>
        <input type="range" min="18" max="85" value={age}
               onChange={(e) => setAge(parseInt(e.target.value))}
               style={{ width: "100%" }} />

        <label style={{ display: "block", marginTop: 12 }}>
          Annual Income (USD): <b>${income.toLocaleString()}</b>
        </label>
        <input type="range" min="0" max="200000" step="1000" value={income}
               onChange={(e) => setIncome(parseInt(e.target.value))}
               style={{ width: "100%" }} />

        <div style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
          <div><span style={{ display: "inline-block", width: 12, height: 12, background: "#4CAF50", marginRight: 6 }} /> Eligible</div>
          <div><span style={{ display: "inline-block", width: 12, height: 12, background: "#D6D6DA", marginRight: 6 }} /> Not eligible (per demo rules)</div>
          <div><span style={{ display: "inline-block", width: 12, height: 12, background: "#ECECEC", marginRight: 6 }} /> No data yet</div>
        </div>

        {selectedCountry && (
          <div style={{ marginTop: 20, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>{selectedCountry}</h3>
            {(() => {
              const e = eligibilityByCountry[selectedCountry] || { matches: [] };
              if (e.matches.length === 0) return <p>No matching visa in demo for current filters.</p>;
              return (
                <ul style={{ paddingLeft: 16 }}>
                  {e.matches.map((m, i) => (
                    <li key={i}>
                      <b>{m.label}</b>
                      {m.min_age ? <> — min age {m.min_age}</> : null}
                      {m.min_income_usd ? <> — min income ${m.min_income_usd.toLocaleString()}</> : null}
                      {m.notes ? <div style={{ fontSize: 12, color: "#666" }}>{m.notes}</div> : null}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        )}
      </aside>

      {/* Map */}
      <main style={{ padding: 10 }}>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
          🌍 Global Mobility (Demo)
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 8, overflow: "hidden" }}>
          <ComposableMap projectionConfig={{ scale: 160 }} style={{ width: "100%", height: "80vh" }}>
            <ZoomableGroup
              center={position.center}
              zoom={position.zoom}
              onMoveEnd={(pos) => setPosition(pos)}
              minZoom={1}
              maxZoom={8}
            >
              <Geographies geography={{ type: "FeatureCollection", features: worldFeatures }}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const name = normalizeName(geo.properties?.name || "");
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => setHoverName(name)}
                        onMouseLeave={() => setHoverName("")}
                        onClick={() => setSelectedCountry(name)}
                        style={{
                          default: { fill: colorFor(name), outline: "none", stroke: "#fff" },
                          hover:   { fill: "#42a5f5",      outline: "none", stroke: "#fff" },
                          pressed: { fill: "#1565c0",      outline: "none", stroke: "#fff" }
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        <div style={{ marginTop: 8, textAlign: "center", color: "#555" }}>
          {hoverName ? <>Hovering: <b>{hoverName}</b></> : "Hover a country"}
        </div>
      </main>
    </div>
  );
}

const inputStyle = { width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", marginTop: 4 };
