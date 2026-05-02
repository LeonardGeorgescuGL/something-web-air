import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, GripHorizontal } from 'lucide-react';
import type { Sensor } from '../types';
import { AQI_COLORS, AQI_LABELS, RISK_ZONE_COLORS, RISK_ZONE_LABELS } from '../utils/mockData';

interface MapViewProps {
  sensors: Sensor[];
  showClustering: boolean;
  onSensorClick: (sensor: Sensor) => void;
  useRiskZones?: boolean;
}

declare global {
  interface Window { L: any; }
}

// ── Mapare ID senzor → nume prietenos ──────────────────────────────────────
const SENSOR_NAMES: Record<string, string> = {
  // Centru (18)
  'S-CV-01': 'Piața Unirii',          'S-CV-02': 'Calea Victoriei',
  'S-CV-03': 'Piața Victoriei',       'S-CV-04': 'Piața Alba Iulia',
  'S-CV-05': 'Bd. Magheru',           'S-CV-06': 'Piața Romană',
  'S-CV-07': 'Tineretului',           'S-CV-08': 'Piața Sudului',
  'S-CV-09': 'Bd. Unirii (vest)',     'S-CV-10': 'Izvor',
  'S-CV-11': 'Operă',                 'S-CV-12': 'Universitate',
  'S-CV-13': 'Sf. Gheorghe',          'S-CV-14': 'Cișmigiu',
  'S-CV-15': 'Bd. Carol I',           'S-CV-16': 'Obor',
  'S-CV-17': 'Piața Rosetti',         'S-CV-18': 'Piața Kogălniceanu',
  // Nord (17)
  'S-NR-01': 'Băneasa',               'S-NR-02': 'Herăstrău',
  'S-NR-03': 'Floreasca',             'S-NR-04': 'Aeroport Băneasa',
  'S-NR-05': 'Dorobanți',             'S-NR-06': 'Pipera',
  'S-NR-07': 'Aviatorilor',           'S-NR-08': 'Bd. Prezan',
  'S-NR-09': 'Băneasa Sud',           'S-NR-10': 'Otopeni (limită)',
  'S-NR-11': 'Aurel Vlaicu',          'S-NR-12': 'Promenada',
  'S-NR-13': 'Corbeanca (limită)',    'S-NR-14': 'Calea Floreasca',
  'S-NR-15': 'Voluntari (limită)',    'S-NR-16': 'Jandarmeriei',
  'S-NR-17': 'Bd. Aerogării',
  // Sud (17)
  'S-SD-01': 'Berceni',               'S-SD-02': 'Piața Progresul',
  'S-SD-03': 'Giurgiului',            'S-SD-04': 'Rahova',
  'S-SD-05': 'Olteniței',             'S-SD-06': 'Brâncoveanu',
  'S-SD-07': 'Jilava (limită)',       'S-SD-08': 'Piața Resita',
  'S-SD-09': 'Bd. Metalurgiei',       'S-SD-10': 'Văcărești',
  'S-SD-11': 'Berceni Sud',           'S-SD-12': 'Calea Giurgiului',
  'S-SD-13': 'Popești-Leordeni',      'S-SD-14': 'Bd. Ferentari',
  'S-SD-15': 'Pieptănari',            'S-SD-16': 'Bd. Covasna',
  'S-SD-17': 'Piața Sudului Est',
  // Est (16)
  'S-ES-01': 'Pantelimon',            'S-ES-02': 'Colentina',
  'S-ES-03': 'Dristor',               'S-ES-04': 'Fundeni',
  'S-ES-05': 'Titan Est',             'S-ES-06': 'Andronache',
  'S-ES-07': 'Bd. Camil Ressu',       'S-ES-08': 'Iancului',
  'S-ES-09': 'Baraj Pantelimon',      'S-ES-10': 'Bd. Cheile Turzii',
  'S-ES-11': 'Voluntari Est',         'S-ES-12': 'Colentina Sud',
  'S-ES-13': 'Ștefan cel Mare',       'S-ES-14': 'Piața Muncii',
  'S-ES-15': 'Bd. Basarabia',         'S-ES-16': 'Cernavodă',
  // Vest (16)
  'S-VS-01': 'Militari',              'S-VS-02': 'Drumul Taberei',
  'S-VS-03': 'Crângași',              'S-VS-04': 'Gorjului',
  'S-VS-05': 'Lujerului',             'S-VS-06': 'Politehnica',
  'S-VS-07': 'Giulești',              'S-VS-08': 'Bd. Timișoara',
  'S-VS-09': 'Chiajna (limită)',      'S-VS-10': 'Bd. Geniului',
  'S-VS-11': 'Lacul Morii',           'S-VS-12': 'Militari Shopping',
  'S-VS-13': 'Piața Moghioroș',       'S-VS-14': 'Apusului',
  'S-VS-15': 'Bd. Virtuții',          'S-VS-16': 'Bd. Uverturii',
  // Sud-Est (16)
  'S-SE-01': 'Titan',                 'S-SE-02': 'Dristor Nord',
  'S-SE-03': 'Piața Râmnicu Sărat',   'S-SE-04': 'Republica',
  'S-SE-05': 'Costin Georgian',       'S-SE-06': 'Ilioara',
  'S-SE-07': 'Piața Muncii Sud',      'S-SE-08': 'Bd. Liviu Rebreanu',
  'S-SE-09': 'Balta Albă',            'S-SE-10': 'Piața Delfinului',
  'S-SE-11': 'Piața Vyborg',          'S-SE-12': 'Bd. Nicolae Grigorescu',
  'S-SE-13': 'Piața Izvorul Rece',    'S-SE-14': 'Dristor 2',
  'S-SE-15': 'Piața Budești',         'S-SE-16': 'Bd. Decebal',
};

// Zona urbana pentru fiecare prefix de senzor
const ZONE_NAMES: Record<string, string> = {
  'S-CV': 'Centru',
  'S-NR': 'Nord – Băneasa',
  'S-SD': 'Sud – Berceni',
  'S-ES': 'Est – Pantelimon',
  'S-VS': 'Vest – Militari',
  'S-SE': 'Sud-Est – Titan',
};

function getSensorName(id: string): string {
  return SENSOR_NAMES[id] ?? id;
}

function getZoneName(id: string): string {
  const prefix = id.substring(0, 4);
  return ZONE_NAMES[prefix] ?? 'Zona necunoscută';
}

// ── AQI real calculat din PM2.5 (formula EPA Breakpoints) ──────────────────
// https://www.airnow.gov/publications/air-quality-index/technical-assistance-document-september-2018/
function pm25ToAqi(pm25: number): number {
  if (pm25 < 0) return 0;
  const bp = [
    [0.0, 12.0, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ];
  for (const [cLow, cHigh, iLow, iHigh] of bp) {
    if (pm25 >= cLow && pm25 <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (pm25 - cLow) + iLow);
    }
  }
  return 500;
}

function aqiCategory(aqi: number): string {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  return 'hazardous';
}

function getAqiColor(aqi: number): string {
  if (aqi <= 50) return '#00ff88'; // 1 = verde neon
  if (aqi <= 100) return '#a3e635'; // 2 = verde-galben
  if (aqi <= 150) return '#fbbf24'; // 3 = galben
  if (aqi <= 200) return '#f97316'; // 4 = portocaliu
  return '#f87171'; // 5 = roșu
}

function createAqiMarkerIcon(color: string, size: number) {
  const L = window.L;
  const svg = `
    <svg width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size * 2} ${size * 2}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size}" cy="${size}" r="${size / 2}" fill="${color}" style="animation: pulse-svg 2s infinite; transform-origin: center;" />
      <circle cx="${size}" cy="${size}" r="${size / 2}" fill="${color}" stroke="white" stroke-width="2.5" />
    </svg>
  `;
  return L.divIcon({
    className: 'custom-svg-marker',
    html: svg,
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
  });
}

export function MapView({ sensors, showClustering, onSensorClick, useRiskZones }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterLayersRef = useRef<any[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setIsMapReady(true);
      document.body.appendChild(script);
    } else {
      setIsMapReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || leafletMapRef.current) return;
    const L = window.L;
    const bucharestBounds = L.latLngBounds(
      L.latLng(44.25, 25.90),
      L.latLng(44.65, 26.35)
    );
    const map = L.map(mapRef.current, {
      center: [44.4268, 26.1025],
      zoom: 12,
      maxBounds: bucharestBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 11,
      maxZoom: 17,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    map.fitBounds(bucharestBounds);
    leafletMapRef.current = map;
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isMapReady]);

  // ── Randare senzori ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current || !isMapReady) return;
    const L = window.L;
    const map = leafletMapRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    sensors.forEach(sensor => {
      // Calcul AQI real din PM2.5 daca avem valoare
      const realAqi = sensor.pm25 && sensor.pm25 > 0
        ? pm25ToAqi(sensor.pm25)
        : sensor.aqi;
      const realCategory = aqiCategory(realAqi);

      const color = useRiskZones
        ? (RISK_ZONE_COLORS[sensor.healthRiskZone] ?? '#64748b')
        : getAqiColor(realAqi);

      const sensorName = getSensorName(sensor.id);
      const zoneName = getZoneName(sensor.id);

      // Marime icon proportionala cu AQI (mai poluat = cerc mai mare)
      const size = realAqi <= 50 ? 18 : realAqi <= 100 ? 22 : realAqi <= 150 ? 26 : 30;

      const icon = createAqiMarkerIcon(color, size);

      // Tooltip hover: date complete
      const tooltipHtml = `
        <div style="min-width:180px;font-family:system-ui,sans-serif;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#e2e8f0;">
            📍 ${sensorName}
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${zoneName} · ${sensor.dataSource}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <div style="background:${color};border-radius:4px;padding:2px 8px;font-weight:700;color:#fff;font-size:13px;">
              AQI ${realAqi}
            </div>
            <span style="color:#cbd5e1;font-size:12px;">${AQI_LABELS[realCategory] ?? realCategory}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;font-size:11px;">
            <span style="color:#94a3b8;">PM2.5</span><span style="color:#e2e8f0;font-weight:600;">${sensor.pm25 ? sensor.pm25.toFixed(1) : '—'} μg/m³</span>
            <span style="color:#94a3b8;">PM10</span><span style="color:#e2e8f0;font-weight:600;">${sensor.pm10 ? sensor.pm10.toFixed(1) : '—'} μg/m³</span>
            <span style="color:#94a3b8;">NO₂</span><span style="color:#e2e8f0;font-weight:600;">${sensor.no2 ? sensor.no2.toFixed(1) : '—'} μg/m³</span>
            <span style="color:#94a3b8;">O₃</span><span style="color:#e2e8f0;font-weight:600;">${sensor.o3 ? sensor.o3.toFixed(1) : '—'} μg/m³</span>
            <span style="color:#94a3b8;">CO</span><span style="color:#e2e8f0;font-weight:600;">${sensor.co ? sensor.co.toFixed(2) : '—'} mg/m³</span>
            <span style="color:#94a3b8;">SO₂</span><span style="color:#e2e8f0;font-weight:600;">${sensor.so2 ? sensor.so2.toFixed(1) : '—'} μg/m³</span>
          </div>
        </div>
      `;

      const marker = L.marker([sensor.lat, sensor.lng], { icon })
        .addTo(map)
        .on('click', () => onSensorClick({ ...sensor, aqi: realAqi, category: realCategory }));

      marker.bindTooltip(tooltipHtml, {
        direction: 'top',
        offset: [0, -(size / 2 + 4)],
        opacity: 1,
      });

      markersRef.current.push(marker);
    });
  }, [sensors, isMapReady, onSensorClick, useRiskZones]);

  // ── Clustere / Zone ────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current || !isMapReady) return;
    const L = window.L;
    const map = leafletMapRef.current;

    clusterLayersRef.current.forEach(l => l.remove());
    clusterLayersRef.current = [];

    if (!showClustering) return;

    if (useRiskZones) {
      // K-Means 3 zone de risc sanitar
      const riskClusters = new Map<number, Sensor[]>();
      sensors.forEach(s => {
        const rc = s.riskCluster ?? 0;
        if (!riskClusters.has(rc)) riskClusters.set(rc, []);
        riskClusters.get(rc)!.push(s);
      });

      riskClusters.forEach((clusterSensors, riskClusterId) => {
        if (!clusterSensors.length) return;
        const centerLat = clusterSensors.reduce((sum, s) => sum + s.lat, 0) / clusterSensors.length;
        const centerLng = clusterSensors.reduce((sum, s) => sum + s.lng, 0) / clusterSensors.length;

        const avgPm25 = clusterSensors.reduce((sum, s) => sum + (s.pm25 ?? 0), 0) / clusterSensors.length;
        const avgAqi = clusterSensors.reduce((sum, s) => sum + (s.aqi ?? 0), 0) / clusterSensors.length;
        const healthRiskZone = clusterSensors[0].healthRiskZone ?? 'moderate-risk';
        const color = RISK_ZONE_COLORS[healthRiskZone] ?? '#64748b';

        const circle = L.circle([centerLat, centerLng], {
          color, fillColor: color, fillOpacity: 0.18, radius: 7000, weight: 2.5,
        }).addTo(map);

        const labelIcon = L.divIcon({
          className: 'cluster-label',
          html: `
            <div style="
              background:${color}ee;color:#fff;
              padding:8px 14px;border-radius:20px;
              font-weight:700;font-size:13px;
              white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.4);
              border:2px solid rgba(255,255,255,0.8);
            ">
              ${RISK_ZONE_LABELS[healthRiskZone] ?? healthRiskZone}<br/>
              <small style="font-weight:500;opacity:.9;">AQI mediu: ${Math.round(avgAqi)} · PM2.5: ${avgPm25.toFixed(1)}</small>
            </div>`,
          iconSize: [200, 52],
          iconAnchor: [100, 26],
        });

        const label = L.marker([centerLat, centerLng], { icon: labelIcon, interactive: false }).addTo(map);
        clusterLayersRef.current.push(circle, label);
      });
    } else {
      // Grupare pe zone urbane (prefix ID)
      const zoneGroups = new Map<string, Sensor[]>();
      sensors.forEach(s => {
        const prefix = s.id.substring(0, 4);
        if (!zoneGroups.has(prefix)) zoneGroups.set(prefix, []);
        zoneGroups.get(prefix)!.push(s);
      });

      zoneGroups.forEach((clusterSensors, prefix) => {
        if (!clusterSensors.length) return;
        const centerLat = clusterSensors.reduce((sum, s) => sum + s.lat, 0) / clusterSensors.length;
        const centerLng = clusterSensors.reduce((sum, s) => sum + s.lng, 0) / clusterSensors.length;

        // AQI calculat din PM2.5 real
        const avgPm25 = clusterSensors.reduce((sum, s) => sum + (s.pm25 ?? 0), 0) / clusterSensors.length;
        const avgAqi = avgPm25 > 0
          ? pm25ToAqi(avgPm25)
          : Math.round(clusterSensors.reduce((sum, s) => sum + s.aqi, 0) / clusterSensors.length);
        const category = aqiCategory(avgAqi);
        const color = AQI_COLORS[category] ?? AQI_COLORS['moderate'];
        const zoneName = ZONE_NAMES[prefix] ?? prefix;

        const circle = L.circle([centerLat, centerLng], {
          color, fillColor: color, fillOpacity: 0.15, radius: 1800, weight: 2,
        }).addTo(map);

        const labelIcon = L.divIcon({
          className: 'cluster-label',
          html: `
            <div style="
              background:${color}ee;color:#fff;
              padding:5px 11px;border-radius:16px;
              font-weight:600;font-size:12px;
              white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.35);
              border:2px solid rgba(255,255,255,0.7);
            ">
              ${zoneName} · AQI ${avgAqi}
            </div>`,
          iconSize: [160, 28],
          iconAnchor: [80, 14],
        });

        const label = L.marker([centerLat, centerLng], { icon: labelIcon, interactive: false }).addTo(map);
        clusterLayersRef.current.push(circle, label);
      });
    }
  }, [sensors, showClustering, isMapReady, useRiskZones]);

  // ── Stiluri CSS ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById('map-styles')) {
      const style = document.createElement('style');
      style.id = 'map-styles';
      style.textContent = `
        @keyframes pulse-svg {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.3; }
        }
        .custom-svg-marker {
          background: transparent;
          border: none;
        }
        .leaflet-container { font-family: system-ui, -apple-system, sans-serif; }
        .leaflet-popup-content-wrapper { background: #1e293b; color: white; border-radius: 12px; }
        .leaflet-popup-tip { background: #1e293b; }
        .leaflet-tooltip {
          background: #0f172a !important;
          color: white !important;
          border: 1px solid #334155 !important;
          border-radius: 10px !important;
          padding: 10px 14px !important;
          font-size: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
          max-width: 240px;
        }
        .leaflet-tooltip-top:before { border-top-color: #0f172a !important; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
            <div className="text-white">Se încarcă harta...</div>
          </div>
        </div>
      )}

      {/* Counter senzori */}
      <div className="absolute bottom-6 left-6 bg-slate-900/90 backdrop-blur-lg border border-slate-700 rounded-xl p-4 text-white z-[1000]">
        <div className="text-xs text-slate-400 mb-1">Total senzori activi</div>
        <div className="text-2xl font-bold">{sensors.length}</div>
        <div className="text-xs text-slate-500 mt-1">Date live · OpenWeather</div>
      </div>

      {/* Legenda Draggable */}
      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={mapRef}
        className="absolute top-6 right-6 bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-xl z-[1000] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <div 
          className="bg-slate-800/80 p-2 flex items-center justify-between border-b border-slate-700/50"
        >
          <GripHorizontal className="w-4 h-4 text-slate-500 mr-4" />
          <button 
            onClick={(e) => { e.stopPropagation(); setIsLegendOpen(!isLegendOpen); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700 transition-colors"
          >
            {isLegendOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        
        <AnimatePresence initial={false}>
          {isLegendOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-4 pointer-events-none">
                <div className="text-white text-sm font-semibold mb-3">
                  {useRiskZones ? 'Zone de Risc Sanitar' : 'Categorii AQI'}
                </div>
                <div className="space-y-2">
                  {Object.entries(useRiskZones ? RISK_ZONE_COLORS : AQI_COLORS).map(([category, color]) => (
                    <div key={category} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full border border-white/30 shadow-sm flex-shrink-0"
                           style={{ backgroundColor: color }} />
                      <span className="text-slate-300 whitespace-nowrap">
                        {useRiskZones ? RISK_ZONE_LABELS[category as keyof typeof RISK_ZONE_LABELS] : AQI_LABELS[category as keyof typeof AQI_LABELS]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}