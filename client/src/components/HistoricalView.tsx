import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, ViewMode } from '../App';
import { 
  ArrowLeft, Calendar, TrendingUp, Wind, Download, 
  Filter, MapPin, Activity, BarChart3 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { generateHistoricalData, generateHourlyData, AQI_CATEGORIES, POLLUTANT_INFO } from '../utils/mockData';

interface HistoricalViewProps {
  user: User;
  onViewChange: (view: ViewMode) => void;
  onLogout: () => void;
}

export function HistoricalView({ user, onViewChange, onLogout }: HistoricalViewProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [selectedPollutant, setSelectedPollutant] = useState<'aqi' | 'pm25' | 'pm10' | 'o3' | 'no2'>('aqi');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('area');
  const [selectedArea, setSelectedArea] = useState('Piața Universității');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);

  const areas = [
    'Piața Universității', 'Piața Victoriei', 'Obor', 'Berceni',
    'Drumul Taberei', 'Titan', 'Floreasca', 'Cotroceni'
  ];

  useEffect(() => {
    const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
    setHistoricalData(generateHistoricalData('sensor-1', days));
    setHourlyData(generateHourlyData(new Date().toISOString().split('T')[0]));
  }, [timeRange, selectedArea]);

  const stats = {
    average: Math.round(historicalData.reduce((sum, d) => sum + d[selectedPollutant], 0) / historicalData.length || 0),
    max: Math.max(...historicalData.map(d => d[selectedPollutant])),
    min: Math.min(...historicalData.map(d => d[selectedPollutant])),
    trend: historicalData.length > 1 
      ? ((historicalData[historicalData.length - 1][selectedPollutant] - historicalData[0][selectedPollutant]) / historicalData[0][selectedPollutant] * 100).toFixed(1)
      : 0,
  };

  const ChartComponent = chartType === 'line' ? LineChart : chartType === 'bar' ? BarChart : AreaChart;
  const DataComponent = chartType === 'line' ? Line : chartType === 'bar' ? Bar : Area;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-lg border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onViewChange('map')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl text-white">Historical Analysis</h1>
                <p className="text-sm text-slate-400">Air Quality Trends & Patterns</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export Data</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls */}
          <div className="grid md:grid-cols-4 gap-4">
            {/* Area Selection */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <label className="block text-sm text-slate-400 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Urban Area
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <label className="block text-sm text-slate-400 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Time Range
              </label>
              <div className="flex gap-1">
                {(['day', 'week', 'month'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                      timeRange === range
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Pollutant */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <label className="block text-sm text-slate-400 mb-2">
                <Activity className="w-4 h-4 inline mr-1" />
                Indicator
              </label>
              <select
                value={selectedPollutant}
                onChange={(e) => setSelectedPollutant(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="aqi">AQI</option>
                <option value="pm25">PM2.5</option>
                <option value="pm10">PM10</option>
                <option value="o3">Ozone (O₃)</option>
                <option value="no2">NO₂</option>
              </select>
            </div>

            {/* Chart Type */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <label className="block text-sm text-slate-400 mb-2">
                <BarChart3 className="w-4 h-4 inline mr-1" />
                Chart Type
              </label>
              <div className="flex gap-1">
                {(['area', 'line', 'bar'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs transition-colors ${
                      chartType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: 'Average', value: stats.average, icon: Activity, color: 'blue' },
              { label: 'Maximum', value: stats.max, icon: TrendingUp, color: 'red' },
              { label: 'Minimum', value: stats.min, icon: Wind, color: 'emerald' },
              { label: 'Trend', value: `${stats.trend > 0 ? '+' : ''}${stats.trend}%`, icon: BarChart3, color: stats.trend > 0 ? 'red' : 'emerald' },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{stat.label}</span>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                </div>
                <div className="text-3xl text-white">{stat.value}</div>
                {selectedPollutant !== 'aqi' && (
                  <div className="text-xs text-slate-500 mt-1">
                    {POLLUTANT_INFO[selectedPollutant as keyof typeof POLLUTANT_INFO]?.unit}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Main Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl text-white mb-1">
                  {selectedPollutant === 'aqi' ? 'Air Quality Index' : POLLUTANT_INFO[selectedPollutant as keyof typeof POLLUTANT_INFO]?.name} Trend
                </h2>
                <p className="text-sm text-slate-400">
                  {selectedArea} - Last {timeRange === 'day' ? '24 hours' : timeRange === 'week' ? '7 days' : '30 days'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="text-sm text-slate-400">
                  {selectedPollutant.toUpperCase()}
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={400} minWidth={1} minHeight={1}>
              <ChartComponent data={historicalData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <DataComponent
                  type="monotone"
                  dataKey={selectedPollutant}
                  stroke="#a855f7"
                  fill={chartType === 'area' ? 'url(#colorGradient)' : '#a855f7'}
                  strokeWidth={2}
                  name={selectedPollutant.toUpperCase()}
                />
              </ChartComponent>
            </ResponsiveContainer>
          </motion.div>

          {/* Hourly Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6"
          >
            <div className="mb-6">
              <h2 className="text-xl text-white mb-1">24-Hour Distribution</h2>
              <p className="text-sm text-slate-400">Hourly pattern for today</p>
            </div>

            <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="aqi" fill="#a855f7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* AQI Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6"
          >
            <h2 className="text-xl text-white mb-4">Air Quality Distribution</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(AQI_CATEGORIES).map(([key, cat]) => {
                const count = historicalData.filter(d => {
                  const aqi = d.aqi;
                  const [min, max] = cat.range.includes('+') 
                    ? [301, 500]
                    : cat.range.split('-').map(Number);
                  return aqi >= min && aqi <= (max || 500);
                }).length;
                const percentage = ((count / historicalData.length) * 100).toFixed(0);

                return (
                  <div key={key} className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div 
                      className="w-full h-2 rounded-full mb-3"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="text-2xl text-white mb-1">{percentage}%</div>
                    <div className="text-xs text-slate-400">{cat.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{count} readings</div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-700/50 rounded-xl p-6"
          >
            <h2 className="text-xl text-white mb-4">AI-Generated Insights</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
                <p className="text-slate-300">
                  Air quality in {selectedArea} shows typical urban patterns with higher pollution during rush hours (7-9 AM, 5-7 PM).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
                <p className="text-slate-300">
                  PM2.5 levels are the primary contributor to AQI in this area, likely from vehicle emissions and industrial activity.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2" />
                <p className="text-slate-300">
                  Weekend measurements show approximately 20% improvement compared to weekday averages.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
