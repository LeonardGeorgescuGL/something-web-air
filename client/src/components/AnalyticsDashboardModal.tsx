import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';

interface AnalyticsDashboardModalProps {
  onClose: () => void;
}

const COLORS = ['#00ff88', '#00d4ff', '#f87171', '#fbbf24', '#c084fc', '#e879f9'];

export function AnalyticsDashboardModal({ onClose }: AnalyticsDashboardModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/chestionare/analytics');
        if (!response.ok) throw new Error('Nu s-au putut încărca datele');
        const json = await response.json();
        
        // Sortează calitatea aerului în ordinea logică a intensității
        const orderMap: Record<string, number> = {
          'Foarte bună': 1, 'Bună': 2, 'Acceptabilă': 3, 
          'Slabă': 4, 'Foarte slabă': 5, 'Periculoasă': 6
        };
        if (json.calitateDistributie) {
          json.calitateDistributie.sort((a: any, b: any) => 
            (orderMap[a.name] || 99) - (orderMap[b.name] || 99)
          );
        }
        
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (!data && !loading) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
      >
        <div className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-slate-700 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl text-white font-semibold">
            📊 Analitici Comunitate <span className="text-cyan-400">AirWatch</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
              <p className="text-slate-400">Se procesează datele comunității...</p>
            </div>
          ) : error ? (
            <div className="text-red-400 text-center p-8 bg-red-500/10 rounded-xl">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* 1. PIE CHART — Distribuția calității aerului raportate */}
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-slate-300 font-medium mb-6">Distribuția Calității Aerului Raportată</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                      <Pie
                        data={data.calitateDistributie}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80}
                        paddingAngle={5} dataKey="value" nameKey="name"
                      >
                        {data.calitateDistributie.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} 
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: number) => [value, 'Rapoarte']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. BAR CHART orizontal — Top zone urbane cu cele mai multe rapoarte */}
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-slate-300 font-medium mb-6">Top Zone Raportate</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart data={data.topZone} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis 
                        dataKey="zona" 
                        type="category" 
                        stroke="#94a3b8" 
                        width={160} 
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} 
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: number) => [value, 'Rapoarte']}
                      />
                      <Bar dataKey="rapoarte" radius={[0, 4, 4, 0]}>
                        {data.topZone.map((entry: any, index: number) => {
                          // Gradient based on calitateMedia: < 2.5 (Verde), < 4 (Galben), >=4 (Rosu)
                          let color = '#00ff88';
                          if (entry.calitateMedia >= 4) color = '#f87171';
                          else if (entry.calitateMedia >= 2.5) color = '#fbbf24';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. BAR CHART vertical — Distribuția surselor de poluare */}
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-slate-300 font-medium mb-6">Surse de Poluare Identificate</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart data={data.sursePoluare}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis 
                        dataKey="sursa" 
                        stroke="#94a3b8" 
                        tick={{ fontSize: 9 }}
                        interval={0}
                      />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} 
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: number) => [value, 'Rapoarte']}
                      />
                      <Bar dataKey="count" name="Rapoarte" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 4. LINE CHART — Evoluție temporală a rapoartelor */}
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-slate-300 font-medium mb-6">Evoluție Rapoarte (30 zile)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <LineChart data={data.evolutieZilnica}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="data" stroke="#94a3b8" 
                             tickFormatter={(val) => {
                               const d = new Date(val);
                               return `${d.getDate()}/${d.getMonth()+1}`;
                             }} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} 
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: number) => [value, 'Rapoarte']}
                      />
                      <Line type="monotone" dataKey="rapoarte" stroke="#c084fc" strokeWidth={3} dot={{ r: 4, fill: '#c084fc' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 5. PIE CHART — Distribuția simptomelor fizice raportate */}
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-slate-300 font-medium mb-6">Simptome Fizice Raportate</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                      <Pie
                        data={data.simptomeDistributie}
                        cx="50%" cy="50%"
                        outerRadius={80}
                        dataKey="count" nameKey="simptom" label
                      >
                        {data.simptomeDistributie.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} 
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: number) => [value, 'Rapoarte']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 6. BAR CHART — Rapoarte per moment al zilei */}
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-slate-300 font-medium mb-6">Rapoarte în funcție de Momentul Zilei</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart data={data.rapoartePeMoment}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="moment" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} 
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: number) => [value, 'Rapoarte']}
                      />
                      <Bar dataKey="count" name="Rapoarte" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
