import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Calendar, Shield, Settings, History, Sparkles, Activity, MessageSquare, BookOpen, Clock, Heart, ArrowUpRight, TrendingUp, Info, Brain, Edit3, Save, X, Camera } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function Profile() {
  const { profile, user, updateProfileData } = useAuth();
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName || '');
      setEditPhoto(profile.photoURL || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfileData({
        displayName: editName,
        photoURL: editPhoto
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        // Fetch recent appointments
        const aptPath = 'appointments';
        try {
          const aptQ = query(
            collection(db, aptPath),
            where('userId', '==', user.uid),
            orderBy('date', 'desc'),
            limit(5)
          );
          const aptSnap = await getDocs(aptQ);
          const apts = aptSnap.docs.map(doc => ({ type: 'appointment', id: doc.id, ...doc.data() }));
          
          // Fetch recent emotion logs
          const emoPath = 'emotionLogs';
          try {
            const emoQ = query(
              collection(db, emoPath),
              where('userId', '==', user.uid),
              orderBy('timestamp', 'desc'),
              limit(10)
            );
            const emoSnap = await getDocs(emoQ);
            const emos = emoSnap.docs.map(doc => ({ type: 'emotion', id: doc.id, ...doc.data() }));

            // Combine and sort
            const combined = [...apts, ...emos].sort((a: any, b: any) => {
              const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.date).getTime();
              const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.date).getTime();
              return timeB - timeA;
            });

            setActivityHistory(combined);
          } catch (emoErr) {
            handleFirestoreError(emoErr, OperationType.GET, emoPath);
          }
        } catch (aptErr) {
          handleFirestoreError(aptErr, OperationType.GET, aptPath);
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  if (!profile) return null;

  const logs = activityHistory.filter(h => h.type === 'emotion');
  const chartData = [...logs].reverse().map(log => ({
    date: log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d') : 'Recent',
    score: log.wellnessScore || 50
  }));

  const avgWellness = logs.length > 0 ? Math.round(logs.reduce((acc, curr) => acc + (curr.wellnessScore || 0), 0) / logs.length) : 0;
  const wellnessStatus = avgWellness > 75 ? "Optimal Resilience" : avgWellness > 50 ? "Balanced & Mindful" : "Seeking Equilibrium";

  return (
    <div className="space-y-12 pb-20">
      <header className="relative py-24 px-12 glass-card overflow-hidden group border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-dark to-[#0f172a]" />
        <div className="relative z-10 flex flex-col items-center gap-12">
          <div className="relative group">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-48 h-48 rounded-[3.5rem] bg-gradient-to-br from-brand-accent to-brand-purple p-1 shadow-[0_0_50px_rgba(59,130,246,0.3)] relative group cursor-pointer"
            >
              <div className="absolute inset-0 rounded-[3.5rem] bg-brand-dark overflow-hidden m-1">
                <img 
                  src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute -bottom-4 -right-4 bg-brand-accent p-4 rounded-3xl shadow-2xl border-4 border-brand-dark"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
            </motion.div>

            {!isEditing && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsEditing(true)}
                className="absolute top-0 -right-4 p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl backdrop-blur-md text-white transition-all z-20 group"
              >
                <Edit3 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </motion.button>
            )}
          </div>
          
          <div className="text-center space-y-6 max-w-2xl w-full">
            {isEditing ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 w-full max-w-md mx-auto"
              >
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Neural Identifier</label>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Display Name"
                    className="w-full px-6 py-4 rounded-[1.5rem] bg-white/5 border border-white/10 text-white font-black text-xl focus:ring-4 focus:ring-brand-accent/20 outline-none transition-all text-center"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Acoustic/Visual Node URL</label>
                  <input 
                    type="text"
                    value={editPhoto}
                    onChange={(e) => setEditPhoto(e.target.value)}
                    placeholder="Profile Photo URL"
                    className="w-full px-6 py-4 rounded-[1.5rem] bg-white/5 border border-white/10 text-white font-bold text-sm focus:ring-4 focus:ring-brand-purple/20 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 py-4 rounded-3xl bg-brand-accent text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-brand-accent/80 transition-all shadow-lg shadow-brand-accent/20 disabled:opacity-50"
                  >
                    {isSaving ? <Activity className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Encrypt & Save
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(profile.displayName || '');
                      setEditPhoto(profile.photoURL || '');
                    }}
                    className="p-4 rounded-3xl bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                <h1 className="text-6xl lg:text-8xl font-black text-white tracking-tighter leading-none glow-text">{profile.displayName}</h1>
                <p className="text-brand-accent font-black text-[10px] uppercase tracking-[0.5em] flex items-center justify-center gap-4 bg-white/5 py-2 px-6 rounded-full border border-white/5 w-fit mx-auto">
                  <Mail className="w-4 h-4 opacity-50" /> {profile.email}
                </p>
              </>
            )}
            <div className="pt-8 flex flex-wrap gap-4 justify-center">
               <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-[2rem] flex items-center gap-4 group/chip hover:bg-white/10 transition-all cursor-default">
                  <Shield className="w-6 h-6 text-brand-teal animate-pulse" />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loyalty Status</p>
                    <span className="text-xs font-black uppercase tracking-widest text-white/80">Vanguard Tier</span>
                  </div>
               </div>
               <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-[2rem] flex items-center gap-4 group/chip hover:bg-white/10 transition-all cursor-default">
                  <Activity className="w-6 h-6 text-brand-purple" />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Cycles</p>
                    <span className="text-xs font-black uppercase tracking-widest text-white/80">{logs.length} Neural Logs</span>
                  </div>
               </div>
               <div className="bg-brand-accent/5 border border-brand-accent/20 px-8 py-4 rounded-[2rem] flex items-center gap-4 group/chip hover:bg-brand-accent/20 transition-all cursor-default">
                  <Shield className="w-6 h-6 text-brand-accent animate-pulse" />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Data Node</p>
                    <span className="text-xs font-black uppercase tracking-widest text-brand-accent">Atlas Synced</span>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Dynamic Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-purple/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-[100px]" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Wellness Telemetry Chart */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass-card p-12 space-y-12 group border-white/5"
        >
          <div className="flex items-center justify-between">
             <div className="space-y-1">
                <h2 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter">
                  <TrendingUp className="w-10 h-10 text-brand-accent" />
                  Wellness Matrix
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Neural shift telemetry visualization</p>
             </div>
             <div className="text-right">
                <p className="text-6xl font-black text-white tabular-nums tracking-tighter">{avgWellness}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-teal">Mean Resonance</p>
             </div>
          </div>

          <div className="h-[450px] w-full">
            {logs.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="profileGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} dy={20} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 900}} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderRadius: '1.5rem', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      backdropFilter: 'blur(10px)',
                      padding: '1.5rem' 
                    }}
                    itemStyle={{ fontWeight: '900', color: '#3b82f6', fontSize: '2rem' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={6} 
                    fillOpacity={1} 
                    fill="url(#profileGradient)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-8">
                <Activity className="w-24 h-24 stroke-[1px] opacity-20 animate-pulse" />
                <p className="font-black text-[10px] uppercase tracking-[0.3em]">Expansion required for matrix mapping</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Wellness Sidebar */}
        <aside className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-brand-dark p-12 rounded-[4rem] text-white space-y-12 relative overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.1)] border border-white/5"
          >
            <h3 className="text-3xl font-black flex items-center gap-4 relative z-10 tracking-tighter">
              <Heart className="text-brand-accent fill-brand-accent w-10 h-10" />
              Living Pulse
            </h3>
            <div className="space-y-10 relative z-10">
               <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Cognitive Status</p>
                  <p className="text-5xl font-black text-white tracking-tighter leading-tight glow-text">{wellnessStatus}</p>
               </div>
               <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-xl group hover:bg-white/10 transition-colors">
                  <p className="text-lg font-bold leading-relaxed text-slate-300 italic group-hover:text-white transition-colors">
                    "Syncing your digital architecture with the biological rhythm of the core."
                  </p>
               </div>
               <div className="flex justify-between items-end border-t border-white/10 pt-10 mt-10">
                  <div>
                    <p className="text-5xl font-black text-white tabular-nums tracking-tighter">{activityHistory.length}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Interactions Managed</p>
                  </div>
                  <motion.div whileHover={{ scale: 1.1, rotate: 10 }}>
                    <ArrowUpRight className="text-brand-accent w-12 h-12 opacity-30" />
                  </motion.div>
               </div>
            </div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-accent/5 rounded-full blur-[60px]" />
          </motion.div>

          <div className="glass-card p-10 rounded-[3.5rem] border-white/5 space-y-10 group bg-slate-900/40">
            <h4 className="text-2xl font-black text-white flex items-center gap-4 tracking-tighter">
              <Shield className="w-8 h-8 text-brand-teal" />
              Cyber Protocols
            </h4>
            <div className="space-y-6">
               <ProtocolItem text="Daily Multi-Modal Link" checked />
               <ProtocolItem text="Professional Node Audit" />
               <ProtocolItem text="Strategic Cache Refresh" />
            </div>
          </div>
        </aside>
      </div>

      {/* Experience History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <ProfileSection title="Journey Matrix" icon={History}>
           <div className="space-y-10 min-h-[400px]">
              {loading ? (
                <div className="space-y-6">
                   {[...Array(3)].map((_, i) => <div key={i} className="h-32 glass-card animate-pulse shadow-none" />)}
                </div>
              ) : activityHistory.length > 0 ? (
                <div className="relative space-y-12 before:absolute before:inset-0 before:left-[19px] before:w-[2px] before:bg-white/5">
                  {activityHistory.map((item, idx) => (
                    <motion.div 
                      key={item.id || idx} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      className="relative flex items-start gap-10 group"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center z-10 transition-all shadow-2xl scale-125 border-4 border-brand-dark",
                        item.type === 'appointment' ? "bg-white text-brand-dark" : "bg-brand-accent text-white shadow-brand-accent/20"
                      )}>
                        {item.type === 'appointment' ? <Calendar className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 p-8 rounded-[3rem] bg-white/5 border border-white/5 group-hover:bg-white/10 transition-all group-hover:-translate-y-2 cursor-default">
                        <div className="flex justify-between items-start mb-4">
                           <h4 className="font-black text-2xl text-white tracking-tight">
                             {item.type === 'appointment' 
                               ? `Consult: ${item.therapistName}` 
                               : `${item.emotion} Calibration`}
                           </h4>
                           {item.wellnessScore && (
                             <span className="bg-brand-accent text-white text-[10px] px-4 py-1.5 rounded-full font-black shadow-lg shadow-brand-accent/30 tabular-nums">SCORE {item.wellnessScore}</span>
                           )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-3 mb-6">
                          <Clock className="w-4 h-4 text-brand-accent" /> 
                          {item.type === 'appointment' 
                            ? `${item.date} @ ${item.time}` 
                            : item.timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'Log Sync'}
                        </p>
                        {item.insight && (
                           <div className="bg-black/20 p-6 rounded-[2rem] text-sm font-bold text-slate-400 border border-white/5 italic leading-relaxed group-hover:text-slate-200 transition-colors">
                              "{item.insight}"
                           </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-600 gap-8 glass-card">
                  <Info className="w-16 h-16 opacity-10" />
                  <p className="font-black text-[10px] uppercase tracking-[0.4em] text-center leading-loose">Cognitive matrix initialization recommended.<br/>No historical markers found.</p>
                </div>
              )}
           </div>
        </ProfileSection>

        <ProfileSection title="Neural Capabilities" icon={Sparkles}>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <CapabilityCard 
                icon={Brain} 
                title="Neural Scan" 
                desc="Quantum biometric synthesis of facial and vocal markers." 
              />
              <CapabilityCard 
                icon={MessageSquare} 
                title="AI Core" 
                desc="Continuous link to trained empathetic intelligence nodes." 
              />
              <CapabilityCard 
                icon={BookOpen} 
                title="Protocol Stream" 
                desc="Adaptive biometric resource injection for optimization." 
              />
              <CapabilityCard 
                icon={Shield} 
                title="Encrypted Node" 
                desc="End-to-end shielded professional uplink for critical data." 
              />
           </div>
           
           <motion.div 
              whileHover={{ scale: 1.02 }}
              className="mt-16 p-12 bg-white/5 rounded-[4rem] border border-white/10 flex items-center gap-10 group relative overflow-hidden"
            >
              <div className="absolute inset-x-0 h-1 top-0 bg-gradient-to-r from-brand-accent to-brand-purple" />
              <div className="w-24 h-24 bg-gradient-to-br from-brand-accent to-brand-purple rounded-[2.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.2)] group-hover:rotate-12 transition-transform shrink-0">
                 <Sparkles className="w-12 h-12 text-white animate-pulse" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-teal mb-2">Alpha Evolution</p>
                 <h5 className="font-black text-white text-3xl tracking-tighter">Neuro-Wave Imaging</h5>
                 <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">Synthesizing real-time neural patterns into structural biometric insights.</p>
              </div>
           </motion.div>
        </ProfileSection>
      </div>
    </div>
  );
}

function ProtocolItem({ text, checked }: { text: string; checked?: boolean }) {
  return (
    <div className="flex items-center gap-4 text-sm font-bold text-slate-300 group cursor-default">
      <div className={cn(
        "w-6 h-6 rounded-[0.5rem] flex items-center justify-center border-2 transition-colors", 
        checked ? "bg-brand-accent border-brand-accent text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "border-white/10 group-hover:border-white/30"
      )}>
        {checked && <Shield className="w-3.5 h-3.5" />}
      </div>
      <span className={cn(checked ? "text-white" : "text-slate-500 font-medium")}>{text}</span>
    </div>
  );
}

function CapabilityCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-8 rounded-[3rem] bg-white/5 border border-white/5 hover:border-brand-accent/30 transition-all group hover:bg-white/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-2">
      <div className="w-14 h-14 bg-brand-dark rounded-[1.25rem] flex items-center justify-center shadow-lg text-brand-accent mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all border border-white/5">
        <Icon className="w-7 h-7" />
      </div>
      <h5 className="font-black text-white text-base mb-2">{title}</h5>
      <p className="text-xs text-slate-500 font-medium leading-relaxed tracking-tight group-hover:text-slate-300 transition-colors">{desc}</p>
    </div>
  );
}

function ProfileSection({ title, icon: Icon, children }: any) {
  return (
    <section className="glass-card p-12 space-y-12 border-white/5 bg-slate-900/40">
      <div className="flex items-center gap-6">
        <div className="p-4 bg-brand-accent/20 rounded-[1.5rem] shadow-[0_0_20px_rgba(59,130,246,0.2)]">
          <Icon className="w-8 h-8 text-brand-accent" />
        </div>
        <h3 className="text-3xl font-black text-white tracking-tighter">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}
