import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, Loader2, Sparkles, AlertCircle, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';

import { apiHistoryService } from '../services/apiHistoryService';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
}

interface TherapistChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapist: {
    id: number;
    name: string;
    specialty: string;
    photo: string;
    location: string;
    bio: string;
  } | null;
}

export default function TherapistChatModal({ isOpen, onClose, therapist }: TherapistChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingApts, setFetchingApts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Fetch appointments when modal opens
  useEffect(() => {
    async function fetchApts() {
      if (!isOpen || !therapist || !user) return;
      setFetchingApts(true);
      const path = 'appointments';
      try {
        const q = query(
          collection(db, path),
          where('userId', '==', user.uid),
          where('therapistId', '==', therapist.id),
          orderBy('date', 'asc')
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];
        setAppointments(fetched);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      } finally {
        setFetchingApts(false);
      }
    }
    fetchApts();
  }, [isOpen, therapist, user]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && therapist) {
      setMessages([{
        role: 'model',
        text: `Hello! I'm ${therapist.name}'s AI assistant. I'm here to provide support, listen to your concerns, and help you prepare for a session. I can also help you find our location or check your scheduled appointments. How are you feeling today?`,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, therapist]);

  const handleSend = async () => {
    if (!input.trim() || !therapist) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Log contact request to MongoDB Atlas
    if (user && therapist) {
      apiHistoryService.logContactRequest(user.uid, therapist.id.toString(), therapist.name, input);
    }

    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Create chat history for Gemini
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const aptContext = appointments.length > 0 
        ? `The user has the following appointments with ${therapist.name}: ${appointments.map(a => `${a.date} at ${a.time} (${a.status})`).join(', ')}.`
        : "The user has no appointments scheduled with this therapist yet.";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: input }] }
        ],
        config: {
          systemInstruction: `You are a professional, empathetic, and supportive AI Therapist Assistant representing ${therapist.name}, who specializes in ${therapist.specialty}. 
          
          SPECIFIC CONTEXT ABOUT ${therapist.name}:
          - Location: ${therapist.location}
          - Biography: ${therapist.bio}
          - Current user's appointments: ${aptContext}
          
          Your goal is to provide immediate emotional support, active listening, and gentle guidance. 
          Important Guidelines:
          1. Be empathetic and non-judgmental.
          2. If the user asks about their appointments, search your context and provide the dates and times found above.
          3. If the user asks where the clinic is, provide the location: ${therapist.location}.
          4. If a user wants to know anything about the therapist, refer to their biography: ${therapist.bio}.
          5. Use open-ended questions to encourage the user to share more.
          6. If the user mentions self-harm or immediate crisis, provide resources and encourage them to seek emergency professional help.
          7. Do not diagnose conditions, but rather offer therapeutic reflections.
          8. Keep responses concise but warm.
          9. Address the user based on the context of the conversation.`,
          temperature: 0.7,
        }
      });

      const modelText = response.text || "I'm here to listen. Could you tell me more about that?";
      
      setMessages(prev => [...prev, {
        role: 'model',
        text: modelText,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error("AI Chat Error:", err);
      setError("I'm having trouble connecting right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  if (!therapist) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-dark/80 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-2xl glass-card bg-brand-dark/60 border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] flex flex-col h-[85vh] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 via-transparent to-brand-purple/5 pointer-events-none" />

            {/* Header */}
            <div className="p-8 bg-brand-dark/40 border-b border-white/5 relative z-10 flex flex-col gap-6 backdrop-blur-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img 
                      src={therapist.photo} 
                      alt={therapist.name} 
                      className="w-16 h-16 rounded-[1.5rem] object-cover ring-2 ring-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-teal border-4 border-brand-dark rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-white tracking-tighter leading-none glow-text">Neural Bridge</h3>
                    <p className="text-brand-accent font-black text-[10px] uppercase tracking-[0.3em] mt-2">LINKED: {therapist.name}</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-wrap gap-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2.5 text-[10px] uppercase font-black tracking-[0.2em] text-slate-500">
                  <MapPin className="w-4 h-4 text-brand-teal" />
                  <span>{therapist.location}</span>
                </div>
                {appointments.length > 0 && (
                  <div className="flex items-center gap-2.5 text-[10px] uppercase font-black tracking-[0.2em] text-brand-accent animate-pulse">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{appointments.length} SYNCED SESSIONS</span>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 bg-black/20 custom-scrollbar relative z-10"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent)] pointer-events-none" />
              
              {messages.map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 max-w-[90%]",
                    m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl relative group",
                    m.role === 'user' ? "bg-brand-accent text-white" : "bg-brand-dark border border-white/10 text-brand-teal"
                  )}>
                    <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    {m.role === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                  </div>
                  <div className={cn(
                    "p-6 rounded-[2.5rem] text-sm font-bold leading-relaxed shadow-2xl relative overflow-hidden",
                    m.role === 'user' 
                      ? "bg-brand-accent text-white rounded-tr-none shadow-[0_10px_30px_rgba(59,130,246,0.2)]" 
                      : "glass-card bg-white/5 text-slate-300 border border-white/5 rounded-tl-none"
                  )}>
                    {m.role === 'user' && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                    )}
                    {m.text}
                  </div>
                </motion.div>
              ))}
              
              {loading && (
                <div className="flex gap-4 max-w-[90%]">
                  <div className="w-11 h-11 rounded-2xl bg-brand-dark border border-white/10 text-brand-teal flex items-center justify-center shrink-0 shadow-2xl animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="glass-card bg-white/5 p-6 rounded-[2.5rem] rounded-tl-none border border-white/5 flex gap-3">
                    <div className="w-2 h-2 bg-brand-teal rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-brand-teal rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-brand-teal rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, rotate: -2 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  className="flex items-center gap-4 text-red-400 bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] text-sm font-black uppercase tracking-widest"
                >
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  {error}
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-8 bg-brand-dark/60 border-t border-white/5 relative z-10 backdrop-blur-3xl">
              <div className="relative group">
                <div className="absolute inset-0 bg-brand-accent/20 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <input 
                  type="text" 
                  placeholder="Transmit message to core..."
                  className="w-full pl-8 pr-20 py-6 rounded-[2rem] glass-card bg-white/5 border-white/10 focus:ring-4 focus:ring-brand-accent/20 text-white placeholder:text-slate-600 font-bold outline-none transition-all text-base relative z-10"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-brand-dark p-4 rounded-2xl hover:bg-brand-accent hover:text-white transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-2xl z-20 hover:scale-110 active:scale-90"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-6 flex items-center justify-center gap-3 text-[10px] uppercase font-black tracking-[0.4em] text-slate-600">
                <Sparkles className="w-4 h-4 text-brand-accent" />
                <span>Neural Engine Synchronized</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
