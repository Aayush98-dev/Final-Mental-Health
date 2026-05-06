import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, Wind, Sun, Activity, Heart, Smile, Dumbbell, Moon } from 'lucide-react';
import { Recommendation } from '../services/recommendationService';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { cn } from '../lib/utils';
import { useResources } from '../hooks/useResources';
import CategoryTabs from '../components/CategoryTabs';
import ResourceGrid from '../components/ResourceGrid';
import VideoModal from '../components/VideoModal';

const CATEGORIES = [
  { label: 'For You', icon: Sparkles, emotion: 'last' },
  { label: 'Calm', icon: Wind, emotion: 'Calm' },
  { label: 'Boost', icon: Sun, emotion: 'Boost' },
  { label: 'Balance', icon: Activity, emotion: 'Balance' },
  { label: 'Mindful', icon: Heart, emotion: 'Mindful' },
  { label: 'Positivity', icon: Smile, emotion: 'Positivity' },
  { label: 'Exercise', icon: Dumbbell, emotion: 'Exercise' },
  { label: 'Sleep', icon: Moon, emotion: 'Sleep' }
];

export default function Resources() {
  const { user } = useAuth();
  const { resources, loading, error, activeCategory, setActiveCategory, refresh } = useResources('For You');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'article'>('all');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{ id: string, title: string } | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const handleSave = async (res: Recommendation) => {
    if (!user || savedIds.includes(res.id)) return;
    const path = 'savedResources';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        resourceId: res.id,
        title: res.title,
        summary: res.summary,
        url: res.url,
        type: res.type,
        thumbnail: res.thumbnail || null,
        savedAt: serverTimestamp()
      });
      setSavedIds(prev => [...prev, res.id]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  return (
    <div className="space-y-8 md:space-y-12 pb-20 px-4 md:px-6 max-w-6xl mx-auto">
      <header className="space-y-8 relative pt-10 md:pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/5 via-transparent to-brand-purple/5 pointer-events-none -z-10" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8 relative z-10">
          <div className="space-y-4 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand-accent text-[9px] font-black uppercase tracking-[0.2em]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Neural Resources
            </motion.div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[1]">
              Intelligence <span className="block lg:inline text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-purple italic font-serif">Vault</span>
            </h1>
            <p className="text-slate-400 max-w-lg text-base md:text-lg font-medium leading-relaxed opacity-70 mx-auto lg:mx-0">
              Curated evidence-based multi-modal assets dynamically synchronized with your wellness markers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 self-center lg:self-end">
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl shadow-xl">
              {(['all', 'video', 'article'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all relative overflow-hidden group",
                    filterType === t 
                      ? "text-brand-dark" 
                      : "text-slate-500 hover:text-white"
                  )}
                >
                  {filterType === t && (
                    <motion.div 
                      layoutId="filterBg"
                      className="absolute inset-0 bg-white"
                      transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{t === 'all' ? 'All' : t + 's'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 md:pt-4 border-b border-white/5">
           <CategoryTabs 
            categories={CATEGORIES as any}
            activeTab={activeCategory}
            onTabChange={setActiveCategory}
          />
        </div>
      </header>

      {error ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-16 rounded-[4rem] text-center space-y-10 max-w-2xl mx-auto border-white/5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-2xl relative z-10">
            <BookOpen className="w-12 h-12" strokeWidth={2} />
          </div>
          <div className="space-y-4 relative z-10">
            <p className="text-white font-black text-3xl tracking-tighter uppercase">{error}</p>
            <p className="text-slate-500 font-bold text-lg">Signal interference detected. Check neural link and retry synchronization.</p>
          </div>
          <button 
            onClick={refresh}
            className="px-12 py-5 bg-white text-brand-dark rounded-2xl font-black uppercase tracking-[0.3em] text-xs hover:bg-brand-accent hover:text-white transition-all active:scale-95 relative z-10 shadow-3xl"
          >
            Re-Initialize Link
          </button>
        </motion.div>
      ) : (
        <>
          <ResourceGrid 
            resources={resources}
            loading={loading}
            filterType={filterType}
            savedIds={savedIds}
            onSave={handleSave}
            onPlayVideo={(v) => {
              setSelectedVideo(v);
              setIsVideoModalOpen(true);
            }}
          />

          {!loading && resources.filter(r => filterType === 'all' || r.type === filterType).length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-40 glass-card rounded-[4rem] border-white/5 bg-slate-900/20"
            >
              <BookOpen className="w-24 h-24 text-slate-800 mx-auto mb-8" strokeWidth={1} />
              <p className="text-slate-600 font-black text-2xl tracking-tighter uppercase">No data clusters found for this sector.</p>
              <button onClick={() => setFilterType('all')} className="mt-6 text-brand-accent hover:text-brand-purple font-black uppercase tracking-[0.3em] text-[10px] underline underline-offset-8 decoration-brand-accent/30">Reset Frequency Filter</button>
            </motion.div>
          )}
        </>
      )}

      <VideoModal 
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        video={selectedVideo}
      />
    </div>
  );
}
