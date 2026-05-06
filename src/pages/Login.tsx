import { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, LogIn, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiHistoryService } from '../services/apiHistoryService';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      
      // Log login to custom backend
      if (userCredential.user) {
        apiHistoryService.logLogin(userCredential.user.uid, userCredential.user.email || '');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      
      // Log login to custom backend
      if (userCredential.user) {
        apiHistoryService.logLogin(userCredential.user.uid, userCredential.user.email || '');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-brand-primary">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-purple/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card p-12 w-full max-w-md border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative z-10"
      >
        <div className="flex flex-col items-center mb-12">
          <motion.div 
            whileHover={{ rotate: 12, scale: 1.1 }}
            className="w-24 h-24 bg-gradient-to-br from-brand-accent to-brand-purple rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl relative group"
          >
            <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] animate-ping opacity-0 group-hover:opacity-40 transition-opacity" />
            <Heart className="text-white w-12 h-12" fill="white" />
          </motion.div>
          <h1 className="text-5xl font-black text-white tracking-tighter leading-none glow-text uppercase italic">
            Serenity <span className="text-slate-500">AI</span>
          </h1>
          <div className="flex items-center gap-3 mt-4">
             <span className="w-8 h-[1px] bg-slate-800" />
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Neural Bridge Active</p>
             <span className="w-8 h-[1px] bg-slate-800" />
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-500/10 text-red-500 p-5 rounded-2xl mb-8 text-xs font-bold border border-red-500/20 flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-brand-teal uppercase tracking-[0.3em] ml-2">Secure Identifier</label>
            <input 
              type="email" 
              required
              className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/10 transition-all outline-none text-white font-bold placeholder:text-slate-700"
              placeholder="name@neural.link"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-brand-teal uppercase tracking-[0.3em] ml-2">Access Key</label>
            <input 
              type="password" 
              required
              className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/10 transition-all outline-none text-white font-bold placeholder:text-slate-700"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-white text-brand-dark px-6 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:bg-brand-accent hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            {isLogin ? <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> : <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            {isLogin ? 'Establish Link' : 'Initialize Node'}
          </button>
        </form>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.4em]"><span className="px-4 bg-brand-primary text-slate-600">Cross-Protocol</span></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          className="w-full bg-white/5 text-white px-6 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs border border-white/10 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-4 group"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 group-hover:rotate-12 transition-transform" alt="Google" referrerPolicy="no-referrer" />
          Google Authentication
        </button>

        <p className="mt-10 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {isLogin ? "No active node registered?" : "Return to authentication interface?"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-3 text-brand-accent hover:text-brand-purple transition-colors underline underline-offset-4 decoration-brand-accent/30"
          >
            {isLogin ? 'Register New' : 'Access Link'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
