import { motion, AnimatePresence } from 'motion/react';
import { Recommendation } from '../services/recommendationService';
import { Video, FileText, Bookmark, ExternalLink, CheckCircle2, Sparkles, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ResourceGridProps {
  resources: Recommendation[];
  loading: boolean;
  filterType: 'all' | 'video' | 'article';
  savedIds: string[];
  onSave: (res: Recommendation) => void;
  onPlayVideo: (video: { id: string, title: string }) => void;
}

export default function ResourceGrid({ resources, loading, filterType, savedIds, onSave, onPlayVideo }: ResourceGridProps) {
  const filtered = resources.filter(res => {
    if (filterType === 'all') return true;
    return res.type === filterType;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      <AnimatePresence mode="popLayout">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <motion.div 
              key={`skeleton-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white/5 rounded-3xl p-6 space-y-4 shadow-sm h-[400px] flex flex-col border border-white/5 animate-pulse"
            >
              <div className="aspect-video w-full bg-white/5 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-6 w-3/4 bg-white/5 rounded-lg" />
                <div className="h-4 w-1/2 bg-white/5 rounded-lg" />
              </div>
              <div className="flex-1 w-full bg-white/[0.02] rounded-xl" />
              <div className="h-12 w-full bg-white/5 rounded-xl" />
            </motion.div>
          ))
        ) : (
          filtered.map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
              className="group glass-card p-6 flex flex-col h-full relative overflow-hidden border-white/5 bg-slate-900/30 hover:bg-slate-900/50 transition-all duration-500 rounded-3xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 via-transparent to-brand-purple/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500" />
              
              <div 
                onClick={() => item.type === 'video' && onPlayVideo({ id: item.id, title: item.title })}
                className={cn(
                  "aspect-video w-full rounded-2xl overflow-hidden bg-white/5 relative mb-6 border border-white/10 shadow-xl transition-transform duration-500 group-hover:scale-[1.01]",
                  item.type === 'video' ? "cursor-pointer" : ""
                )}
              >
                {item.type === 'video' ? (
                  <>
                    <img 
                      src={item.thumbnail} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-brand-dark/10 group-hover:bg-brand-dark/0 transition-colors duration-500 flex items-center justify-center">
                       <motion.div 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-14 h-14 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full flex items-center justify-center group-hover:bg-brand-accent group-hover:border-brand-accent transition-all duration-300"
                       >
                          <PlayCircle className="text-white w-7 h-7 fill-white/20 group-hover:fill-white/30" />
                       </motion.div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-brand-accent/[0.02]">
                    <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent shadow-inner">
                      <FileText className="w-8 h-8" />
                    </div>
                    <span className="text-[9px] font-black text-brand-accent/50 uppercase tracking-[0.4em]">Neural Asset</span>
                  </div>
                )}
                <div className={cn(
                  "absolute top-5 left-5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl backdrop-blur-2xl border transition-all duration-300",
                  item.type === 'video' ? "bg-red-500/20 text-red-400 border-red-500/20 group-hover:bg-red-500 group-hover:text-white" : "bg-brand-teal/20 text-brand-teal border-brand-teal/20 group-hover:bg-brand-teal group-hover:text-brand-dark"
                )}>
                  {item.type}
                </div>
              </div>

              <div className="flex-1 px-1 space-y-4 relative z-10">
                <h3 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight line-clamp-2 transition-colors duration-300 group-hover:text-brand-accent">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed line-clamp-3 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                  {item.summary}
                </p>
              </div>

              <div className="px-1 pt-8 mt-auto flex items-center justify-between relative z-10">
                {item.type === 'video' ? (
                  <button 
                    onClick={() => onPlayVideo({ id: item.id, title: item.title })}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-brand-accent transition-all group/btn"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">Execute</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </button>
                ) : (
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-brand-teal transition-all group/btn"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">Retrieve</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </a>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave(item);
                  }}
                  className={cn(
                    "p-3.5 rounded-xl transition-all duration-300 shadow-xl border",
                    savedIds.includes(item.id) 
                      ? "bg-brand-accent text-white border-brand-accent scale-105" 
                      : "bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-white"
                  )}
                >
                  {savedIds.includes(item.id) ? <CheckCircle2 className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
