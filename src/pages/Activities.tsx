import { motion } from 'motion/react';
import { Activity, Wind, Moon, Sun, Heart, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import ActivityModal from '../components/ActivityModal';

const ACTIVITIES = [
  { id: 1, title: 'Square Breathing', icon: Wind, duration: '4 min', benefit: 'Calms central nervous system', color: 'bg-emerald-50 text-emerald-600' },
  { id: 2, title: 'Guided Yoga Flow', icon: Activity, duration: '15 min', benefit: 'Releases physical tension', color: 'bg-indigo-50 text-indigo-600' },
  { id: 3, title: 'Progressive Muscle Relaxation', icon: Moon, duration: '10 min', benefit: 'Better sleep quality', color: 'bg-blue-50 text-blue-600' },
  { id: 4, title: 'Positive Affirmations', icon: Sun, duration: '5 min', benefit: 'Boosts self-esteem', color: 'bg-amber-50 text-amber-600' },
  { id: 5, title: 'Self-Compassion Exercise', icon: Heart, duration: '8 min', benefit: 'Reduces self-criticism', color: 'bg-rose-50 text-rose-600' },
];

export default function Activities() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmotion, setModalEmotion] = useState('Neutral');

  useEffect(() => {
    if (user) {
      const fetchLastEmotion = async () => {
        const path = 'emotionLogs';
        try {
          const q = query(
            collection(db, path),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setModalEmotion(snapshot.docs[0].data().emotion);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      };
      fetchLastEmotion();
    }
  }, [user]);

  const handleStartActivity = (title: string) => {
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-16 max-w-7xl mx-auto pb-20">
      <header className="space-y-6 text-center lg:text-left relative py-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/5 to-transparent pointer-events-none" />
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none"
        >
          Adaptive <span className="glow-text italic">Protocols</span>
        </motion.h1>
        <p className="text-slate-500 max-w-2xl text-xl font-bold italic leading-relaxed">
          Daily neural calibration routines tailored to your biometric variance.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {ACTIVITIES.map((act, idx) => (
          <motion.div 
            key={act.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="glass-card p-10 flex flex-col items-center text-center transition-all group cursor-pointer relative overflow-hidden active:scale-95"
            onClick={() => handleStartActivity(act.title)}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-8 transition-all duration-500 shadow-2xl relative group-hover:rotate-12 ${act.color.includes('emerald') ? 'bg-emerald-500/10 text-emerald-500' : act.color.includes('indigo') ? 'bg-indigo-500/10 text-indigo-500' : act.color.includes('blue') ? 'bg-blue-500/10 text-blue-500' : act.color.includes('amber') ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
               <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] animate-ping opacity-0 group-hover:opacity-20" />
               <act.icon className="w-12 h-12 relative z-10" />
            </div>
            <h3 className="text-3xl font-black text-white mb-3 tracking-tighter leading-none group-hover:text-brand-accent transition-colors">{act.title}</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-teal mb-6 bg-brand-teal/5 px-4 py-1.5 rounded-full border border-brand-teal/10">{act.duration} Duration</p>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-10 italic max-w-[200px]">"{act.benefit}"</p>
            <button className="mt-auto w-full py-5 rounded-2xl bg-white/5 text-white font-black uppercase tracking-[0.3em] text-[10px] border border-white/10 group-hover:bg-brand-accent group-hover:border-brand-accent transition-all shadow-xl">
              Execute Protocol
            </button>
          </motion.div>
        ))}
      </div>

      <ActivityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        emotion={modalEmotion} 
      />

      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative p-[1px] rounded-[4rem] bg-gradient-to-r from-brand-accent via-brand-purple to-brand-teal overflow-hidden mt-20"
      >
        <div className="bg-brand-primary p-12 md:p-20 rounded-[3.9rem] flex flex-col lg:flex-row items-center gap-16 relative overflow-hidden backdrop-blur-3xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="w-48 h-48 shrink-0 bg-gradient-to-br from-white/10 to-transparent rounded-[3rem] flex items-center justify-center border border-white/10 shadow-2xl relative group">
            <Sparkles className="text-white w-24 h-24 group-hover:scale-125 transition-transform duration-700 animate-pulse" />
          </div>
          <div className="space-y-8 text-center lg:text-left flex-1 relative z-10">
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none glow-text uppercase">Neural Mastery <span className="text-slate-600 italic">Core</span></h2>
            <p className="text-slate-400 text-xl font-bold max-w-2xl leading-relaxed italic">
              Access the high-fidelity library of binaural haptic tracks and cognitive restructuring guides synchronized via your biometric heartbeat.
            </p>
            <button className="px-12 py-6 bg-white text-brand-dark rounded-full font-black uppercase tracking-[0.3em] text-xs shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-105 transition-all active:scale-95">
              Initialize Premium Sync
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
