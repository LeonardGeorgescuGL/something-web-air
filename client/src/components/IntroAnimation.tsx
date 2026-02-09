import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
}

export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  useEffect(() => {
    // Show welcome message for 3 seconds then complete
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.6, 0.3, 0.6],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Wind className="w-20 h-20 text-cyan-400 mx-auto" />
          </motion.div>
          <h1 className="text-5xl md:text-6xl text-white max-w-4xl mx-auto leading-tight">
            Bine ați venit în <span className="text-cyan-400">Bucureștiul viitorului</span>!
          </h1>
        </motion.div>
      </div>
    </div>
  );
}