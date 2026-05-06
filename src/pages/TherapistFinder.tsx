import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, Star, Calendar, MessageSquare, Info, CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';
import BookingModal from '../components/BookingModal';
import TherapistChatModal from '../components/TherapistChatModal';
import { format } from 'date-fns';

const THERAPISTS = [
  { 
    id: 1, 
    name: 'Dr. Aris Thorne', 
    specialty: 'Cognitive Neuropsychology', 
    rating: 4.9, 
    reviews: 156, 
    price: '$180/hr', 
    distance: '0.8 miles away',
    location: '101 Cybernetics Plaza, Tech District',
    photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Specializing in neural plasticity and cognitive restructuring. My practice integrates advanced neuropsychological assessment with empathetic therapeutic protocols.'
  },
  { 
    id: 2, 
    name: 'Dr. Lyssa Vance', 
    specialty: 'Trauma & Resilience Specialist', 
    rating: 4.8, 
    reviews: 112, 
    price: '$145/hr', 
    distance: '1.5 miles away',
    location: '542 Serenity Garden, West Side',
    photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Dedicated to guiding individuals through recovery from complex trauma. I utilize a somatic-based approach to restore emotional equilibrium and build lasting resilience.'
  },
  { 
    id: 3, 
    name: 'Dr. Kaelen Stark', 
    specialty: 'Digital Wellness Architect', 
    rating: 5.0, 
    reviews: 245, 
    price: '$210/hr', 
    distance: '2.2 miles away',
    location: '789 Innovation Way, Silicon Valley',
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'A pioneer in digital health, helping high-performance professionals navigate "techno-stress" and maintain mental clarity in hyper-connected environments.'
  },
  { 
    id: 4, 
    name: 'Dr. Mira Sundar', 
    specialty: 'Mindfulness & Performance', 
    rating: 4.9, 
    reviews: 189, 
    price: '$165/hr', 
    distance: '3.1 miles away',
    location: '33 Zenith Heights, Downtown',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71f153678e?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Integrating Eastern mindfulness traditions with modern performance psychology to help clients achieve a state of flow and emotional mastery.'
  },
  { 
    id: 5, 
    name: 'Dr. Jaxon Reed', 
    specialty: 'Behavioral Health Scientist', 
    rating: 4.7, 
    reviews: 94, 
    price: '$130/hr', 
    distance: '4.5 miles away',
    location: '22 Research Park, East Campus',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Evidence-based practitioner focusing on habit formation and cognitive behavioral interventions for long-term lifestyle optimization.'
  },
  { 
    id: 6, 
    name: 'Dr. Elara Vance', 
    specialty: 'Holistic Psychotherapy', 
    rating: 4.9, 
    reviews: 132, 
    price: '$155/hr', 
    distance: '1.2 miles away',
    location: '44 Bloom Court, Green Valley',
    photo: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Treating the mind-body complex through a holistic lens. Specializing in anxiety management through nutritional psychiatry and integrative therapy.'
  },
  { 
    id: 7, 
    name: 'Dr. Orion Blake', 
    specialty: 'Addiction Medicine', 
    rating: 5.0, 
    reviews: 410, 
    price: '$230/hr', 
    distance: '2.8 miles away',
    location: '88 Recovery Row, Harbor View',
    photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Expert in clinical addiction recovery and neural detoxification. I provide high-intensity support for complex dependency challenges.'
  },
  { 
    id: 8, 
    name: 'Dr. Sophia Moon', 
    specialty: 'Sleep & Circadian Health', 
    rating: 4.8, 
    reviews: 105, 
    price: '$175/hr', 
    distance: '3.7 miles away',
    location: '12 Dreamscape Lane, Quiet Hills',
    photo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=400&h=400',
    bio: 'Optimizing mental health through the science of sleep. My protocols address the fundamental biological rhythms that govern emotional stability.'
  },
];

export default function TherapistFinder() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState<typeof THERAPISTS[0] | null>(null);
  const [userAppointments, setUserAppointments] = useState<any[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  useEffect(() => {
    async function fetchUserAppointments() {
      if (!user) return;
      const path = 'appointments';
      try {
        const q = query(
          collection(db, path),
          where('userId', '==', user.uid),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserAppointments(fetched);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }
    fetchUserAppointments();
  }, [user, isBookingModalOpen]); // Re-fetch when a new booking is made

  const hasPendingAppointment = selectedTherapist 
    ? userAppointments.find(apt => apt.therapistId === selectedTherapist.id)
    : null;

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20">
      <header className="space-y-8 relative py-10 overflow-hidden text-center lg:text-left">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/10 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 border border-white/10 text-brand-teal rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl backdrop-blur-md mx-auto lg:mx-0"
          >
            <Shield className="w-4 h-4 animate-pulse" /> Verified Professional Network
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none"
          >
            Professional <span className="glow-text">Uplink</span>
          </motion.h1>
          <div className="relative max-w-2xl mx-auto lg:mx-0">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-accent w-6 h-6" />
            <input 
              type="text" 
              placeholder="Filter by neural compatibility, specialty, or region..."
              className="w-full pl-16 pr-6 py-6 rounded-3xl glass-card bg-white/5 border-white/10 focus:ring-4 focus:ring-brand-accent/20 text-white font-bold placeholder:text-slate-600 outline-none transition-all text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 h-[800px]">
        {/* List */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 space-y-4 overflow-y-auto pr-4 custom-scrollbar"
        >
          {THERAPISTS.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.specialty.toLowerCase().includes(search.toLowerCase())).map((t, idx) => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedTherapist(t)}
              className={cn(
                "glass-card p-6 flex flex-col gap-6 cursor-pointer transition-all duration-500 border-white/5 group relative overflow-hidden",
                selectedTherapist?.id === t.id ? "border-brand-accent shadow-[0_0_40px_rgba(59,130,246,0.1)] bg-white/10" : "hover:border-white/20",
                userAppointments.some(apt => apt.therapistId === t.id) && "opacity-90"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex gap-6 mb-2 relative z-10">
                <div className="relative">
                  <img src={t.photo} alt={t.name} className="w-20 h-20 rounded-[2rem] object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  <div className="absolute -bottom-2 -right-2 bg-brand-dark p-1.5 rounded-full border-2 border-slate-900">
                    <div className="w-2 h-2 bg-brand-teal rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-2xl text-white tracking-tighter leading-tight">{t.name}</h3>
                    <div className="flex items-center gap-1.5 text-brand-teal">
                      <Star className="w-4 h-4 fill-brand-teal" />
                      <span className="text-sm font-black tabular-nums">{t.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-brand-accent/80">{t.specialty}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <MapPin className="w-4 h-4 text-brand-teal" />
                  <span>{t.distance}</span>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-xl font-black text-white tabular-nums tracking-tighter">{t.price}</span>
                  {userAppointments.some(apt => apt.therapistId === t.id) ? (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-teal bg-brand-teal/10 px-4 py-2 rounded-2xl border border-brand-teal/20">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Node Active</span>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTherapist(t);
                        setIsBookingModalOpen(true);
                      }}
                      className="text-[10px] font-black uppercase tracking-[0.2em] bg-white text-brand-dark px-6 py-2.5 rounded-2xl hover:bg-brand-accent hover:text-white transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Profile Detail or Map */}
        <div className="lg:col-span-2 space-y-8 overflow-y-auto custom-scrollbar pr-2">
          {selectedTherapist ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 space-y-12 border-white/5 bg-slate-900/40 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-[80px]" />
              <div className="flex flex-col md:flex-row gap-12 items-center md:items-start text-center md:text-left relative z-10">
                <div className="relative">
                  <img 
                    src={selectedTherapist.photo} 
                    alt={selectedTherapist.name} 
                    className="w-64 h-64 rounded-[4rem] object-cover shadow-[0_40px_100px_rgba(0,0,0,0.5)] border-4 border-white/5 ring-8 ring-white/5"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-4 inset-x-0 flex justify-center">
                    <div className="bg-brand-teal px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-2xl border-4 border-slate-900">
                      Top Ranked
                    </div>
                  </div>
                </div>
                <div className="space-y-6 flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tighter glow-text mb-2 leading-none">{selectedTherapist.name}</h2>
                      <p className="text-brand-accent font-black text-xl uppercase tracking-widest">{selectedTherapist.specialty}</p>
                    </div>
                    <div className="bg-white/5 px-6 py-3 rounded-[2rem] flex items-center gap-3 border border-white/10 backdrop-blur-md">
                      <Star className="w-8 h-8 fill-brand-teal text-brand-teal" />
                      <div className="text-left leading-none">
                        <span className="block font-black text-white text-3xl tabular-nums leading-none mb-1">{selectedTherapist.rating}</span>
                        <span className="text-slate-500 font-bold text-[10px] tracking-widest uppercase">{selectedTherapist.reviews} AUDITS</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xl leading-relaxed font-bold italic">
                    "{selectedTherapist.bio}"
                  </p>
                  <div className="flex flex-wrap gap-4 pt-4">
                    <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl text-slate-400 border border-white/5 font-black uppercase tracking-widest text-[10px]">
                      <MapPin className="w-4 h-4 text-brand-accent" />
                      <span>{selectedTherapist.distance}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-brand-teal/10 px-6 py-3 rounded-2xl text-brand-teal border border-brand-teal/20 font-black uppercase tracking-widest text-[10px]">
                      <span>Starting at {selectedTherapist.price}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-white/5 relative z-10">
                <div className="p-10 glass-card bg-white/5 border-white/5 space-y-8 flex flex-col justify-between group hover:bg-white/10 transition-all">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-brand-accent/20 rounded-[1.5rem] flex items-center justify-center text-brand-accent shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <h4 className="font-black text-2xl text-white tracking-tight">Sync Protocol</h4>
                    </div>
                    <p className="text-slate-500 font-bold leading-relaxed">Establish a secure, encrypted audio-visual link for instant multi-modal assessment.</p>
                  </div>
                  <button 
                    onClick={() => setIsChatModalOpen(true)}
                    className="w-full bg-white/5 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs border border-white/10 hover:bg-white hover:text-brand-dark transition-all duration-500 shadow-2xl"
                  >
                    Initialize Link
                  </button>
                </div>

                <div className="p-10 bg-brand-accent rounded-[3.5rem] shadow-[0_30px_80px_rgba(59,130,246,0.3)] space-y-8 text-white min-h-[300px] flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                  <Sparkles className="absolute -bottom-10 -right-10 w-48 h-48 text-white/10 rotate-12 group-hover:scale-125 transition-transform duration-700" />
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-[1.5rem] flex items-center justify-center backdrop-blur-md border border-white/20">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <h4 className="font-black text-2xl tracking-tight">{hasPendingAppointment ? 'Apt. Synchronized' : 'Secure Session'}</h4>
                    </div>
                    {hasPendingAppointment ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-white">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Priority Uplink Confirmed</span>
                        </div>
                        <p className="text-white/80 text-lg font-bold">
                          Session scheduled for <span className="text-white underline underline-offset-8 decoration-white/40">{format(new Date(hasPendingAppointment.date), 'MMMM do')}</span> @ <span className="text-white">{hasPendingAppointment.time}</span>.
                        </p>
                      </div>
                    ) : (
                      <p className="text-white/80 font-bold text-lg leading-relaxed">Reserve a 60-cycle dedicated neural maintenance session at your preferred marker.</p>
                    )}
                  </div>
                  
                  {!hasPendingAppointment && (
                    <button 
                      onClick={() => setIsBookingModalOpen(true)}
                      className="w-full bg-white text-brand-dark py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl relative z-10"
                    >
                      Initialize Session
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-card rounded-[4rem] border-white/5 bg-slate-900/40 relative min-h-[600px] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 via-transparent to-brand-purple/5 pointer-events-none" />
              <div className="text-center space-y-8 p-12 max-w-md relative z-10">
                <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center mx-auto border border-white/10 shadow-inner group overflow-hidden">
                  <div className="absolute inset-0 bg-brand-accent/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Info className="w-16 h-16 text-slate-500 animate-pulse relative z-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-black text-white tracking-tighter leading-none">Select Neural Candidate</h3>
                  <p className="text-slate-500 font-bold leading-relaxed text-lg italic">
                    Connect with high-fidelity empathic intelligence nodes and authorized support specialists.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        therapist={selectedTherapist}
      />

      <TherapistChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        therapist={selectedTherapist}
      />
    </div>
  );
}
