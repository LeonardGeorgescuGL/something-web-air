import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { User, ViewMode, Sensor } from '../types';
import { 
  LogOut, History, FileText, Wind, MapPin, Filter, 
  Info, X, TrendingUp, Activity, Layers, Database 
} from 'lucide-react';
import { generateSensorData, kMeansClustering, AQI_CATEGORIES, POLLUTANT_INFO } from '../utils/mockData';

interface MapDashboardProps {
  user: User;
  onViewChange: (view: ViewMode) => void;
  onLogout: () => void;
}

export function MapDashboard({ user, onViewChange, onLogout }: MapDashboardProps) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [clusterView, setClusterView] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    ANM: true,
    ANPM: true,
    'Civic Network': true,
  });
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    const data = generateSensorData();
    const clustered = kMeansClustering(data);
    setSensors(clustered);

    // Simulate real-time updates
    const interval = setInterval(() => {
      const updated = generateSensorData();
      const clusteredUpdated = kMeansClustering(updated);
      setSensors(clusteredUpdated);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const filteredSensors = sensors.filter(
    sensor => activeFilters[sensor.dataSource]
  );

  const averageAQI = Math.round(
    filteredSensors.reduce((sum, s) => sum + s.aqi, 0) / filteredSensors.length
  );

  const categoryStats = filteredSensors.reduce((acc, sensor) => {
    acc[sensor.category] = (acc[sensor.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-lg border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-white">AeroWatch Bucharest</h1>
              <p className="text-sm text-slate-400">Live Air Quality Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-slate-300">Live Data</span>
            </div>

            {user.type === 'community-member' && (
              <>
                <button
                  onClick={() => onViewChange('history')}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden md:inline">History</span>
                </button>
                <button
                  onClick={() => onViewChange('community')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden md:inline">Report Issue</span>
                </button>
              </>
            )}

            {user.type === 'visitor' && (
              <button
                onClick={() => onViewChange('history')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
                <span className="hidden md:inline">History</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-slate-900/50 border-r border-slate-800 p-6 overflow-y-auto">
          {/* City Overview */}
          <div className="mb-6">
            <h2 className="text-lg text-white mb-4">City Overview</h2>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="text-center mb-4">
                <div className="text-5xl text-white mb-2">{averageAQI}</div>
                <div className="text-sm text-slate-400">Average AQI</div>
              </div>
              <div 
                className="h-2 rounded-full mb-3"
                style={{ 
                  backgroundColor: AQI_CATEGORIES[
                    sensors.find(s => s.aqi === averageAQI)?.category || 'moderate'
                  ]?.color || '#eab308'
                }}
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Status:</span>
                <span className="text-white">
                  {AQI_CATEGORIES[sensors.find(s => s.aqi >= averageAQI)?.category || 'moderate']?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-white">Active Sensors</h2>
              <span className="text-2xl text-emerald-400">{filteredSensors.length}</span>
            </div>
            
            <div className="space-y-2">
              {Object.entries(categoryStats)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <div 
                    key={category}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: AQI_CATEGORIES[category as keyof typeof AQI_CATEGORIES]?.color }}
                      />
                      <span className="text-sm text-slate-300">
                        {AQI_CATEGORIES[category as keyof typeof AQI_CATEGORIES]?.label}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Data Source Filters */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg text-white">Data Sources</h2>
            </div>
            <div className="space-y-2">
              {Object.keys(activeFilters).map((source) => (
                <label 
                  key={source}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={activeFilters[source as keyof typeof activeFilters]}
                    onChange={(e) => setActiveFilters(prev => ({
                      ...prev,
                      [source]: e.target.checked
                    }))}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                  />
                  <span className="text-sm text-slate-300">{source}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    {sensors.filter(s => s.dataSource === source).length}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* View Controls */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg text-white">Map View</h2>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setClusterView(!clusterView)}
                className={`w-full p-3 rounded-lg text-sm transition-colors ${
                  clusterView 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                }`}
              >
                K-Means Clustering {clusterView ? '✓' : ''}
              </button>
              <button
                onClick={() => setShowLegend(!showLegend)}
                className={`w-full p-3 rounded-lg text-sm transition-colors ${
                  showLegend 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Show Legend {showLegend ? '✓' : ''}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Map Area */}
        <main className="flex-1 relative bg-slate-900">
          {/* Bucharest Map Simulation */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
            {/* Grid overlay to simulate map */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #475569 1px, transparent 1px),
                  linear-gradient(to bottom, #475569 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            />

            {/* Map Title */}
            <div className="absolute top-6 left-6 bg-slate-900/90 backdrop-blur-lg border border-slate-700 rounded-lg px-6 py-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-sm text-slate-400">Monitoring</div>
                  <div className="text-white">București, Romania</div>
                </div>
              </div>
            </div>

            {/* Sensor Markers */}
            <div className="absolute inset-0 p-20">
              {filteredSensors.map((sensor, idx) => {
                const category = AQI_CATEGORIES[sensor.category];
                // Position sensors in a grid pattern representing Bucharest
                const xPos = ((sensor.lng - 25.9) / (26.3 - 25.9)) * 100;
                const yPos = ((44.5 - sensor.lat) / (44.5 - 44.3)) * 100;

                return (
                  <motion.div
                    key={sensor.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="absolute cursor-pointer"
                    style={{
                      left: `${xPos}%`,
                      top: `${yPos}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => setSelectedSensor(sensor)}
                  >
                    {clusterView && (
                      <motion.div
                        className="absolute inset-0 rounded-full blur-2xl"
                        style={{ 
                          backgroundColor: category.color,
                          width: '80px',
                          height: '80px',
                          left: '-30px',
                          top: '-30px',
                        }}
                        animate={{
                          opacity: [0.2, 0.4, 0.2],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          delay: idx * 0.1
                        }}
                      />
                    )}
                    <motion.div
                      className="relative w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color }}
                      whileHover={{ scale: 1.3 }}
                      animate={{
                        boxShadow: [`0 0 0 0 ${category.color}80`, `0 0 0 10px ${category.color}00`]
                      }}
                      transition={{
                        boxShadow: { duration: 2, repeat: Infinity }
                      }}
                    >
                      <span className="text-xs text-white">{sensor.aqi}</span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <AnimatePresence>
              {showLegend && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute bottom-6 right-6 bg-slate-900/90 backdrop-blur-lg border border-slate-700 rounded-xl p-4 max-w-xs"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm text-white">AQI Scale</h3>
                    <button onClick={() => setShowLegend(false)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(AQI_CATEGORIES).map(([key, cat]) => (
                      <div key={key} className="flex items-center gap-3 text-xs">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-slate-300 flex-1">{cat.label}</span>
                        <span className="text-slate-500">{cat.range}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sensor Detail Panel */}
          <AnimatePresence>
            {selectedSensor && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto md:w-96 bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg text-white mb-1">Sensor {selectedSensor.id}</h3>
                    <p className="text-sm text-slate-400">
                      {selectedSensor.lat.toFixed(4)}, {selectedSensor.lng.toFixed(4)}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedSensor(null)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="mb-4 p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl text-white mb-1">{selectedSensor.aqi}</div>
                      <div className="text-sm text-slate-300">
                        {AQI_CATEGORIES[selectedSensor.category].label}
                      </div>
                    </div>
                    <div 
                      className="w-16 h-16 rounded-full"
                      style={{ backgroundColor: AQI_CATEGORIES[selectedSensor.category].color }}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <h4 className="text-sm text-slate-400 mb-2">Pollutant Levels</h4>
                  {Object.entries({
                    pm25: selectedSensor.pm25,
                    pm10: selectedSensor.pm10,
                    o3: selectedSensor.o3,
                    no2: selectedSensor.no2,
                    so2: selectedSensor.so2,
                    co: selectedSensor.co,
                  }).map(([key, value]) => {
                    const info = POLLUTANT_INFO[key as keyof typeof POLLUTANT_INFO];
                    return (
                      <div key={key} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                        <span className="text-sm text-slate-300">{info.name}</span>
                        <span className="text-sm text-white">{value} {info.unit}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Database className="w-4 h-4" />
                  <span>Source: {selectedSensor.dataSource}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
