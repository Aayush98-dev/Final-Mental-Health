import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Sparkles, Youtube, BookOpen, Bookmark, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { Recommendation, DetailedActivity, fetchResources, fetchDetailedActivities } from '../services/recommendationService';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  emotion: string;
}

export default function ActivityModal({ isOpen, onClose, emotion }: ActivityModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<DetailedActivity[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [saved, setSaved] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [detailedActs, recs] = await Promise.all([
        fetchDetailedActivities(emotion),
        fetchResources({ emotion })
      ]);
      setActivities(detailedActs);
      setRecommendations(recs);
      
      // Log to Firebase as requested
      if (user) {
        const path = 'activityLogs';
        try {
          await addDoc(collection(db, path), {
            userId: user.uid,
            emotion,
            activities: detailedActs,
            timestamp: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && emotion) {
      fetchData();
    }
  }, [isOpen, emotion]);

  const handleSave = async (title: string, data: any) => {
    if (!user || saved.includes(title)) return;
    const path = 'savedResources';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        ...data,
        savedAt: serverTimestamp()
      });
      setSaved(prev => [...prev, title]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 m-auto z-[70] w-full max-w-4xl h-fit max-h-[90vh] glass-card bg-brand-primary border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-brand-primary/80 backdrop-blur-3xl z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-brand-accent to-brand-purple flex items-center justify-center text-white shadow-2xl relative group">
                  <div className="absolute inset-0 bg-white/20 rounded-[1.5rem] animate-ping opacity-0 group-hover:opacity-40" />
                  <Sparkles className="w-8 h-8 relative z-10" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tighter glow-text uppercase">Neural Alignment</h2>
                  <p className="text-[10px] text-brand-teal font-black uppercase tracking-[0.4em]">Protocol: {emotion} State Recovery</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-16 custom-scrollbar">
              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center gap-6">
                  <Loader2 className="w-16 h-16 text-brand-accent animate-spin" />
                  <p className="text-slate-500 font-black uppercase tracking-[0.4em] animate-pulse">Synthesizing Adaptive Plan...</p>
                </div>
              ) : (
                <>
                  {/* AI Activities Section */}
                  <section className="space-y-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-brand-teal uppercase tracking-[0.5em] flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4" /> Adaptive Directives
                      </h3>
                      <button 
                        onClick={fetchData}
                        className="text-white hover:text-brand-accent text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10"
                      >
                        <RefreshCcw className="w-3 h-3" /> Re-Scan
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {activities.map((act, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-white/5 p-8 rounded-[2rem] border border-white/5 flex flex-col group relative hover:border-brand-accent/30 transition-all transition-all"
                        >
                          <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-brand-accent animate-pulse opacity-50" />
                          <h4 className="font-black text-white text-xl tracking-tight mb-3 group-hover:text-brand-accent transition-colors">{act.title}</h4>
                          <p className="text-sm text-slate-500 leading-relaxed font-bold mb-8 flex-1 italic line-clamp-4">"{act.explanation}"</p>
                          <button 
                            onClick={() => handleSave(act.title, { title: act.title, summary: act.explanation, type: 'activity' })}
                            className={cn(
                              "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all px-4 py-2 rounded-xl w-fit",
                              saved.includes(act.title) ? "bg-brand-teal/10 text-brand-teal border border-brand-teal/20" : "bg-white/5 text-slate-400 hover:bg-white hover:text-brand-dark"
                            )}
                          >
                            {saved.includes(act.title) ? (
                              <><CheckCircle2 className="w-3 h-3" /> Node Saved</>
                            ) : (
                              <><Bookmark className="w-3 h-3" /> Save Uplink</>
                            )}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </section>

                  {/* Multimedia Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* YouTube Videos */}
                    <section className="space-y-10">
                      <h3 className="text-[10px] font-black text-brand-teal uppercase tracking-[0.5em] flex items-center gap-3">
                        <Youtube className="w-4 h-4 text-red-500" /> Neural Visuals
                      </h3>
                      <div className="space-y-8">
                        {recommendations.filter(r => r.type === 'video').slice(0, 2).map((video) => (
                          <div key={video.id} className="space-y-4 group">
                            <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
                              <iframe 
                                src={`https://www.youtube.com/embed/${video.id}`}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                            <h5 className="font-black text-white text-lg tracking-tight group-hover:text-brand-accent transition-colors line-clamp-1">{video.title}</h5>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Articles */}
                    <section className="space-y-10">
                      <h3 className="text-[10px] font-black text-brand-teal uppercase tracking-[0.5em] flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-brand-purple" /> Cognitive Intel
                      </h3>
                      {recommendations.filter(r => r.type === 'article').slice(0, 1).map((art) => (
                        <div key={art.id} className="glass-card p-10 space-y-6 relative overflow-hidden group border-white/5 bg-slate-900/40">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full blur-[40px]" />
                          <h4 className="font-black text-white text-2xl tracking-tighter glow-text leading-tight">{art.title}</h4>
                          <p className="text-slate-500 font-bold leading-relaxed text-sm italic line-clamp-[8]">"{art.summary}"</p>
                          <div className="flex flex-col sm:flex-row items-center gap-6 pt-6">
                            <a 
                              href={art.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto px-8 py-4 bg-white text-brand-dark rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-accent hover:text-white transition-all text-center shadow-xl"
                            >
                              Retrieve Full Intel
                            </a>
                            <button 
                              onClick={() => handleSave(art.title, { title: art.title, summary: art.summary, type: 'article', url: art.url })}
                              className={cn(
                                "flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all",
                                saved.includes(art.title) ? "text-brand-teal" : "text-slate-600 hover:text-white"
                              )}
                            >
                              {saved.includes(art.title) ? <CheckCircle2 className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                              {saved.includes(art.title) ? 'Data Logged' : 'Log Cluster'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </section>
                  </div>
                </>
              )}
            </div>

            <div className="p-8 bg-brand-dark/20 border-t border-white/5 flex justify-center backdrop-blur-md">
              <button 
                onClick={onClose}
                className="px-20 py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] hover:bg-white hover:text-brand-dark transition-all duration-500 shadow-2xl"
              >
                Terminate Uplink
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
