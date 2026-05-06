import { motion, AnimatePresence } from 'motion/react';
import { X, Youtube, Maximize2 } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
  } | null;
}

export default function VideoModal({ isOpen, onClose, video }: VideoModalProps) {
  if (!video) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 m-auto z-[101] max-w-5xl h-fit aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full text-white transition-all active:scale-95 group"
              >
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="flex-1 w-full h-full relative group">
              <iframe
                src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
                title={video.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              
              {/* Overlay title on hover */}
              <div className="absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                    <Youtube className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold line-clamp-1">{video.title}</h2>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
