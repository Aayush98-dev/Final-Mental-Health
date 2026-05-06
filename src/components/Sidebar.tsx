import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Smile, 
  BookOpen, 
  Users, 
  Activity, 
  User, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Smile, label: 'Emotions', path: '/emotions' },
  { icon: BookOpen, label: 'Self-Help', path: '/resources' },
  { icon: Users, label: 'Therapists', path: '/therapists' },
  { icon: Activity, label: 'Activities', path: '/activities' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => signOut(auth);

  const NavContent = () => (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-4 mb-12 mt-2">
        <div className="w-12 h-12 bg-gradient-to-br from-brand-accent to-brand-purple rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)] rotate-3 animate-pulse">S</div>
        <div className="flex flex-col">
          <span className="font-black text-2xl tracking-tighter text-white">SERENITY</span>
          <span className="text-[10px] font-bold tracking-[0.3em] text-brand-accent uppercase">Wellness AI</span>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "group relative flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 overflow-hidden",
                isActive 
                  ? "bg-white/10 text-brand-accent shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-brand-accent rounded-r-full shadow-[0_0_10px_#3b82f6]"
                />
              )}
              <item.icon className={cn(
                "w-6 h-6 transition-all duration-300", 
                isActive ? "text-brand-accent animate-pulse" : "group-hover:text-brand-accent group-hover:scale-110"
              )} />
              <span className="font-bold tracking-tight">{item.label}</span>
              
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/5 to-transparent pointer-events-none" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Online</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">Neural processes are currently optimizing your experience.</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group w-full"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold tracking-tight">System Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 glass flex items-center justify-between px-6 z-40 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-accent to-brand-purple rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">S</div>
          <span className="font-black text-xl tracking-tighter text-white">SERENITY</span>
        </div>
        <button onClick={() => setIsOpen(true)} className="p-3 bg-white/5 rounded-2xl border border-white/5 shadow-xl">
          <Menu className="w-6 h-6 text-brand-accent" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen fixed left-0 top-0 border-r border-white/5 bg-[#0a0f1d] overflow-y-auto">
        <NavContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-brand-primary z-50 shadow-2xl"
            >
              <div className="absolute top-4 right-4 lg:hidden">
                <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
