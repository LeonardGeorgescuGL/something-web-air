import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, AlertTriangle, Menu, LogOut, Camera, MapPinned, FileText, ClipboardList, Upload, Send, CheckCircle2, Image as ImageIcon, Trophy, BarChart3 } from 'lucide-react';
import type { User, UrbanArea } from '../types';
import { AnalyticsDashboardModal } from './AnalyticsDashboardModal';

interface CommunityAlertInterfaceProps {
  user: User;
  onNavigate: (view: 'map' | 'history' | 'alerts' | 'leaderboard') => void;
  onLogout: () => void;
}

type AlertType = 'text' | 'photo' | 'geojson' | 'questionnaire';

interface QuestionnaireData {
  airQuality: string;
  visibility: string;
  smell: string;
  symptoms: string[];
  sources: string[];
  timeOfDay: string;
  duration: string;
  additionalNotes: string;
}

export function CommunityAlertInterface({ user, onNavigate, onLogout }: CommunityAlertInterfaceProps) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedType, setSelectedType] = useState<AlertType>('text');
  const [submitted, setSubmitted] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Urban Areas
  const [urbanAreas, setUrbanAreas] = useState<UrbanArea[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | ''>('');

  React.useEffect(() => {
    fetch('/api/urban-areas')
      .then(res => res.json())
      .then(data => setUrbanAreas(data))
      .catch(console.error);
  }, []);

  // Text report state
  const [textReport, setTextReport] = useState('');
  const [location, setLocation] = useState('');

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [photoLocation, setPhotoLocation] = useState({ lat: '', lng: '' });

  // GeoJSON state
  const [geojsonFile, setGeojsonFile] = useState<File | null>(null);
  const [geojsonDescription, setGeojsonDescription] = useState('');

  // Questionnaire state
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({
    airQuality: '',
    visibility: '',
    smell: '',
    symptoms: [],
    sources: [],
    timeOfDay: '',
    duration: '',
    additionalNotes: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let titlu = '';
      let continut = '';

      if (selectedType === 'text') {
        titlu = `Raport text - ${location}`;
        continut = textReport;
      } else if (selectedType === 'photo') {
        titlu = `Fotografie geo-tagged - ${photoLocation.lat}, ${photoLocation.lng}`;
        continut = photoDescription + (photoFile ? ` | Fisier: ${photoFile.name}` : '');
      } else if (selectedType === 'geojson') {
        titlu = `Date GeoJSON`;
        continut = geojsonDescription + (geojsonFile ? ` | Fisier: ${geojsonFile.name}` : '');
      } else if (selectedType === 'questionnaire') {
        if (!selectedZoneId) {
          setError('Te rugăm să selectezi zona în care te afli.');
          setIsLoading(false);
          return;
        }
        titlu = `Chestionar calitate aer`;
        continut = JSON.stringify(questionnaire);
      }

      const tipMap: Record<string, string> = {
        text: 'TEXT',
        photo: 'FOTO',
        geojson: 'GEO_JSON',
        questionnaire: 'CHESTIONAR',
      };

      const payload: any = {
        titlu,
        tip: tipMap[selectedType],
        continut,
        dataEmitere: new Date().toISOString(),
        membruId: user.id || null,
      };

      // daca e raport foto, trimitem si coordonatele GPS si numele fisierului
      if (selectedType === 'photo') {
        payload.lat = photoLocation.lat ? parseFloat(photoLocation.lat) : null;
        payload.lng = photoLocation.lng ? parseFloat(photoLocation.lng) : null;
        payload.fotografie = photoFile ? photoFile.name : null;
      }

      if (selectedZoneId) {
        payload.zonaUrbana = { id: Number(selectedZoneId) };
      }

      await fetch('/api/rapoarte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setTextReport('');
        setLocation('');
        setPhotoFile(null);
        setPhotoDescription('');
        setPhotoLocation({ lat: '', lng: '' });
        setGeojsonFile(null);
        setGeojsonDescription('');
        setQuestionnaire({
          airQuality: '', visibility: '', smell: '',
          symptoms: [], sources: [], timeOfDay: '', duration: '', additionalNotes: '',
        });
        setSelectedZoneId('');
      }, 3000);
    } catch (err) {
      setError('Eroare la trimiterea raportului. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };


  const alertTypes = [
    {
      type: 'text' as AlertType,
      icon: FileText,
      title: 'Raport Text',
      description: 'Raportează irregularități observate',
      color: 'blue',
    },
    {
      type: 'photo' as AlertType,
      icon: Camera,
      title: 'Fotografie Geo-tagged',
      description: 'Încarcă fotografii cu locație',
      color: 'purple',
    },
    {
      type: 'geojson' as AlertType,
      icon: MapPinned,
      title: 'Date GeoJSON',
      description: 'Împarte zone poluate',
      color: 'pink',
    },
    {
      type: 'questionnaire' as AlertType,
      icon: ClipboardList,
      title: 'Chestionar',
      description: 'Descrie zona observată',
      color: 'cyan',
    },
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      hover: 'hover:border-blue-500/60',
      button: 'bg-blue-500 hover:bg-blue-600',
    },
    purple: {
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      hover: 'hover:border-purple-500/60',
      button: 'bg-purple-500 hover:bg-purple-600',
    },
    pink: {
      bg: 'bg-pink-500/20',
      border: 'border-pink-500/30',
      text: 'text-pink-400',
      hover: 'hover:border-pink-500/60',
      button: 'bg-pink-500 hover:bg-pink-600',
    },
    cyan: {
      bg: 'bg-cyan-500/20',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      hover: 'hover:border-cyan-500/60',
      button: 'bg-cyan-500 hover:bg-cyan-600',
    },
  };

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
            <div className="hidden md:block bg-orange-500/20 border border-orange-500/30 rounded-lg px-4 py-2">
              <span className="text-orange-400">Alerte Comunitate</span>
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
              <div className="p-4 border-b border-slate-700 flex-shrink-0">
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
                    className="w-full flex items-center gap-3 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-3 rounded-xl transition-colors"
                  >
                    <Clock className="w-5 h-5" />
                    <span>Istoric Date</span>
                  </button>
                  <button
                    onClick={() => onNavigate('alerts')}
                    className="w-full flex items-center gap-3 bg-orange-500/20 border border-orange-500/30 text-orange-400 px-4 py-3 rounded-xl"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    <span>Alerte Comunitate</span>
                  </button>
                  <button
                    onClick={() => onNavigate('leaderboard')}
                    className="w-full flex items-center gap-3 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-3 rounded-xl transition-colors"
                  >
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span>Top Implicare</span>
                  </button>
                </nav>
              </div>

              {/* Alert Type Selection */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-white mb-4">Tipuri de alertă</h3>
                <div className="space-y-3">
                  {alertTypes.map(({ type, icon: Icon, title, description, color }) => {
                    const classes = colorClasses[color as keyof typeof colorClasses];
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedType === type
                            ? `${classes.bg} ${classes.border} border-2`
                            : 'border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`${classes.bg} p-2 rounded-lg`}>
                            <Icon className={`w-5 h-5 ${classes.text}`} />
                          </div>
                          <div className="flex-1">
                            <div className={selectedType === type ? classes.text : 'text-white'}>
                              {title}
                            </div>
                            <div className="text-slate-400 text-sm mt-1">{description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-blue-400 mb-1">Contribuția ta contează!</div>
                      <p className="text-slate-400 text-sm">
                        Alertele comunității ajută la identificarea rapidă a zonelor problematice și la îmbunătățirea calității aerului în București.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-center min-h-[600px]"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    >
                      <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-6" />
                    </motion.div>
                    <h2 className="text-3xl text-white mb-4">Alertă trimisă cu succes!</h2>
                    <p className="text-slate-400 text-lg">
                      Mulțumim pentru contribuția ta la îmbunătățirea calității aerului în București.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {/* Eroare API */}
                  {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Text Report Form */}
                  {selectedType === 'text' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="bg-blue-500/20 p-4 rounded-2xl">
                            <FileText className="w-8 h-8 text-blue-400" />
                          </div>
                          <div>
                            <h2 className="text-2xl text-white">Raport Text</h2>
                            <p className="text-slate-400">Descrie irregularitățile observate</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-slate-300 mb-2">Locație</label>
                            <input
                              type="text"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="Ex: Piața Unirii, Sector 3"
                              required
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-2">Descriere problemă</label>
                            <textarea
                              value={textReport}
                              onChange={(e) => setTextReport(e.target.value)}
                              placeholder="Descrie în detaliu irregularitățile observate..."
                              required
                              rows={8}
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                            />
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                            <Send className="w-5 h-5" />
                            <span>Trimite raport</span>
                          </motion.button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Photo Upload Form */}
                  {selectedType === 'photo' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="bg-purple-500/20 p-4 rounded-2xl">
                            <Camera className="w-8 h-8 text-purple-400" />
                          </div>
                          <div>
                            <h2 className="text-2xl text-white">Fotografie Geo-tagged</h2>
                            <p className="text-slate-400">Încarcă imagini cu coordonate GPS</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-slate-300 mb-2">Încarcă fotografie</label>
                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="photo-upload"
                                required
                              />
                              <label htmlFor="photo-upload" className="cursor-pointer">
                                {photoFile ? (
                                  <div className="text-purple-400">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-3" />
                                    <p>{photoFile.name}</p>
                                  </div>
                                ) : (
                                  <div className="text-slate-400">
                                    <Upload className="w-12 h-12 mx-auto mb-3" />
                                    <p>Click pentru a încărca fotografie</p>
                                    <p className="text-sm mt-2">JPG, PNG, max 10MB</p>
                                  </div>
                                )}
                              </label>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-slate-300 mb-2">Latitudine</label>
                              <input
                                type="text"
                                value={photoLocation.lat}
                                onChange={(e) => setPhotoLocation({ ...photoLocation, lat: e.target.value })}
                                placeholder="44.4268"
                                required
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 mb-2">Longitudine</label>
                              <input
                                type="text"
                                value={photoLocation.lng}
                                onChange={(e) => setPhotoLocation({ ...photoLocation, lng: e.target.value })}
                                placeholder="26.1025"
                                required
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-2">Descriere</label>
                            <textarea
                              value={photoDescription}
                              onChange={(e) => setPhotoDescription(e.target.value)}
                              placeholder="Descrie ce se vede în fotografie..."
                              required
                              rows={4}
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                            />
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                            <Send className="w-5 h-5" />
                            <span>Trimite fotografie</span>
                          </motion.button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* GeoJSON Upload Form */}
                  {selectedType === 'geojson' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="bg-pink-500/20 p-4 rounded-2xl">
                            <MapPinned className="w-8 h-8 text-pink-400" />
                          </div>
                          <div>
                            <h2 className="text-2xl text-white">Date GeoJSON</h2>
                            <p className="text-slate-400">Împarte date geografice despre zone poluate</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-slate-300 mb-2">Încarcă fișier GeoJSON</label>
                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-pink-500/50 transition-colors">
                              <input
                                type="file"
                                accept=".geojson,.json"
                                onChange={(e) => setGeojsonFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="geojson-upload"
                                required
                              />
                              <label htmlFor="geojson-upload" className="cursor-pointer">
                                {geojsonFile ? (
                                  <div className="text-pink-400">
                                    <MapPinned className="w-12 h-12 mx-auto mb-3" />
                                    <p>{geojsonFile.name}</p>
                                  </div>
                                ) : (
                                  <div className="text-slate-400">
                                    <Upload className="w-12 h-12 mx-auto mb-3" />
                                    <p>Click pentru a încărca fișier GeoJSON</p>
                                    <p className="text-sm mt-2">.geojson, .json</p>
                                  </div>
                                )}
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-2">Descriere zone</label>
                            <textarea
                              value={geojsonDescription}
                              onChange={(e) => setGeojsonDescription(e.target.value)}
                              placeholder="Descrie zonele marcate în fișierul GeoJSON..."
                              required
                              rows={6}
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                            />
                          </div>

                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                            <p className="text-slate-300 text-sm">
                              <strong className="text-blue-400">Sfat:</strong> Poți crea fișiere GeoJSON folosind instrumente precum geojson.io sau QGIS pentru a marca precis zonele poluate.
                            </p>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                            <Send className="w-5 h-5" />
                            <span>Trimite date GeoJSON</span>
                          </motion.button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Questionnaire Form */}
                  {selectedType === 'questionnaire' && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="bg-cyan-500/20 p-4 rounded-2xl">
                            <ClipboardList className="w-8 h-8 text-cyan-400" />
                          </div>
                          <div>
                            <h2 className="text-2xl text-white">Chestionar observații</h2>
                            <p className="text-slate-400">Descrie zona pe care o observi</p>
                          </div>
                        </div>

                        {/* Zone Selector */}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                          <label className="block text-slate-300 mb-2 font-medium">📍 Unde te afli? Selectează zona *</label>
                          <select
                            required
                            value={selectedZoneId}
                            onChange={(e) => setSelectedZoneId(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                          >
                            <option value="" disabled>Selectează o zonă...</option>
                            {urbanAreas.map((ua) => (
                              <option key={ua.id} value={ua.id}>{ua.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-slate-300 mb-3 font-medium">Cum apreciezi calitatea aerului?</label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                              {['Foarte bună', 'Bună', 'Acceptabilă', 'Slabă', 'Foarte slabă', 'Periculoasă'].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setQuestionnaire({ ...questionnaire, airQuality: option })}
                                  className={`px-4 py-3 rounded-xl transition-colors ${
                                    questionnaire.airQuality === option
                                      ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400'
                                      : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-3 font-medium">Vizibilitate</label>
                            <div className="grid grid-cols-3 gap-3">
                              {['Excelentă', 'Bună', 'Redusă'].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setQuestionnaire({ ...questionnaire, visibility: option })}
                                  className={`px-4 py-3 rounded-xl transition-colors ${
                                    questionnaire.visibility === option
                                      ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400'
                                      : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-3 font-medium">Mirosuri neplăcute?</label>
                            <div className="grid grid-cols-2 gap-3">
                              {['Fără miros', 'Miros ușor', 'Miros moderat', 'Miros puternic'].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setQuestionnaire({ ...questionnaire, smell: option })}
                                  className={`px-4 py-3 rounded-xl transition-colors ${
                                    questionnaire.smell === option
                                      ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400'
                                      : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-3 font-medium">Simptome fizice (selectează mai multe)</label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                              {['Fără simptome', 'Tuse', 'Iritații ochi', 'Dificultăți respiratorii', 'Dureri de cap', 'Altele'].map((option) => {
                                const isSelected = questionnaire.symptoms.includes(option);
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                      let newSymps = isSelected 
                                        ? questionnaire.symptoms.filter(s => s !== option)
                                        : [...questionnaire.symptoms, option];
                                      
                                      // Logica exclusivă pentru "Fără simptome"
                                      if (option === 'Fără simptome') newSymps = ['Fără simptome'];
                                      else if (newSymps.includes('Fără simptome')) newSymps = newSymps.filter(s => s !== 'Fără simptome');
                                        
                                      setQuestionnaire({ ...questionnaire, symptoms: newSymps });
                                    }}
                                    className={`px-4 py-3 rounded-xl transition-colors ${
                                      isSelected
                                        ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400'
                                        : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-3 font-medium">Surse posibile de poluare (selectează mai multe)</label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                              {['Trafic intens', 'Construcții', 'Industrie', 'Ardere deșeuri', 'Transport public', 'Altele'].map((option) => {
                                const isSelected = questionnaire.sources.includes(option);
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                      const newSources = isSelected
                                        ? questionnaire.sources.filter(s => s !== option)
                                        : [...questionnaire.sources, option];
                                      setQuestionnaire({ ...questionnaire, sources: newSources });
                                    }}
                                    className={`px-4 py-3 rounded-xl transition-colors ${
                                      isSelected
                                        ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400'
                                        : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-3 font-medium">Moment al zilei când ai observat problema</label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                              {['Dimineață (6-10)', 'Prânz (10-14)', 'După-amiază (14-18)', 'Seară (18-22)', 'Noapte (22-6)'].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setQuestionnaire({ ...questionnaire, timeOfDay: option })}
                                  className={`px-4 py-3 rounded-xl transition-colors ${
                                    questionnaire.timeOfDay === option
                                      ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400'
                                      : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-3 font-medium">Durata problemei observate</label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                              {['Sub 30 minute', '30min - 2ore', '2-6 ore', 'Toată ziua', 'Mai multe zile consecutiv'].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setQuestionnaire({ ...questionnaire, duration: option })}
                                  className={`px-4 py-3 rounded-xl transition-colors ${
                                    questionnaire.duration === option
                                      ? 'bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400'
                                      : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-2">Observații suplimentare</label>
                            <textarea
                              value={questionnaire.additionalNotes}
                              onChange={(e) => setQuestionnaire({ ...questionnaire, additionalNotes: e.target.value })}
                              placeholder="Adaugă orice alte detalii relevante..."
                              rows={4}
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                            />
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                            <Send className="w-5 h-5" />
                            <span>Trimite chestionar</span>
                          </motion.button>

                          <div className="pt-4 border-t border-slate-700">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => setShowAnalytics(true)}
                              className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                              <BarChart3 className="w-5 h-5" />
                              <span>📊 Vezi Analitici Comunitate</span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Analytics Dashboard Modal */}
            <AnimatePresence>
              {showAnalytics && (
                <AnalyticsDashboardModal onClose={() => setShowAnalytics(false)} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
