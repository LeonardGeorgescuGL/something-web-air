import React from 'react';
import { motion } from 'motion/react';
import { Users, Eye, MapPin, Activity, Wind, AlertCircle } from 'lucide-react';
import type { UserType } from '../types';

interface LandingPageProps {
  onUserTypeSelect: (type: UserType) => void;
}

export function LandingPage({ onUserTypeSelect }: LandingPageProps) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="absolute inset-0 z-0">
        {/* Folosim o imagine de Smart City*/}
        <img 
          src='/panormanaBucharest.webp'
          alt="Bucharest Future" 
          className="w-full h-full object-cover opacity-60"
        />
        {/* Overlay Gradient întunecat să se vadă textul */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/60" />
      </div>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Wind className="w-16 h-16 text-cyan-400" />
            </motion.div>
            <h1 className="text-6xl text-white tracking-tight">
              AirWatch <span className="text-cyan-400">București</span>
            </h1>
          </div>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Sistem inteligent de monitorizare a calității aerului pentru capitala României
          </p>
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto"
        >
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center">
            <Activity className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <div className="text-3xl text-white mb-1">247</div>
            <div className="text-slate-400">Senzori activi</div>
          </div>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center">
            <MapPin className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <div className="text-3xl text-white mb-1">6</div>
            <div className="text-slate-400">Zone urbane</div>
          </div>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-purple-400 mx-auto mb-3" />
            <div className="text-3xl text-white mb-1">Real-time</div>
            <div className="text-slate-400">Monitorizare 24/7</div>
          </div>
        </motion.div>

        {/* User Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl text-white text-center mb-12">
            Selectează tipul de utilizator
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visitor Card */}
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              onClick={() => onUserTypeSelect('visitor')}
              className="cursor-pointer bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg border-2 border-blue-400/30 rounded-3xl p-8 hover:border-blue-400/60 transition-all group"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-blue-500/20 p-6 rounded-2xl group-hover:bg-blue-500/30 transition-all">
                  <Eye className="w-16 h-16 text-blue-400" />
                </div>
              </div>
              <h3 className="text-2xl text-white text-center mb-4">Vizitator</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <span>Consultare hartă interactivă cu date în timp real</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <span>Vizualizare istoric pentru zone specifice</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <span>Analiza indicatorilor AQI pe 6 categorii</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <span>Clustering K-Means pentru zone urbane</span>
                </li>
              </ul>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full mt-8 bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl transition-colors"
              >
                Continuă ca Vizitator
              </motion.button>
            </motion.div>

            {/* Community Member Card */}
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              onClick={() => onUserTypeSelect('community-member')}
              className="cursor-pointer bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg border-2 border-purple-400/30 rounded-3xl p-8 hover:border-purple-400/60 transition-all group"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-purple-500/20 p-6 rounded-2xl group-hover:bg-purple-500/30 transition-all">
                  <Users className="w-16 h-16 text-purple-400" />
                </div>
              </div>
              <h3 className="text-2xl text-white text-center mb-4">Membru Comunitate</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  <span>Toate funcționalitățile vizitatorului</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  <span>Emitere alerte comunitare cu rapoarte text</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  <span>Încărcare fotografii geo-tagged</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  <span>Raportare zone poluate prin GeoJSON</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  <span>Chestionare interactive pentru observații</span>
                </li>
              </ul>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full mt-8 bg-purple-500 hover:bg-purple-600 text-white py-4 rounded-xl transition-colors"
              >
                Autentificare Membru
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-16 text-slate-400"
        >
          <p>Surse de date: ANM • ANPM • Rețea Civică</p>
        </motion.div>
      </div>
    </div>
  );
}
