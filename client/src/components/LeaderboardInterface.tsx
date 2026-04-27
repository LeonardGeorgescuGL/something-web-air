import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Download, ShieldCheck, MapPin, Menu, LogOut, Medal, Loader2 } from 'lucide-react';
import type { User } from '../types';
import { getTitleByPoints } from '../utils/gamificationUtils';
import type { CivicUser } from '../utils/gamificationUtils';

interface LeaderboardInterfaceProps {
  user: User;
  onNavigate: (view: 'map' | 'history' | 'alerts' | 'leaderboard') => void;
  onLogout: () => void;
}

// Structura beneficiului din backend
interface Beneficiu {
  idBeneficiu: number;
  pozitieTop: number;
  denumire: string;
  descriere: string;
  endpointDescarcare: string;
  insignaText: string;
  labelButon: string;
  profilVerificat: boolean;
}

export function LeaderboardInterface({ user, onNavigate, onLogout }: LeaderboardInterfaceProps) {
  const [users, setUsers] = useState<CivicUser[]>([]);
  const [beneficii, setBeneficii] = useState<Beneficiu[]>([]);
  const [loading, setLoading] = useState(true);

  // Preia clasamentul din backend
  useEffect(() => {
    fetch('/api/membri/leaderboard')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        setUsers([
          { id: '1', name: 'Alexandru Popescu', points: 350, neighborhood: 'Sector 3' },
          { id: '2', name: 'Maria Ionescu', points: 280, neighborhood: 'Sector 6' },
          { id: '3', name: 'Ion Radu', points: 190, neighborhood: 'Sector 1' },
          { id: '4', name: 'Elena Mihai', points: 80, neighborhood: 'Sector 3' },
          { id: '5', name: 'Andrei Stan', points: 20, neighborhood: 'Sector 2' },
        ]);
        setLoading(false);
      });
  }, []);

  // Preia beneficiile din DB (GET /api/beneficii)
  useEffect(() => {
    fetch('/api/beneficii')
      .then(res => res.json())
      .then((data: Beneficiu[]) => setBeneficii(data))
      .catch(() => {
        // Fallback hardcodat daca backend-ul nu raspunde
        setBeneficii([
          {
            idBeneficiu: 1, pozitieTop: 1,
            denumire: 'Acces Date Complet',
            descriere: 'Descarca intregul istoric',
            endpointDescarcare: '/api/export/masuratori/csv',
            insignaText: '🏆 Vocea Cartierului',
            labelButon: 'Descarcă CSV Complet',
            profilVerificat: true,
          },
          {
            idBeneficiu: 2, pozitieTop: 2,
            denumire: 'Acces Date 7 Zile',
            descriere: 'Descarca ultimele 7 zile',
            endpointDescarcare: '/api/export/masuratori/7zile/csv',
            insignaText: '🥈 Investigator',
            labelButon: 'Descarcă CSV Ultimele 7 Zile',
            profilVerificat: true,
          },
          {
            idBeneficiu: 3, pozitieTop: 3,
            denumire: 'Acces Date 24 Ore',
            descriere: 'Descarca ultimele 24 ore',
            endpointDescarcare: '/api/export/masuratori/24ore/csv',
            insignaText: '🥉 Vigilent',
            labelButon: 'Descarcă CSV Ultimele 24 Ore',
            profilVerificat: true,
          },
        ]);
      });
  }, []);

  // Returneaza beneficiul DB pentru o anumita pozitie (1-indexed)
  const getBeneficiuPentruPozitie = (pozitie: number): Beneficiu | null => {
    return beneficii.find(b => b.pozitieTop === pozitie) ?? null;
  };

  const handleDownload = (endpointDescarcare: string, neighborhood: string, labelButon: string) => {
    const filename = `airwatch_${neighborhood.replace(/\s+/g, '_').toLowerCase()}_${labelButon.replace(/\s+/g, '_')}.csv`;

    fetch(endpointDescarcare)
      .then(res => {
        if (!res.ok) throw new Error('Export eșuat');
        return res.blob();
      })
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      })
      .catch(() => alert('Eroare la descarcarea datelor. Verifică că serverul rulează.'));
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Navigation */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between z-40 gap-3 md:gap-0 flex-shrink-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => onNavigate('map')}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <Menu className="w-6 h-6" />
              <span className="hidden sm:inline">Înapoi la Hartă</span>
            </button>
            <h1 className="text-xl md:text-2xl text-white ml-2 border-l border-slate-700 pl-4">
              AirWatch <span className="text-cyan-400">Leaderboard</span>
            </h1>
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="inline-block bg-gradient-to-br from-yellow-400 to-yellow-600 p-4 rounded-full mb-4 shadow-lg shadow-yellow-500/20"
            >
              <Trophy className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-4xl font-bold mb-4 text-white tracking-tight">Eroii Mediului din București</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Raportează probleme de calitate a aerului, acumulează puncte și deblochează privilegii exclusive!
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              Se încarcă clasamentul...
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {users.map((civicUser: CivicUser, index: number) => {
                const pozitie = index + 1; // 1-indexed
                const title = getTitleByPoints(civicUser.points);
                const beneficiu = getBeneficiuPentruPozitie(pozitie); // din DB

                // Comparare corecta dupa ID
                const isCurrentUser = user.authenticated
                  && user.type === 'community-member'
                  && !!user.id
                  && user.id === civicUser.id;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={civicUser.id}
                    className={`relative p-6 border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-slate-900 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' :
                      index === 1 ? 'bg-gradient-to-r from-slate-400/10 to-slate-900 border-slate-400/50' :
                      index === 2 ? 'bg-gradient-to-r from-amber-700/10 to-slate-900 border-amber-700/50' :
                      'bg-slate-900 border-slate-800'
                    }`}
                  >
                    {/* Rank Number */}
                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center rounded-l-2xl border-r border-slate-800/50">
                      <span className={`text-3xl font-bold ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-slate-300' :
                        index === 2 ? 'text-amber-600' :
                        'text-slate-600'
                      }`}>
                        #{pozitie}
                      </span>
                    </div>

                    {/* Info User */}
                    <div className="ml-20 flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="text-xl font-bold text-white">{civicUser.name}</span>

                        {/* Bifa Verificat (din DB) */}
                        {beneficiu?.profilVerificat && (
                          <div title={`Profil Verificat — ${beneficiu.denumire}`} className="flex items-center justify-center bg-blue-500/20 text-blue-400 rounded-full p-1 border border-blue-500/30">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                        )}

                        {/* Eticheta "Tu" */}
                        {isCurrentUser && (
                          <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                            Tu
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1 font-medium text-cyan-400">
                          {title}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="text-white font-medium">{civicUser.points} puncte</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-md">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {civicUser.neighborhood}
                        </span>
                      </div>

                      {/* Insigna speciala (din DB) */}
                      {beneficiu?.insignaText && (
                        <div className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 text-sm font-medium">
                          <Medal className="w-4 h-4" />
                          {beneficiu.insignaText}
                        </div>
                      )}

                      {/* Beneficiul vizibil pentru toti (ce ar castiga) */}
                      {beneficiu && !isCurrentUser && (
                        <div className="mt-2 text-xs text-slate-500 italic">
                          Beneficiu poziție: {beneficiu.denumire} — {beneficiu.descriere}
                        </div>
                      )}
                    </div>

                    {/* Buton Download — DOAR pentru userul logat cu beneficiu in DB */}
                    <div className="ml-20 md:ml-0 md:pl-4">
                      {beneficiu && isCurrentUser ? (
                        <button
                          onClick={() => handleDownload(
                            beneficiu.endpointDescarcare,
                            civicUser.neighborhood,
                            beneficiu.labelButon
                          )}
                          title={beneficiu.descriere}
                          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 w-full md:w-auto"
                        >
                          <Download className="w-4 h-4" />
                          {beneficiu.labelButon}
                        </button>
                      ) : (
                        <div className="hidden md:block w-56">{/* spacer */}</div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeaderboardInterface;
