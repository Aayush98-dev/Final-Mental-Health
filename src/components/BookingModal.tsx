import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { apiHistoryService } from '../services/apiHistoryService';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapist: {
    id: number;
    name: string;
    specialty: string;
    price: string;
    photo: string;
  } | null;
}

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
];

export default function BookingModal({ isOpen, onClose, therapist }: BookingModalProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [step, setStep] = useState<'schedule' | 'success'>('schedule');
  const [error, setError] = useState<string | null>(null);

  // Generate next 7 days for selection
  const days = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i + 1));

  useEffect(() => {
    if (isOpen && therapist && selectedDate) {
      checkAvailability();
    }
  }, [isOpen, therapist, selectedDate]);

  const checkAvailability = async () => {
    if (!therapist || !selectedDate) return;
    setCheckingAvailability(true);
    setError(null);
    const path = 'appointments';
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const q = query(
        collection(db, path),
        where('therapistId', '==', therapist.id),
        where('date', '==', dateStr)
      );
      const snapshot = await getDocs(q);
      const booked = snapshot.docs.map(doc => doc.data().time);
      setBookedSlots(booked);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
      setError("Failed to check availability. Please try again.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleBooking = async () => {
    if (!user || !therapist || !selectedDate || !selectedTime) return;
    setLoading(true);
    setError(null);
    const path = 'appointments';
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Double check availability before final booking
      try {
        const q = query(
          collection(db, path),
          where('therapistId', '==', therapist.id),
          where('date', '==', dateStr),
          where('time', '==', selectedTime)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          setError("This slot was just taken. Please choose another time.");
          checkAvailability();
          return;
        }

        await addDoc(collection(db, path), {
          userId: user.uid,
          userEmail: user.email,
          therapistId: therapist.id,
          therapistName: therapist.name,
          date: dateStr,
          time: selectedTime,
          price: therapist.price,
          status: 'pending',
          createdAt: serverTimestamp()
        });

        // Sync with MongoDB Atlas
        apiHistoryService.logAppointment(
          user.uid, 
          therapist.id.toString(), 
          therapist.name, 
          dateStr, 
          selectedTime, 
          'pending'
        );
      } catch (innerErr) {
        handleFirestoreError(innerErr, OperationType.WRITE, path);
      }

      setStep('success');
    } catch (err) {
      setError("Failed to complete booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep('schedule');
    setSelectedTime(null);
    setError(null);
    onClose();
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
            onClick={resetAndClose}
            className="absolute inset-0 bg-brand-dark/80 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-2xl glass-card bg-brand-dark/60 border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 via-transparent to-brand-purple/5 pointer-events-none" />
            
            {step === 'schedule' ? (
              <div className="p-10 lg:p-12 space-y-10 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="flex gap-6 items-center">
                    <img 
                      src={therapist.photo} 
                      alt={therapist.name} 
                      className="w-20 h-20 rounded-[2rem] object-cover ring-4 ring-white/5 shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tighter leading-none glow-text">Session Uplink</h2>
                      <p className="text-brand-accent font-black text-xs uppercase tracking-[0.2em] mt-2">Node: {therapist.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={resetAndClose}
                    className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-10">
                  {/* Date Selection */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-teal uppercase tracking-[0.4em] flex items-center gap-3">
                      <CalendarIcon className="w-4 h-4" />
                      Temporal Marker
                    </label>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                      {days.map((day) => (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "flex flex-col items-center min-w-[85px] py-5 rounded-[2rem] border transition-all duration-500 group relative overflow-hidden",
                            isSameDay(selectedDate, day)
                              ? "bg-brand-accent border-brand-accent text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)]"
                              : "bg-white/5 border-white/5 text-slate-500 hover:border-white/20 hover:bg-white/10"
                          )}
                        >
                          <span className="text-[10px] uppercase font-black tracking-widest opacity-60 mb-2">
                            {format(day, 'EEE')}
                          </span>
                          <span className="text-2xl font-black tabular-nums">
                            {format(day, 'd')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-teal uppercase tracking-[0.4em] flex items-center gap-3">
                      <Clock className="w-4 h-4" />
                      Neural Alignment Slot
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      {TIME_SLOTS.map((time) => {
                        const isBooked = bookedSlots.includes(time);
                        return (
                          <button
                            key={time}
                            disabled={isBooked}
                            onClick={() => setSelectedTime(time)}
                            className={cn(
                              "py-4 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all relative overflow-hidden flex items-center justify-center group",
                              isBooked 
                                ? "bg-white/5 border-white/5 text-slate-700 cursor-not-allowed grayscale"
                                : selectedTime === time
                                ? "bg-white text-brand-dark border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                : "bg-white/5 border-white/5 text-slate-400 hover:border-brand-accent/30 hover:bg-white/10"
                            )}
                          >
                            <span className="relative z-10">{time}</span>
                            {isBooked && (
                              <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center opacity-40">
                                <X className="w-6 h-6 rotate-45" />
                              </div>
                            )}
                            {selectedTime === time && (
                              <motion.div 
                                layoutId="time-active"
                                className="absolute inset-0 bg-white"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 text-red-400 bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] text-sm font-bold"
                  >
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="tracking-tight leading-relaxed">{error}</p>
                  </motion.div>
                )}

                <div className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-8 border-t border-white/5">
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.4em] mb-2">Protocol Cost</p>
                    <p className="text-4xl font-black text-white glow-text tabular-nums tracking-tighter">{therapist.price}</p>
                  </div>
                  <button
                    disabled={!selectedTime || loading || checkingAvailability}
                    onClick={handleBooking}
                    className="w-full sm:w-[280px] bg-brand-accent text-white py-6 rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-[0_20px_50px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Execute Uplink
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-16 lg:p-20 text-center space-y-10 relative z-10">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="w-32 h-32 bg-brand-teal/20 text-brand-teal rounded-[3rem] flex items-center justify-center mx-auto border-4 border-brand-teal/20 shadow-[0_0_50px_rgba(45,212,191,0.2)]"
                >
                  <CheckCircle2 className="w-16 h-16" />
                </motion.div>
                <div className="space-y-4">
                  <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter glow-text leading-none uppercase">Uplink Confirmed</h2>
                  <p className="text-slate-400 text-xl font-bold max-w-sm mx-auto italic leading-relaxed">
                    Neural maintenance session with <span className="text-brand-accent">{therapist.name}</span> is successfully synchronized.
                  </p>
                </div>
                <div className="bg-white/5 rounded-[3rem] p-10 inline-flex flex-col gap-3 border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/10 to-transparent pointer-events-none" />
                  <span className="text-brand-accent font-black text-3xl tracking-tighter glow-text relative z-10 uppercase">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </span>
                  <span className="text-slate-500 font-black tracking-[0.5em] uppercase text-xs relative z-10">
                    MARKER: {selectedTime}
                  </span>
                </div>
                <div className="pt-10">
                  <button 
                    onClick={resetAndClose}
                    className="w-full bg-white text-brand-dark py-6 rounded-full font-black uppercase tracking-[0.3em] text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_30px_60px_rgba(0,0,0,0.3)]"
                  >
                    Return to Matrix
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
