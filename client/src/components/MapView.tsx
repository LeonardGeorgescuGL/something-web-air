import React, { useEffect, useRef, useState } from 'react';
import type { Sensor } from '../types';
import { AQI_COLORS, AQI_LABELS, RISK_ZONE_COLORS, RISK_ZONE_LABELS } from '../utils/mockData';

interface MapViewProps {
  sensors: Sensor[];
  showClustering: boolean;
  onSensorClick: (sensor: Sensor) => void;
  useRiskZones?: boolean; // New prop to toggle between AQI and Risk zones
}

// Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

export function MapView({ sensors, showClustering, onSensorClick, useRiskZones }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clusterLayersRef = useRef<any[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize Leaflet
  useEffect(() => {
    // Add Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Add Leaflet JS
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setIsMapReady(true);
      };
      document.body.appendChild(script);
    } else {
      setIsMapReady(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapReady || !mapRef.current || leafletMapRef.current) return;

    const L = window.L;

    // Define Bucharest and Ilfov bounds
    const bucharestBounds = L.latLngBounds(
      L.latLng(44.25, 25.90),  // Southwest corner
      L.latLng(44.65, 26.35)   // Northeast corner
    );

    // Create map centered on Bucharest
    const map = L.map(mapRef.current, {
      center: [44.4268, 26.1025],
      zoom: 12,
      zoomControl: true,
      maxBounds: bucharestBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 11,
      maxZoom: 16,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      bounds: bucharestBounds,
    }).addTo(map);

    // Fit to bounds on initialization
    map.fitBounds(bucharestBounds);

    leafletMapRef.current = map;

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isMapReady]);

  // Update sensors on map
  useEffect(() => {
    if (!leafletMapRef.current || !isMapReady) return;

    const L = window.L;
    const map = leafletMapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add sensor markers
    sensors.forEach(sensor => {
      const color = useRiskZones ? RISK_ZONE_COLORS[sensor.healthRiskZone] : AQI_COLORS[sensor.category];
      
      // Create custom icon with AQI color
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="position: relative;">
            <div style="
              width: 24px;
              height: 24px;
              background: ${color};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            "></div>
            <div style="
              position: absolute;
              top: -8px;
              left: -8px;
              width: 40px;
              height: 40px;
              background: ${color}40;
              border-radius: 50%;
              animation: pulse 2s infinite;
            "></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([sensor.lat, sensor.lng], { icon })
        .addTo(map)
        .on('click', () => onSensorClick(sensor));

      // Add tooltip
      marker.bindTooltip(
        `<div style="text-align: center;">
          <strong>AQI: ${sensor.aqi}</strong><br/>
          ${useRiskZones ? RISK_ZONE_LABELS[sensor.healthRiskZone] : AQI_LABELS[sensor.category]}<br/>
          <small>${sensor.dataSource}</small>
        </div>`,
        { direction: 'top', offset: [0, -12] }
      );

      markersRef.current.push(marker);
    });

  }, [sensors, isMapReady, onSensorClick, useRiskZones]);

  // Update clustering visualization
  useEffect(() => {
    if (!leafletMapRef.current || !isMapReady || !showClustering) {
      // Remove cluster layers if clustering is off
      clusterLayersRef.current.forEach(layer => layer.remove());
      clusterLayersRef.current = [];
      return;
    }

    const L = window.L;
    const map = leafletMapRef.current;

    // Clear existing cluster layers
    clusterLayersRef.current.forEach(layer => layer.remove());
    clusterLayersRef.current = [];

    if (useRiskZones) {
      // Use risk-based clustering (3 zones)
      const riskClusters = new Map<number, Sensor[]>();
      sensors.forEach(sensor => {
        const riskCluster = sensor.riskCluster || 0;
        if (!riskClusters.has(riskCluster)) {
          riskClusters.set(riskCluster, []);
        }
        riskClusters.get(riskCluster)!.push(sensor);
      });

      // Draw risk zone cluster circles
      riskClusters.forEach((clusterSensors, riskClusterId) => {
        if (clusterSensors.length === 0) return;

        // Calculate cluster center
        const centerLat = clusterSensors.reduce((sum, s) => sum + s.lat, 0) / clusterSensors.length;
        const centerLng = clusterSensors.reduce((sum, s) => sum + s.lng, 0) / clusterSensors.length;

        // Calculate average AQI for cluster
        const avgAQI = Math.round(clusterSensors.reduce((sum, s) => sum + s.aqi, 0) / clusterSensors.length);
        const healthRiskZone = clusterSensors[0].healthRiskZone;
        const color = RISK_ZONE_COLORS[healthRiskZone];

        // Draw cluster circle - VERY LARGE to cover entire urban areas
        const circle = L.circle([centerLat, centerLng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.25,
          radius: 7500, // Increased from 4500 to 7500 meters for maximum urban coverage
          weight: 3,
        }).addTo(map);

        // Add cluster label
        const labelIcon = L.divIcon({
          className: 'cluster-label',
          html: `
            <div style="
              background: ${color}ee;
              color: white;
              padding: 8px 16px;
              border-radius: 24px;
              font-weight: 700;
              font-size: 14px;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              border: 2px solid white;
            ">
              ${RISK_ZONE_LABELS[healthRiskZone]}<br/>
              <small style="font-weight: 500; opacity: 0.9;">AQI mediu: ${avgAQI}</small>
            </div>
          `,
          iconSize: [180, 50],
          iconAnchor: [90, 25],
        });

        const label = L.marker([centerLat, centerLng], {
          icon: labelIcon,
          interactive: false,
        }).addTo(map);

        clusterLayersRef.current.push(circle, label);
      });
    } else {
      // Use original AQI-based clustering (6 zones)
      const clusters = new Map<number, Sensor[]>();
      sensors.forEach(sensor => {
        const cluster = sensor.cluster || 0;
        if (!clusters.has(cluster)) {
          clusters.set(cluster, []);
        }
        clusters.get(cluster)!.push(sensor);
      });

      // Draw cluster circles
      clusters.forEach((clusterSensors, clusterId) => {
        if (clusterSensors.length === 0) return;

        // Calculate cluster center
        const centerLat = clusterSensors.reduce((sum, s) => sum + s.lat, 0) / clusterSensors.length;
        const centerLng = clusterSensors.reduce((sum, s) => sum + s.lng, 0) / clusterSensors.length;

        // Calculate average AQI for cluster
        const avgAQI = Math.round(clusterSensors.reduce((sum, s) => sum + s.aqi, 0) / clusterSensors.length);
        const category = clusterSensors[0].category;
        const color = AQI_COLORS[category];

        // Draw cluster circle
        const circle = L.circle([centerLat, centerLng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.2,
          radius: 1500,
          weight: 2,
        }).addTo(map);

        // Add cluster label
        const labelIcon = L.divIcon({
          className: 'cluster-label',
          html: `
            <div style="
              background: ${color}ee;
              color: white;
              padding: 6px 12px;
              border-radius: 20px;
              font-weight: 600;
              font-size: 14px;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 2px solid white;
            ">
              Zona ${clusterId + 1} - AQI ${avgAQI}
            </div>
          `,
          iconSize: [120, 30],
          iconAnchor: [60, 15],
        });

        const label = L.marker([centerLat, centerLng], {
          icon: labelIcon,
          interactive: false,
        }).addTo(map);

        clusterLayersRef.current.push(circle, label);
      });
    }
  }, [sensors, showClustering, isMapReady, useRiskZones]);

  // Add pulse animation
  useEffect(() => {
    if (!document.getElementById('pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'pulse-animation';
      style.textContent = `
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.2;
          }
        }
        .leaflet-container {
          font-family: system-ui, -apple-system, sans-serif;
        }
        .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: white;
          border-radius: 12px;
        }
        .leaflet-popup-tip {
          background: #1e293b;
        }
        .leaflet-tooltip {
          background: #1e293b;
          color: white;
          border: 1px solid #475569;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
        }
        .leaflet-tooltip-top:before {
          border-top-color: #1e293b;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Loading overlay */}
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
            <div className="text-white">Se încarcă harta...</div>
          </div>
        </div>
      )}
      
      {/* Floating info card */}
      <div className="absolute bottom-6 left-6 bg-slate-900/90 backdrop-blur-lg border border-slate-700 rounded-xl p-4 text-white z-[1000]">
        <div className="text-sm text-slate-400 mb-1">Total senzori vizibili</div>
        <div className="text-2xl">{sensors.length}</div>
      </div>

      {/* Map legend */}
      <div className="absolute top-6 right-6 bg-slate-900/90 backdrop-blur-lg border border-slate-700 rounded-xl p-4 z-[1000]">
        <div className="text-white mb-3">Categorii AQI</div>
        <div className="space-y-2">
          {Object.entries(useRiskZones ? RISK_ZONE_COLORS : AQI_COLORS).map(([category, color]) => (
            <div key={category} className="flex items-center gap-3 text-sm">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white shadow-md" 
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-300 whitespace-nowrap">
                {useRiskZones ? RISK_ZONE_LABELS[category as keyof typeof RISK_ZONE_LABELS] : AQI_LABELS[category as keyof typeof AQI_LABELS]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}