import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, AlertTriangle, Menu, LogOut, Calendar, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { User, Sensor } from '../App';
import { generateMockSensors, generateHistoricalData, generateProphetPredictions, AQI_COLORS, AQI_LABELS } from '../utils/mockData';

interface HistoricalDataInterfaceProps {
  user: User;
  onNavigate: (view: 'map' | 'history' | 'alerts') => void;
  onLogout: () => void;
}

export function HistoricalDataInterface({ user, onNavigate, onLogout }: HistoricalDataInterfaceProps) {
  const [sensors] = useState<Sensor[]>(generateMockSensors());
  const [selectedArea, setSelectedArea] = useState<number>(0);
  const [selectedPollutant, setSelectedPollutant] = useState<'aqi' | 'pm25' | 'pm10' | 'no2' | 'o3' | 'co' | 'so2'>('aqi');
  const [showSidebar, setShowSidebar] = useState(true);
  const [predictionDays, setPredictionDays] = useState<1 | 3 | 7 | 14>(7); // Updated to include 14 days (2 weeks)
  
  // Fixed time range - 30 days of historical data
  const timeRange = 30;

  const areas = [
    { id: 0, name: 'Centru', color: '#06b6d4' },
    { id: 1, name: 'Nord (Băneasa)', color: '#8b5cf6' },
    { id: 2, name: 'Sud (Berceni)', color: '#ec4899' },
    { id: 3, name: 'Est (Pantelimon)', color: '#f59e0b' },
    { id: 4, name: 'Vest (Militari)', color: '#10b981' },
    { id: 5, name: 'Sud-Est (Titan)', color: '#ef4444' },
  ];

  const selectedAreaData = useMemo(() => {
    const areaSensors = sensors.filter(s => s.cluster === selectedArea);
    if (areaSensors.length === 0) return [];
    
    const historicalData = generateHistoricalData(areaSensors[0].id, timeRange);
    return historicalData;
  }, [sensors, selectedArea, timeRange]);

  const pollutantLabels = {
    aqi: 'AQI',
    pm25: 'PM2.5 (μg/m³)',
    pm10: 'PM10 (μg/m³)',
    no2: 'NO₂ (ppb)',
    o3: 'O₃ (ppb)',
    co: 'CO (ppm)',
    so2: 'SO₂ (ppb)',
  };

  const currentAverage = useMemo(() => {
    if (selectedAreaData.length === 0) return 0;
    const sum = selectedAreaData.reduce((acc, d) => acc + d[selectedPollutant], 0);
    return Math.round(sum / selectedAreaData.length * 10) / 10;
  }, [selectedAreaData, selectedPollutant]);

  const trend = useMemo(() => {
    if (selectedAreaData.length < 2) return 0;
    const recent = selectedAreaData.slice(-7);
    const older = selectedAreaData.slice(-14, -7);
    
    const recentAvg = recent.reduce((acc, d) => acc + d[selectedPollutant], 0) / recent.length;
    const olderAvg = older.reduce((acc, d) => acc + d[selectedPollutant], 0) / older.length;
    
    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
  }, [selectedAreaData, selectedPollutant]);

  // Category distribution
  const categoryDistribution = useMemo(() => {
    const distribution: Record<string, number> = {
      good: 0,
      moderate: 0,
      sensitive: 0,
      unhealthy: 0,
      'very-unhealthy': 0,
      hazardous: 0,
    };
    
    selectedAreaData.forEach(d => {
      distribution[d.category]++;
    });

    return Object.entries(distribution)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        name: AQI_LABELS[category as keyof typeof AQI_LABELS],
        value: count,
        color: AQI_COLORS[category as keyof typeof AQI_COLORS],
      }));
  }, [selectedAreaData]);

  // Predictions using Facebook Prophet algorithm
  const predictions = useMemo(() => {
    if (selectedAreaData.length < 7) return [];
    return generateProphetPredictions(selectedAreaData, predictionDays);
  }, [selectedAreaData, predictionDays]);

  // Combined data for chart (historical + predictions)
  const combinedChartData = useMemo(() => {
    if (predictions.length === 0) return selectedAreaData;
    return [...selectedAreaData, ...predictions];
  }, [selectedAreaData, predictions]);

  // Create prediction data that includes the bridge point from historical data
  const predictionDataWithBridge = useMemo(() => {
    if (predictions.length === 0 || selectedAreaData.length === 0) return [];
    // Add the last historical point as the first point of prediction to create connection
    const lastHistoricalPoint = selectedAreaData[selectedAreaData.length - 1];
    return [lastHistoricalPoint, ...predictions];
  }, [predictions, selectedAreaData]);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Top Navigation */}
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
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-4 py-2">
            <span className="text-purple-400">Istoric Date</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user.name && (
            <div className="text-slate-300">
              <span className="text-purple-400">{user.name}</span>
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
              className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col z-10"
            >
              {/* Navigation */}
              <div className="p-4 border-b border-slate-700">
                <nav className="space-y-2">
                  <button
                    onClick={() => onNavigate('map')}
                    className="w-full flex items-center gap-3 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-3 rounded-xl transition-colors"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Hartă</span>
                  </button>
                  <button
                    onClick={() => onNavigate('history')}
                    className="w-full flex items-center gap-3 bg-purple-500/20 border border-purple-500/30 text-purple-400 px-4 py-3 rounded-xl"
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

              {/* Area Selection */}
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-white mb-3">Selectează zona urbană</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {areas.map(area => (
                    <button
                      key={area.id}
                      onClick={() => setSelectedArea(area.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        selectedArea === area.id
                          ? 'bg-slate-800 text-white border border-slate-600'
                          : 'text-slate-400 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color }} />
                      <span>{area.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pollutant Selection */}
              <div className="p-4 overflow-y-auto">
                <h3 className="text-white mb-3">Indicator poluant</h3>
                <div className="space-y-2">
                  {Object.entries(pollutantLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedPollutant(key as any)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedPollutant === key
                          ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                          : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-6 h-6 text-purple-400" />
                  <span className="text-slate-400">Perioada analizată</span>
                </div>
                <div className="text-3xl text-white">{timeRange} zile</div>
                <div className="text-slate-500 text-sm mt-1">
                  {selectedAreaData.length} măsurători
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Minus className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-slate-400">Medie {pollutantLabels[selectedPollutant]}</span>
                </div>
                <div className="text-3xl text-white">{currentAverage}</div>
                <div className="text-slate-500 text-sm mt-1">
                  Ultimele {timeRange} zile
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  {trend > 0 ? (
                    <TrendingUp className="w-6 h-6 text-red-400" />
                  ) : trend < 0 ? (
                    <TrendingDown className="w-6 h-6 text-green-400" />
                  ) : (
                    <Minus className="w-6 h-6 text-slate-400" />
                  )}
                  <span className="text-slate-400">Trend săptămânal</span>
                </div>
                <div className={`text-3xl ${trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-slate-400'}`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </div>
                <div className="text-slate-500 text-sm mt-1">
                  Față de săptămâna trecută
                </div>
              </motion.div>
            </div>

            {/* Main Chart with Predictions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-xl text-white">
                    Evoluție & Predicții {pollutantLabels[selectedPollutant]} - {areas.find(a => a.id === selectedArea)?.name}
                  </h2>
                </div>
                {/* Prediction Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">Predicție:</span>
                  {[1, 3, 7, 14].map(days => (
                    <button
                      key={days}
                      onClick={() => setPredictionDays(days as 1 | 3 | 7 | 14)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        predictionDays === days
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {days}z
                    </button>
                  ))}
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={combinedChartData}>
                  <defs>
                    <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const isPrediction = data.isPrediction;
                        return (
                          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3">
                            <p className="text-slate-300 text-sm mb-1">
                              {new Date(data.date).toLocaleDateString('ro-RO', { 
                                month: 'long', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <p className={`text-lg font-bold ${isPrediction ? 'text-cyan-400' : 'text-purple-400'}`}>
                              {data[selectedPollutant]} {pollutantLabels[selectedPollutant]}
                            </p>
                            {isPrediction && (
                              <>
                                <p className="text-slate-400 text-xs mt-1">
                                  Interval: {data.lowerBound} - {data.upperBound}
                                </p>
                                <p className="text-slate-400 text-xs">
                                  Confidence: {(data.confidence * 100).toFixed(0)}%
                                </p>
                              </>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                              {isPrediction ? '📊 Predicție' : '📈 Istoric'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    x={selectedAreaData[selectedAreaData.length - 1]?.date}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    label={{ value: 'Azi (7 Feb 2026)', fill: '#ef4444', position: 'top', fontSize: 14, fontWeight: 'bold' }}
                  />
                  {/* Historical data line */}
                  <Line
                    type="monotone"
                    dataKey={selectedPollutant}
                    data={selectedAreaData}
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                  {/* Prediction line - continues from last historical point */}
                  <Line
                    type="monotone"
                    dataKey={selectedPollutant}
                    data={predictionDataWithBridge}
                    stroke="#06b6d4"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={{ fill: '#06b6d4', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Predictions Stats */}
              {predictions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-white mb-4 text-sm font-medium">
                    Predicții următoarele {predictionDays} {predictionDays === 1 ? 'zi' : 'zile'}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {predictions.map((pred, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded-lg p-4">
                        <div className="text-slate-400 text-sm mb-1">
                          {new Date(pred.date).toLocaleDateString('ro-RO', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-2xl text-cyan-400 font-bold">
                          {pred[selectedPollutant]}
                        </div>
                        <div className="text-slate-500 text-xs mt-1">
                          Range: {pred.lowerBound} - {pred.upperBound}
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
                          <div
                            className="bg-cyan-500 h-1 rounded-full"
                            style={{ width: `${pred.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Comparison Table - Predictions for all pollutants */}
            {predictions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6"
              >
                <h3 className="text-xl text-white mb-6 flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                  Tabel Comparativ - Predicții vs Valori Curente
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-400 pb-3 px-4">Data</th>
                        <th className="text-center text-slate-400 pb-3 px-4">AQI</th>
                        <th className="text-center text-slate-400 pb-3 px-4">PM2.5</th>
                        <th className="text-center text-slate-400 pb-3 px-4">PM10</th>
                        <th className="text-center text-slate-400 pb-3 px-4">NO₂</th>
                        <th className="text-center text-slate-400 pb-3 px-4">O₃</th>
                        <th className="text-center text-slate-400 pb-3 px-4">CO</th>
                        <th className="text-center text-slate-400 pb-3 px-4">SO₂</th>
                        <th className="text-center text-slate-400 pb-3 px-4">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Current (Today) */}
                      <tr className="border-b border-slate-700/50 bg-purple-500/10">
                        <td className="py-3 px-4 text-purple-400 font-medium">
                          Astăzi (7 Feb 2026)
                        </td>
                        <td className="text-center py-3 px-4 text-white font-bold">
                          {selectedAreaData[selectedAreaData.length - 1]?.aqi}
                        </td>
                        <td className="text-center py-3 px-4 text-white">
                          {selectedAreaData[selectedAreaData.length - 1]?.pm25}
                        </td>
                        <td className="text-center py-3 px-4 text-white">
                          {selectedAreaData[selectedAreaData.length - 1]?.pm10}
                        </td>
                        <td className="text-center py-3 px-4 text-white">
                          {selectedAreaData[selectedAreaData.length - 1]?.no2}
                        </td>
                        <td className="text-center py-3 px-4 text-white">
                          {selectedAreaData[selectedAreaData.length - 1]?.o3}
                        </td>
                        <td className="text-center py-3 px-4 text-white">
                          {selectedAreaData[selectedAreaData.length - 1]?.co}
                        </td>
                        <td className="text-center py-3 px-4 text-white">
                          {selectedAreaData[selectedAreaData.length - 1]?.so2}
                        </td>
                        <td className="text-center py-3 px-4 text-slate-400 text-xs">
                          Actual
                        </td>
                      </tr>
                      {/* Predictions */}
                      {predictions.map((pred, idx) => (
                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-cyan-400">
                            {new Date(pred.date).toLocaleDateString('ro-RO', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="text-center py-3 px-4 text-cyan-300 font-bold">
                            {pred.aqi}
                            <div className="text-xs text-slate-500">
                              {pred.lowerBound}-{pred.upperBound}
                            </div>
                          </td>
                          <td className="text-center py-3 px-4 text-cyan-300">
                            {pred.pm25}
                          </td>
                          <td className="text-center py-3 px-4 text-cyan-300">
                            {pred.pm10}
                          </td>
                          <td className="text-center py-3 px-4 text-cyan-300">
                            {pred.no2}
                          </td>
                          <td className="text-center py-3 px-4 text-cyan-300">
                            {pred.o3}
                          </td>
                          <td className="text-center py-3 px-4 text-cyan-300">
                            {pred.co}
                          </td>
                          <td className="text-center py-3 px-4 text-cyan-300">
                            {pred.so2}
                          </td>
                          <td className="text-center py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-700 rounded-full h-1.5">
                                <div
                                  className="bg-cyan-500 h-1.5 rounded-full"
                                  style={{ width: `${pred.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400">
                                {(pred.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Secondary Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6"
              >
                <h3 className="text-lg text-white mb-6">Distribuție categorii AQI</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* All Pollutants Comparison */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6"
              >
                <h3 className="text-lg text-white mb-6">Comparație poluanți (medie)</h3>
                <div className="space-y-4">
                  {Object.entries(pollutantLabels).map(([key, label]) => {
                    const avg = selectedAreaData.length > 0
                      ? Math.round(selectedAreaData.reduce((acc, d) => acc + d[key as keyof typeof d], 0) / selectedAreaData.length * 10) / 10
                      : 0;
                    const maxValue = key === 'aqi' ? 200 : key === 'co' ? 5 : 150;
                    const percentage = Math.min((avg / maxValue) * 100, 100);

                    return (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-300 text-sm">{label}</span>
                          <span className="text-white">{avg}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}