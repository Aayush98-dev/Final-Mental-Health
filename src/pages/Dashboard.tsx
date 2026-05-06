import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Smile, Frown, Shield, Calendar, Sparkles, ArrowRight, Activity, Clock, User as UserIcon, TrendingUp, Brain, Info, History, Zap, MessageSquare, Heart, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { format } from 'date-fns';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Lottie from 'lottie-react';

const AI_COMPANION_ANIMS = {
  Happy: "https://lottie.host/9e4d5fca-d2f6-4d62-9721-a4773a48e772/zXv2VvJ7Y2.json",
  Sad: "https://lottie.host/d8f8d8f8-d8f8-d8f8-d8f8-d8f8d8f8d8f8/d8f8d8f8d8f8.json",
  Stress: "https://lottie.host/e3f00882-95f7-418f-bc58-54019448a609/jB4443Rj43.json",
  Neutral: "https://lottie.host/6ad278d6-e3d8-4b0d-b2a8-0856086f6fca/q64mXU8X6I.json",
  Angry: "https://lottie.host/9e4d5fca-d2f6-4d62-9721-a4773a48e772/zXv2VvJ7Y2.json"
};

interface Appointment {
  id: string;
  therapistName: string;
  date: string;
  time: string;
  status: string;
}

interface EmotionLog {
  id: string;
  emotion: string;
  wellnessScore: number;
  insight: string;
  textInput: string;
  timestamp: any;
  critical: boolean;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [emotionLogs, setEmotionLogs] = useState<EmotionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [companionAnim, setCompanionAnim] = useState<any>(null);
  const firstName = profile?.displayName?.split(' ')[0] || 'User';

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch appointments
        const aptPath = 'appointments';
        try {
          const aptQ = query(
            collection(db, aptPath),
            where('userId', '==', user.uid),
            where('status', '==', 'pending'),
            orderBy('date', 'asc'),
            limit(3)
          );
          const aptSnap = await getDocs(aptQ);
          setAppointments(aptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[]);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, aptPath);
        }

        // Fetch emotion logs
        const emoPath = 'emotionLogs';
        try {
          const emoQ = query(
            collection(db, emoPath),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(7)
          );
          const emoSnap = await getDocs(emoQ);
          const logs = emoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EmotionLog[];
          setEmotionLogs(logs);
          
          // Set companion animation based on latest emotion
          const latestEmotion = logs[0]?.emotion || 'Neutral';
          const animUrl = (AI_COMPANION_ANIMS as any)[latestEmotion] || AI_COMPANION_ANIMS.Neutral;
          
          try {
            const resp = await fetch(animUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const contentType = resp.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error('Response is not JSON');
            }
            const data = await resp.json();
            setCompanionAnim(data);
          } catch (lottieErr) {
            console.warn("Companion animation fetch failed, using fallback UI", lottieErr);
            setCompanionAnim(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, emoPath);
        }

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const chartData = [...emotionLogs].reverse().map(log => ({
    time: log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d') : 'Recent',
    score: log.wellnessScore || 50
  }));

  const latestLog = emotionLogs[0];
  const latestScore = latestLog?.wellnessScore || 0;

  return (
    <div className="space-y-12 pb-20">
      <header className="space-y-2 relative h-48 flex flex-col justify-end">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-accent/20 rounded-full blur-[100px] -z-10 animate-pulse" />
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-brand-accent"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-black text-xs uppercase tracking-[0.3em]">Synaptic Overview Terminal</span>
        </motion.div>
        <div className="flex items-end justify-between gap-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl lg:text-8xl font-black text-white tracking-tighter leading-none"
          >
            {latestScore > 70 ? <span className="glow-text">Optimized</span> : <span className="glow-text">Neutralizing</span>}, {firstName}
          </motion.h1>
          
          {/* AI Companion Preview */}
          <div className="hidden lg:block w-32 h-32 relative group">
             {companionAnim && (
               <Lottie 
                animationData={companionAnim} 
                className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
               />
             )}
             <div className="absolute -bottom-2 -left-10 bg-white/5 border border-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-teal opacity-0 group-hover:opacity-100 transition-opacity">
               AI Unit v2.4 Active
             </div>
          </div>
        </div>
      </header>

      {/* Main Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8" id="dashboard-main-grid">
        {/* Today's Mental Snapshot */}
        <motion.section 
          id="mental-snapshot-section"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 glass-card p-8 border-brand-accent/20 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 p-4">
            <Zap className="w-6 h-6 text-brand-accent animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Mental Snapshot</h3>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-teal">Current Dominant State</p>
              <p className="text-4xl font-black text-white glow-text">{latestLog?.emotion || 'Unknown'}</p>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5">
             <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Wellness Equilibrium</span>
               <span className="text-2xl font-black text-brand-accent">{latestScore}%</span>
             </div>
             <div className="h-2 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${latestScore}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-brand-accent to-brand-teal"
               />
             </div>
          </div>
        </motion.section>

        {/* Neural Trend Analysis */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 glass-card p-8 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <TrendingUp className="text-brand-accent" />
                Neural Flux Timeline
              </h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">7-Day Biometric Stream</p>
            </div>
            <div className="flex gap-2">
               <div className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
               <span className="text-[10px] font-black uppercase tracking-widest text-brand-teal">Live Analysis</span>
            </div>
          </div>

          <div className="h-[250px] w-full relative z-10">
            {emotionLogs.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#475569', fontSize: 9, fontWeight: 800}} 
                  />
                  <YAxis 
                    hide
                    domain={[0, 100]} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderRadius: '1rem', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      padding: '1rem' 
                    }}
                    itemStyle={{ fontWeight: '900', color: '#3b82f6' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '0.8rem' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700">
                <p className="font-black uppercase tracking-widest text-[10px]">Awaiting further telemetry</p>
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* Quick Actions & Companionship */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* AI Recommendations & Smart Alerts */}
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1 space-y-8"
        >
          <div className="glass-card p-6 border-brand-purple/20 relative">
            <h3 className="font-black text-lg text-white flex items-center gap-3 mb-6">
              <Sparkles className="text-brand-purple w-5 h-5" />
              AI Directives
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-purple/30 transition-colors cursor-pointer group">
                <p className="text-[9px] font-black text-brand-purple uppercase tracking-widest mb-1">Recommended</p>
                <p className="text-sm font-bold text-slate-200">Neural Reset Breathing</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-purple/30 transition-colors cursor-pointer group">
                <p className="text-[9px] font-black text-brand-purple uppercase tracking-widest mb-1">Optimizing</p>
                <p className="text-sm font-bold text-slate-200">Session Uplink Protocol</p>
              </div>
            </div>

            <div className="mt-8">
               <div className="p-4 bg-brand-purple/10 rounded-2xl border border-brand-purple/20">
                  <p className="text-[10px] text-brand-purple font-black italic">
                    "Analyzing your current frequency... A 5-minute meditation could recalibrate your baseline."
                  </p>
               </div>
            </div>
          </div>

          <div className="glass-card p-6 border-brand-accent/20 bg-brand-accent/5">
             <div className="flex items-center gap-3 text-brand-accent mb-4">
                <Info className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Smart Alert</span>
             </div>
             <p className="text-xs text-slate-300 font-bold leading-relaxed">
                Biometric patterns suggest heightened cortisol levels. Consider initializing a 'Deep Focus' activity Node.
             </p>
          </div>
        </motion.section>

        {/* Interactive Quick Actions Panel */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <QuickActionItem 
            icon={Brain} 
            title="Scan Emotion" 
            desc="Initialize neural analysis"
            link="/emotions"
            color="text-brand-teal"
            bg="bg-brand-teal/10"
          />
          <QuickActionItem 
            icon={Activity} 
            title="Execute Activity" 
            desc="Start wellness protocol"
            link="/activities"
            color="text-brand-accent"
            bg="bg-brand-accent/10"
          />
          <QuickActionItem 
            icon={UserIcon} 
            title="Node Uplink" 
            desc="Connect to specialist"
            link="/therapists"
            color="text-brand-purple"
            bg="bg-brand-purple/10"
          />

          {/* Interactive Streak Grid */}
          <div className="md:col-span-3 glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-8 h-full">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-accent to-brand-teal flex items-center justify-center shadow-2xl">
                   <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                   <h4 className="text-2xl font-black text-white glow-text">04 Day Surge</h4>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Consistent Wellness Maintenance</p>
                </div>
             </div>
             <div className="flex gap-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className={cn(
                    "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
                    i < 4 ? "bg-brand-teal/20 border-brand-teal text-brand-teal" : "bg-white/5 border-white/10 text-slate-700"
                  )}>
                    {i < 4 ? <Zap className="w-4 h-4" /> : i + 1}
                  </div>
                ))}
             </div>
          </div>
        </motion.section>
      </div>

      {/* Feed & Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 pt-8">
        {/* Recent Experience Logs */}
        <section className="lg:col-span-3 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-white flex items-center gap-4">
              <History className="text-brand-accent w-8 h-8" />
              Event Horizon
            </h2>
            <Link to="/profile" className="text-[10px] font-black uppercase tracking-widest text-brand-accent hover:text-white transition-colors">
              Access Full Archive
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              [...Array(2)].map((_, i) => <div key={i} className="h-40 glass-card animate-pulse" />)
            ) : emotionLogs.slice(0, 4).map((log, idx) => (
                <motion.div 
                  key={log.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col gap-4 group hover:bg-white/10 transition-all cursor-default"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      log.wellnessScore > 70 ? "bg-green-500/20 text-green-400" : log.wellnessScore > 40 ? "bg-orange-500/20 text-orange-400" : "bg-red-500/20 text-red-400"
                    )}>
                      {log.emotion}
                    </span>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm') : 'Sync'}</span>
                  </div>
                  <p className="font-bold text-lg text-slate-200 line-clamp-1 leading-tight">{log.textInput || 'Biometric variance detected'}</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">"{log.insight}"</p>
                </motion.div>
            ))}
          </div>
        </section>

        {/* Sessions Sidebar */}
        <section className="lg:col-span-1 space-y-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Calendar className="w-6 h-6 text-brand-teal" />
            Agenda Nodes
          </h2>

          <div className="space-y-4">
            {loading ? (
              <div className="h-40 bg-white/5 rounded-3xl animate-pulse" />
            ) : appointments.length > 0 ? (
               appointments.map((apt) => (
                <div key={apt.id} className="p-5 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <p className="font-black text-sm text-white tracking-tight">{apt.therapistName}</p>
                   </div>
                   <div className="flex items-center justify-between text-[10px] font-black text-brand-teal bg-black/30 p-2 rounded-xl">
                      <span>{format(new Date(apt.date), 'MMM d')}</span>
                      <span>{apt.time}</span>
                   </div>
                </div>
               ))
            ) : (
              <div className="p-8 bg-white/5 rounded-3xl text-center border border-white/5">
                <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">No Active Nodes</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickActionItem({ icon: Icon, title, desc, link, color, bg }: any) {
  return (
    <Link to={link} className="block group">
       <div className={cn(
         "p-6 rounded-[2.5rem] border border-white/5 transition-all group-hover:scale-[1.02] group-hover:bg-white/10 h-full",
         bg
       )}>
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-12", color, "bg-white/5")}>
             <Icon className="w-6 h-6" />
          </div>
          <h4 className="font-black text-white text-lg tracking-tighter mb-1 uppercase">{title}</h4>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{desc}</p>
       </div>
    </Link>
  );
}

function QuickActionCard({ icon: Icon, title, description, color, link }: any) {
  return (
    <Link to={link}>
      <motion.div 
        whileHover={{ y: -5 }}
        className={cn(
          "p-8 rounded-[2.5rem] flex flex-col h-full group cursor-pointer transition-all",
          color
        )}
      >
        <div className="bg-white/50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
          <Icon className="text-brand-dark w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6 flex-1 leading-relaxed">{description}</p>
        <div className="flex items-center text-brand-dark font-bold gap-2 text-sm">
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </motion.div>
    </Link>
  );
}
