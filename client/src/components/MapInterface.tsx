import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Layers, Filter, Menu, LogOut, Clock, AlertTriangle, ChevronRight, X } from 'lucide-react';
import { User, Sensor } from '../App';
import { generateMockSensors, AQI_COLORS, AQI_LABELS } from '../utils/mockData';
import { MapView } from './MapView';

interface MapInterfaceProps {
  user: User;
  onNavigate: (view: 'map' | 'history' | 'alerts') => void;
  onLogout: () => void;
}

export function MapInterface({ user, onNavigate, onLogout }: MapInterfaceProps) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [showClustering, setShowClustering] = useState(true);
  const [useRiskZones, setUseRiskZones] = useState(false); // New state for risk zones
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    setSensors(generateMockSensors());
  }, []);

  const filteredSensors = useMemo(() => {
    if (filterCategory === 'all') return sensors;
    return sensors.filter(s => s.category === filterCategory);
  }, [sensors, filterCategory]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {
      good: 0,
      moderate: 0,
      sensitive: 0,
      unhealthy: 0,
      'very-unhealthy': 0,
      hazardous: 0,
    };
    sensors.forEach(s => {
      stats[s.category]++;
    });
    return stats;
  }, [sensors]);

  const averageAQI = useMemo(() => {
    if (sensors.length === 0) return 0;
    const sum = sensors.reduce((acc, s) => acc + s.aqi, 0);
    return Math.round(sum / sensors.length);
  }, [sensors]);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Top Navigation Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl text-white">
            AirWatch <span className="text-cyan-400">București</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
            <span className="text-slate-400 text-sm">AQI mediu: </span>
            <span className="text-white">{averageAQI}</span>
          </div>
          {user.name && (
            <div className="text-slate-300">
              Bine ai venit, <span className="text-purple-400">{user.name}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Ieșire</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col z-10 overflow-hidden"
            >
              {/* Navigation */}
              <div className="p-4 border-b border-slate-700 flex-shrink-0">
                <nav className="space-y-2">
                  <button
                    onClick={() => onNavigate('map')}
                    className="w-full flex items-center gap-3 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-4 py-3 rounded-xl"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Hartă</span>
                  </button>
                  <button
                    onClick={() => onNavigate('history')}
                    className="w-full flex items-center gap-3 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-3 rounded-xl transition-colors"
                  >
                    <Clock className="w-5 h-5" />
                    <span>Istoric Date</span>
                  </button>
                  {user.type === 'community-member' && (
                    <button
                      onClick={() => onNavigate('alerts')}
                      className="w-full flex items-center gap-3 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-3 rounded-xl transition-colors"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <span>Alerte Comunitate</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto">
                {/* Clustering Toggle */}
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">Dispunere Zone</span>
                    <button
                      onClick={() => setUseRiskZones(!useRiskZones)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        useRiskZones ? 'bg-orange-500' : 'bg-slate-700'
                      }`}
                    >
                      <motion.div
                        animate={{ x: useRiskZones ? 24 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full"
                      />
                    </button>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    {useRiskZones 
                      ? 'Vizualizează clasificarea pe 3 zone de risc pentru sănătate' 
                      : 'Activează pentru a vedea zonele de risc'}
                  </p>
                  
                  {useRiskZones && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 pt-2 border-t border-slate-700"
                    >
                      {/* Risc Moderat */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-white font-medium text-sm">Risc Moderat</span>
                        </div>
                        <p className="text-slate-400 text-xs mb-2">
                          Calitate acceptabilă, dar persoanele sensibile pot avea simptome minore
                        </p>
                        <div className="text-xs text-slate-300">
                          <div className="font-medium text-yellow-400 mb-1">Grup de risc:</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-400">
                            <li>Copii cu astm bronșic</li>
                            <li>Persoane cu boli respiratorii cronice</li>
                          </ul>
                        </div>
                      </div>

                      {/* Risc Ridicat */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500" />
                          <span className="text-white font-medium text-sm">Risc Ridicat</span>
                        </div>
                        <p className="text-slate-400 text-xs mb-2">
                          Efecte adverse pentru grupurile sensibile. Limitați activitățile exterioare prelungite.
                        </p>
                        <div className="text-xs text-slate-300">
                          <div className="font-medium text-orange-400 mb-1">Grupuri de risc:</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-400">
                            <li>Copii și vârstnici</li>
                            <li>Persoane cu boli cardiovasculare</li>
                            <li>Astmatici și persoane cu BPOC</li>
                            <li>Femei însărcinate</li>
                          </ul>
                        </div>
                      </div>

                      {/* Risc Sever */}
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-red-600" />
                          <span className="text-white font-medium text-sm">Risc Sever</span>
                        </div>
                        <p className="text-slate-400 text-xs mb-2">
                          Pericol pentru sănătate! Evitați activitățile exterioare. Folosiți măști de protecție.
                        </p>
                        <div className="text-xs text-slate-300">
                          <div className="font-medium text-red-400 mb-1">Grupuri de risc major:</div>
                          <ul className="list-disc list-inside space-y-1 text-slate-400">
                            <li>Toată populația (inclusiv persoane sănătoase)</li>
                            <li>Risc extrem pentru copii și vârstnici</li>
                            <li>Boli respiratorii și cardiovasculare</li>
                            <li>Sistem imunitar compromis</li>
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Filter Button */}
                <div className="p-4 border-b border-slate-700">
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-750 text-white px-4 py-3 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Filter className="w-5 h-5" />
                      <span>Filtrare categorii</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform ${showFilterPanel ? 'rotate-90' : ''}`} />
                  </button>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                  {showFilterPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-b border-slate-700 overflow-hidden"
                    >
                      <div className="p-4 space-y-2">
                        <button
                          onClick={() => setFilterCategory('all')}
                          className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors ${
                            filterCategory === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <span>Toate</span>
                          <span className="text-sm">{sensors.length}</span>
                        </button>
                        {Object.entries(categoryStats).map(([category, count]) => (
                          <button
                            key={category}
                            onClick={() => setFilterCategory(category)}
                            className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors ${
                              filterCategory === category ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: AQI_COLORS[category as keyof typeof AQI_COLORS] }}
                              />
                              <span className="text-sm">{AQI_LABELS[category as keyof typeof AQI_LABELS]}</span>
                            </div>
                            <span className="text-sm">{count}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Stats */}
                <div className="flex-1 overflow-y-auto p-4">
                  <h3 className="text-white mb-3">Statistici în timp real</h3>
                  <div className="space-y-3">
                    <div className="bg-slate-800 rounded-xl p-4">
                      <div className="text-slate-400 text-sm mb-1">Total senzori activi</div>
                      <div className="text-2xl text-white">{sensors.length}</div>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4">
                      <div className="text-slate-400 text-sm mb-1">Zone urbane</div>
                      <div className="text-2xl text-white">6</div>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4">
                      <div className="text-slate-400 text-sm mb-1">AQI mediu</div>
                      <div className="text-2xl" style={{ color: AQI_COLORS[sensors.find(() => true)?.category || 'good'] }}>
                        {averageAQI}
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-6">
                    <h3 className="text-white mb-3">Legendă AQI</h3>
                    <div className="space-y-2">
                      {Object.entries(AQI_COLORS).map(([category, color]) => (
                        <div key={category} className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                          <span className="text-slate-300 text-sm">
                            {AQI_LABELS[category as keyof typeof AQI_LABELS]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapView
            sensors={filteredSensors}
            showClustering={showClustering}
            onSensorClick={setSelectedSensor}
            useRiskZones={useRiskZones}
          />

          {/* Sensor Detail Panel */}
          <AnimatePresence>
            {selectedSensor && (
              <motion.div
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                className="absolute top-4 right-4 w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-10"
              >
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 relative">
                  <button
                    onClick={() => setSelectedSensor(null)}
                    className="absolute top-4 right-4 text-white/80 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="text-white text-sm mb-2">Senzor {selectedSensor.id}</div>
                  <div className="text-4xl text-white mb-2">{selectedSensor.aqi}</div>
                  <div className="text-cyan-100">
                    {AQI_LABELS[selectedSensor.category]}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <div className="text-slate-400 text-sm mb-1">Sursă date</div>
                    <div className="text-white">{selectedSensor.dataSource}</div>
                  </div>

                  <div>
                    <div className="text-slate-400 text-sm mb-3">Indicatori poluanți</div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">PM2.5</span>
                        <span className="text-white">{selectedSensor.pm25} μg/m³</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">PM10</span>
                        <span className="text-white">{selectedSensor.pm10} μg/m³</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">NO₂</span>
                        <span className="text-white">{selectedSensor.no2} ppb</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">O₃</span>
                        <span className="text-white">{selectedSensor.o3} ppb</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">CO</span>
                        <span className="text-white">{selectedSensor.co} ppm</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">SO₂</span>
                        <span className="text-white">{selectedSensor.so2} ppb</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <div className="text-slate-400 text-sm mb-1">Cluster</div>
                    <div className="text-white">Zona {(selectedSensor.cluster || 0) + 1}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}