import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, AlertTriangle, Menu, LogOut, Calendar, TrendingUp, TrendingDown, Minus, Sparkles, Trophy } from 'lucide-react';
import { ComposedChart, Line, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { User, Sensor } from '../types';
import { generateMockSensors, generateHistoricalData, generateProphetPredictions, AQI_COLORS, AQI_LABELS } from '../utils/mockData';

interface HistoricalDataInterfaceProps {
  user: User;
  onNavigate: (view: 'map' | 'history' | 'alerts' | 'leaderboard') => void;
  onLogout: () => void;
}

// Tipul datei istorice normalizat pentru grafic
interface ChartPoint {
  date: string;
  aqi: number; pm25: number; pm10: number;
  no2: number; o3: number; co: number; so2: number;
  category: string;
}

export function HistoricalDataInterface({ user, onNavigate, onLogout }: HistoricalDataInterfaceProps) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [historicalData, setHistoricalData] = useState<ChartPoint[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  // Functie helper: converteste masuratori din backend in format grafic
  const convertMasuratoriToChart = (raw: any[]): ChartPoint[] => {
    return raw
      .filter(m => m.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(m => ({
        date: m.timestamp,
        aqi: m.aqi ?? 0,
        pm25: m.pm25 ?? 0,
        pm10: m.pm10 ?? 0,
        no2: m.no2 ?? 0,
        o3: m.o3 ?? 0,
        co: m.co ?? 0,
        so2: m.so2 ?? 0,
        category: m.aqi <= 50 ? 'good' : m.aqi <= 100 ? 'moderate' :
                  m.aqi <= 150 ? 'sensitive' : m.aqi <= 200 ? 'unhealthy' : 'very-unhealthy',
      }));
  };

  // Agreg datele orare in medii zilnice — graficul devine lizibil (30 puncte in loc de 720)
  const aggregateToDaily = (hourly: ChartPoint[]): ChartPoint[] => {
    const byDay: Record<string, ChartPoint[]> = {};
    for (const pt of hourly) {
      const day = pt.date.slice(0, 10); // "2024-04-27"
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(pt);
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, pts]) => {
        const avg = (key: keyof ChartPoint) =>
          Math.round((pts.reduce((s, p) => s + (Number(p[key]) || 0), 0) / pts.length) * 10) / 10;
        const avgAqi = avg('aqi');
        return {
          date: `${day}T12:00:00`,
          aqi: avgAqi,
          pm25: avg('pm25'),
          pm10: avg('pm10'),
          no2: avg('no2'),
          o3: avg('o3'),
          co: avg('co'),
          so2: avg('so2'),
          category: avgAqi <= 50 ? 'good' : avgAqi <= 100 ? 'moderate' :
                    avgAqi <= 150 ? 'sensitive' : avgAqi <= 200 ? 'unhealthy' : 'very-unhealthy',
        };
      });
  };

  const fetchSensors = async () => {
    try {
      const response = await fetch('/api/air-quality/sensors');
      if (response.ok) {
        const data = await response.json();
        setSensors(data);
      } else {
        throw new Error('Backend error');
      }
    } catch {
      setSensors(generateMockSensors());
    }
  };

  // Preia datele istorice pentru zona selectata (reale din DB, cu fallback mock)
  // Zonele in DB au id=2..7, selectedArea=0..5, deci offset +2
  const fetchHistorical = useCallback(async (areaId: number, days: number) => {
    setLoadingHistorical(true);
    const dbZoneId = areaId + 2; // 0→2, 1→3, ..., 5→7
    try {
      const res = await fetch(
        `/api/masuratori/zona/${dbZoneId}/zile/${days}`
      );
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length >= 7) {
          // Agreg datele orare → medii zilnice pentru grafic lizibil
          const daily = aggregateToDaily(convertMasuratoriToChart(raw));
          setHistoricalData(daily);
          setLoadingHistorical(false);
          return;
        }
      }
    } catch { /* fallback la mock */ }
    // Fallback: genereaza date mock daca DB e gol
    setHistoricalData(generateHistoricalData('mock-' + areaId, days) as any);
    setLoadingHistorical(false);
  }, []);

  useEffect(() => {
    fetchSensors();
  }, []);


  const [selectedArea, setSelectedArea] = useState<number>(0);
  const [selectedPollutant, setSelectedPollutant] = useState<'aqi' | 'pm25' | 'pm10' | 'no2' | 'o3' | 'co' | 'so2'>('aqi');
  const [showSidebar, setShowSidebar] = useState(true);
  const [predictionDays, setPredictionDays] = useState<1 | 3 | 7 | 14>(7);

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

  // Preia date reale din DB cand se schimba zona sau timeRange
  useEffect(() => {
    fetchHistorical(selectedArea, timeRange);
  }, [selectedArea, timeRange, fetchHistorical]);

  // selectedAreaData = date reale din DB (sau mock ca fallback)
  const selectedAreaData = historicalData;


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

  // ─── PROPHET REAL — din backend → ML Python ─────────────────────
  const [prophetForecast, setProphetForecast] = useState<any[]>([]);
  const [prophetMetrics, setProphetMetrics] = useState<any | null>(null);
  const [prophetLoading, setProphetLoading] = useState(false);
  const [prophetError, setProphetError] = useState<string | null>(null);

  const fetchProphet = useCallback(async (areaId: number, indicator: string, days: number) => {
    setProphetLoading(true);
    setProphetError(null);
    const dbZoneId = areaId + 2; // 0→2, 1→3, ..., 5→7
    try {
      const res = await fetch(
        `/api/prophet/predict/${dbZoneId}/${indicator}/${days}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setProphetForecast(data.forecast ?? []);
        setProphetMetrics(data.metrics ?? null);
      } else if (res.status === 507) {
        throw new Error('Date insuficiente în DB pentru această zonă. Serverul colectează date orar — revino mai târziu.');
      } else if (res.status === 503) {
        throw new Error('Microserviciul ML (Python) nu este pornit. Pornește serverul pentru predicții reale.');
      } else {
        throw new Error(`Eroare server (${res.status})`);
      }
    } catch (e: any) {
      setProphetError(e.message ?? 'Eroare la încărcare predicții');
      // Fallback la mock dacă backend nu răspunde
      if (selectedAreaData.length >= 7) {
        const mock = generateProphetPredictions(selectedAreaData, days as any);
        setProphetForecast(mock.map((p: any) => ({
          date: p.date,
          predicted: p[indicator] ?? p.aqi,
          lower: p.lowerBound,
          upper: p.upperBound,
          confidence: p.confidence,
        })));
      }
      setProphetMetrics(null);
    } finally {
      setProphetLoading(false);
    }
  }, [selectedAreaData]);

  // Refetch Prophet cand se schimba zona, indicatorul sau zilele de prognoza
  useEffect(() => {
    if (selectedAreaData.length >= 14) {
      fetchProphet(selectedArea, selectedPollutant, predictionDays);
    }
  }, [selectedArea, selectedPollutant, predictionDays, fetchProphet]);

  // Mapeaza predictiile Prophet in formatul graficului existent
  const predictions = useMemo(() => {
    return prophetForecast.map((p: any) => ({
      date: p.date,
      [selectedPollutant]: p.predicted,
      aqi: p.predicted, pm25: p.predicted, pm10: p.predicted,
      no2: p.predicted, o3: p.predicted, co: p.predicted, so2: p.predicted,
      lowerBound: p.lower,
      upperBound: p.upper,
      confidence: p.confidence,
    }));
  }, [prophetForecast, selectedPollutant]);

  // Combined data for chart (historical + predictions) mapped to separate keys
  const combinedChartData = useMemo(() => {
    if (predictions.length === 0) {
      return selectedAreaData.map(d => ({
        ...d,
        historical_value: d[selectedPollutant],
      }));
    }

    const historicalMapped = selectedAreaData.map(d => ({
      ...d,
      historical_value: d[selectedPollutant],
    }));

    const predictedMapped = predictions.map(d => ({
      ...d,
      predicted_value: d[selectedPollutant],
      prediction_lower: d.lowerBound,
      prediction_upper: d.upperBound,
    }));

    const lastHistorical = historicalMapped[historicalMapped.length - 1];
    const bridgePoint = {
      ...lastHistorical,
      predicted_value: lastHistorical.historical_value,
      prediction_lower: lastHistorical.historical_value,
      prediction_upper: lastHistorical.historical_value,
    };

    return [
      ...historicalMapped.slice(0, -1),
      bridgePoint,
      ...predictedMapped
    ];
  }, [selectedAreaData, predictions, selectedPollutant]);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Top Navigation */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between z-40 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl md:text-2xl text-white">
              AirWatch <span className="text-cyan-400">București</span>
            </h1>
            <div className="hidden md:block bg-purple-500/20 border border-purple-500/30 rounded-lg px-4 py-2">
              <span className="text-purple-400">Istoric Date</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="md:hidden flex items-center gap-2 text-red-400 px-2 py-1 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          {user.name && (
            <div className="text-slate-300 text-sm md:text-base truncate max-w-[150px] md:max-w-none">
              <span className="hidden md:inline">Bine ai venit, </span><span className="text-purple-400">{user.name}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="hidden md:flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-colors"
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
              className="absolute md:relative w-80 h-full bg-slate-900 border-r border-slate-700 flex flex-col z-[2000] shadow-2xl overflow-hidden"
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
                  <button
                    onClick={() => onNavigate('leaderboard')}
                    className="w-full flex items-center gap-3 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-3 rounded-xl transition-colors"
                  >
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span>Top Implicare</span>
                  </button>
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
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${selectedArea === area.id
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
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedPollutant === key
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
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
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${predictionDays === days
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
                <ComposedChart data={combinedChartData}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    interval="preserveStartEnd"
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      return d.toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis
                    stroke="#475569"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(v) => `${v}`}
                    label={{ value: pollutantLabels[selectedPollutant], angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, dy: 60 }}
                  />
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
                        const isPrediction = data.predicted_value !== undefined && data.historical_value === undefined;
                        const value = data.historical_value ?? data.predicted_value;
                        return (
                          <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 shadow-2xl">
                            <p className="text-slate-300 text-sm mb-2 font-medium">
                              {new Date(data.date).toLocaleDateString('ro-RO', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <p className={`text-2xl font-bold ${isPrediction ? 'text-cyan-400' : 'text-purple-400'}`}>
                              {value} {pollutantLabels[selectedPollutant]}
                            </p>
                            {isPrediction && data.prediction_lower !== undefined && (
                              <div className="mt-3 pt-3 border-t border-slate-700">
                                <p className="text-cyan-200/70 text-xs flex justify-between items-center mb-1">
                                  <span>Interval previzionat:</span>
                                  <span className="font-mono bg-cyan-500/10 px-2 py-0.5 rounded text-cyan-300">
                                    {data.prediction_lower} - {data.prediction_upper}
                                  </span>
                                </p>
                                <p className="text-slate-400 text-xs flex justify-between items-center">
                                  <span>Model ML:</span>
                                  <span className="text-slate-300">Facebook Prophet API</span>
                                </p>
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isPrediction ? 'bg-cyan-400 animate-pulse' : 'bg-purple-400'}`}></span>
                              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                                {isPrediction ? 'Prognoză Inteligentă' : 'Date Înregistrate'}
                              </p>
                            </div>
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
                    label={{ value: `Azi`, fill: '#ef4444', position: 'top', fontSize: 12, fontWeight: 'bold' }}
                  />
                  {/* Confidence Interval Area */}
                  <Area
                    type="monotone"
                    dataKey="prediction_upper"
                    stroke="none"
                    fill="url(#colorPrediction)"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="prediction_lower"
                    stroke="none"
                    fill="#020617" // hide the bottom part of area matches background roughly
                    fillOpacity={1}
                  />
                  {/* Historical data line */}
                  <Line
                    type="monotone"
                    dataKey="historical_value"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                  {/* Prediction line */}
                  <Line
                    type="monotone"
                    dataKey="predicted_value"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    dot={{ fill: '#06b6d4', r: 4, strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#06b6d4' }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* ─── Prophet Loading / Error ─── */}
              {prophetLoading && (
                <div className="mt-6 flex items-center gap-3 text-cyan-400 text-sm animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  Se antrenează modelul Facebook Prophet pe datele istorice...
                </div>
              )}
              {prophetError && (
                <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 text-orange-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {prophetError} — se folosesc predicții estimate.
                </div>
              )}

              {/* ─── METRICI MODEL FACEBOOK PROPHET ─── */}
              {prophetMetrics && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-white font-semibold">Evaluare Model Facebook Prophet</h3>
                    <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold border ${
                      prophetMetrics.quality_label === 'Excelent' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                      prophetMetrics.quality_label === 'Bun'      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' :
                      prophetMetrics.quality_label === 'Acceptabil' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' :
                      'bg-red-500/20 border-red-500/40 text-red-400'
                    }`}>
                      {prophetMetrics.quality_label} ({(prophetMetrics.quality_score * 100).toFixed(0)}%)
                    </span>
                  </div>

                  {/* Carduri metrici */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {/* MAE */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                          MAE
                        </div>
                        <div className="text-xl font-bold text-white">{prophetMetrics.mae}</div>
                      </div>
                      <div className="text-slate-500 text-[10px] mt-2 leading-tight">
                        Eroarea medie (abaterea) la fiecare predicție
                      </div>
                    </div>
                    {/* RMSE */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                          RMSE
                        </div>
                        <div className="text-xl font-bold text-white">{prophetMetrics.rmse}</div>
                      </div>
                      <div className="text-slate-500 text-[10px] mt-2 leading-tight">
                        Penalizează sever erorile mari de prognoză
                      </div>
                    </div>
                    {/* MAPE */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                          MAPE
                        </div>
                        <div className="text-xl font-bold text-white">{prophetMetrics.mape}%</div>
                      </div>
                      <div className="text-slate-500 text-[10px] mt-2 leading-tight">
                        În medie, predicția deviază cu {prophetMetrics.mape}%
                      </div>
                    </div>
                    {/* R² */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                          R²
                        </div>
                        <div className={`text-xl font-bold ${
                          prophetMetrics.r2 >= 0.85 ? 'text-emerald-400' :
                          prophetMetrics.r2 >= 0.70 ? 'text-cyan-400' :
                          prophetMetrics.r2 >= 0.50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {prophetMetrics.r2.toFixed(3)}
                        </div>
                      </div>
                      <div className="text-slate-500 text-[10px] mt-2 leading-tight">
                        Modelul explică {(prophetMetrics.r2 * 100).toFixed(0)}% din variația calității aerului
                      </div>
                    </div>
                  </div>

                  {/* Bara calitate model */}
                  <div className="bg-slate-800/40 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400 text-xs">Acuratețe model pe setul de test ({prophetMetrics.test_size} puncte)</span>
                      <span className="text-white text-xs font-medium">{(prophetMetrics.quality_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${prophetMetrics.quality_score * 100}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className={`h-2 rounded-full ${
                          prophetMetrics.quality_label === 'Excelent' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' :
                          prophetMetrics.quality_label === 'Bun'      ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                          prophetMetrics.quality_label === 'Acceptabil' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-orange-500 to-red-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <span>Antrenament: {prophetMetrics.train_size} puncte (80%)</span>
                      <span>Test: {prophetMetrics.test_size} puncte (20%)</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Predictions Cards */}
              {predictions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-white mb-4 text-sm font-medium">
                    Predicții următoarele {predictionDays} {predictionDays === 1 ? 'zi' : 'zile'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {predictions.map((pred, idx) => (
                      <div key={idx} className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 hover:border-cyan-500/30 transition-colors">
                        <div className="text-slate-400 text-xs mb-2">
                          {new Date(pred.date).toLocaleDateString('ro-RO', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-2xl text-cyan-400 font-bold">
                          {pred[selectedPollutant as keyof typeof pred]}
                        </div>
                        <div className="text-slate-500 text-xs mt-1">
                          {pred.lowerBound} — {pred.upperBound}
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 mt-3">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${pred.confidence * 100}%` }}
                          />
                        </div>
                        <div className="text-slate-500 text-xs mt-1">
                          Încredere: {(pred.confidence * 100).toFixed(0)}%
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
                          Astăzi ({new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })})
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
                      ? Math.round(selectedAreaData.reduce((acc, d) => acc + (d[key as keyof typeof d] as number), 0) / selectedAreaData.length * 10) / 10
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
