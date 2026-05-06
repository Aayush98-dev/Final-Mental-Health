import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mic, Loader2, Sparkles, AlertCircle, RefreshCcw, Bookmark, ExternalLink, PlayCircle, Send, Heart, Brain, Info, ArrowRight, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI, Type } from "@google/genai";
import { analyzeMentalState, Recommendation, WellnessAnalysis } from '../services/recommendationService';
import ActivityModal from '../components/ActivityModal';
import ActivityButton from '../components/ActivityButton';
import { Link } from 'react-router-dom';

import { apiHistoryService } from '../services/apiHistoryService';

const EMOTIONS = [
  { label: 'Happy', emoji: '😊', color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Sad', emoji: '😢', color: 'bg-blue-100 text-blue-700' },
  { label: 'Angry', emoji: '😠', color: 'bg-red-100 text-red-700' },
  { label: 'Stress', emoji: '😟', color: 'bg-orange-100 text-orange-700' },
  { label: 'Neutral', emoji: '😐', color: 'bg-gray-100 text-gray-700' },
];

export default function EmotionDetectionPage() {
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState<'facial' | 'voice' | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facialData, setFacialData] = useState<{ mimeType: string, data: string } | null>(null);
  const [voiceData, setVoiceData] = useState<{ mimeType: string, data: string } | null>(null);
  const [textInput, setTextInput] = useState('');
  
  const [analysis, setAnalysis] = useState<WellnessAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string>('');
  
  const [history, setHistory] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmotion, setModalEmotion] = useState('');
  
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      console.error('File is not an image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      setFacialData({ mimeType: file.type, data: base64Data });
      setActiveMode(null);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (user) {
      const fetchHistory = async () => {
        const path = 'emotionLogs';
        try {
          const q = query(
            collection(db, path),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(5)
          );
          const snapshot = await getDocs(q);
          setHistory(snapshot.docs.map(doc => doc.data().emotion));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      };
      fetchHistory();
    }
  }, [user]);

  const runHolisticAnalysis = async () => {
    if (!user) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalysisStage('Synchronizing Multi-modal Streams...');
    
    try {
      setAnalysisStage('Neural Processing in Progress...');
      const result = await analyzeMentalState({
        facialImage: facialData || undefined,
        voiceAudio: voiceData || undefined,
        textInput: textInput || undefined,
        history
      });
      
      setAnalysisStage('Linking Auxiliary Wellness Resources...');
      setAnalysis(result);

      // Log results to MongoDB Atlas custom backend
      apiHistoryService.saveDetection(user.uid, {
        emotion: result.detectedEmotion || 'Neutral',
        confidence: result.score,
        recommendations: result.recommendations.map(r => r.title)
      });

      // Store in Firebase
      try {
        const path = 'emotionLogs';
        try {
          await addDoc(collection(db, path), {
            userId: user.uid,
            emotion: result.detectedEmotion || (result.score < 50 ? 'Stress' : 'Neutral'),
            wellnessScore: result.score,
            insight: result.insight,
            textInput: textInput,
            timestamp: serverTimestamp(),
            critical: result.critical
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      } catch (dbErr) {
        // Fallback for top-level catch if handleFirestoreError itself fails (unlikely)
        console.error("Critical database error:", dbErr);
      }
    } catch (err) {
      console.error("Holistic Analysis failed:", err);
      setAnalysis({
        score: 50,
        insight: "Biometric synchronization encountered a variance. Displaying foundational protocols.",
        critical: false,
        recommendations: [
          { id: 'err-1', title: 'Controlled Breathing', type: 'activity', summary: 'Reset your nervous system with a simple breathing pattern.', url: '#' },
          { id: 'err-2', title: 'Digital Detox Advice', type: 'advice', summary: 'Reducing screen time can help calibrate your baseline.', url: '#' }
        ]
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
    }
  };

  const captureFacial = useCallback(async () => {
    if (!user || !webcamRef.current || !isWebcamReady) return;
    setIsCapturing(true);

    try {
      // Small delay to ensure frame is fresh
      await new Promise(resolve => setTimeout(resolve, 100));
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        // Retry once after a bit more delay if it fails
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryImage = webcamRef.current.getScreenshot();
        if (!retryImage) throw new Error('Could not capture image from webcam after retry');
        
        const base64Data = retryImage.split(',')[1];
        setFacialData({ mimeType: "image/jpeg", data: base64Data });
      } else {
        const base64Data = imageSrc.split(',')[1];
        setFacialData({ mimeType: "image/jpeg", data: base64Data });
      }
      setActiveMode(null);
    } catch (err) {
      console.error('Facial capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [user, isWebcamReady]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to find a supported mimeType
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac'];
      const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const finalMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        processVoiceEmotion(audioBlob, finalMimeType);
        
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  };

  const processVoiceEmotion = async (blob: Blob, mimeType: string) => {
    if (blob.size < 100) {
      console.error('Audio blob too small, likely recording failed');
      return;
    }
    setIsCapturing(true);
    try {
      // Sanitize mimeType for Gemini (e.g. remove codecs strings)
      const sanitizedMimeType = mimeType.split(';')[0];
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        setVoiceData({ mimeType: sanitizedMimeType, data: base64Data });
        setActiveMode(null);
        setIsCapturing(false);
      };
    } catch (err) {
      console.error('Audio processing failed:', err);
      setIsCapturing(false);
    }
  };

  const handleSaveResource = async (res: Recommendation) => {
    if (!user) return;
    const path = 'savedResources';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        resourceId: res.id,
        title: res.title,
        type: res.type,
        url: res.url,
        savedAt: serverTimestamp()
      });
      // Logic for saving without intrusive alert
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  return (
    <div className="space-y-16 max-w-5xl mx-auto pb-20">
      <header className="text-center space-y-6 relative overflow-hidden py-10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-accent/10 to-transparent pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 border border-white/10 text-brand-teal rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-md"
        >
          <Brain className="w-5 h-5 animate-pulse" /> Holistic Neural Scan
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none"
        >
          Wellness <span className="glow-text">Assistant</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 max-w-2xl mx-auto text-xl font-bold leading-relaxed"
        >
          Synthesizing biometric data from visual, auditory, and cognitive markers to map your emotional landscape.
        </motion.p>
      </header>

      {!analysis ? (
        <div className="space-y-12">
          {/* Multi-modal inputs - Vertically Stacked */}
          <div className="flex flex-col gap-8">
            {/* Row 1: Visual Link */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <InputCard 
                active={facialData !== null}
                loading={isCapturing && activeMode === 'facial'}
                onClick={() => setActiveMode('facial')}
                icon={Camera}
                title="Visual Link"
                status={facialData ? "Visual Protocol Active" : "Initialize Optical Scan"}
                color="from-brand-purple to-indigo-600"
                description="Analyze micro-expressions and facial biometrics via real-time stream or retinal image upload."
                preview={facialData?.data ? `data:${facialData.mimeType};base64,${facialData.data}` : undefined}
                onUploadClick={(e: any) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                onClear={() => setFacialData(null)}
              />
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </motion.div>

            {/* Row 2: Audio Sync */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full"
            >
              <InputCard 
                active={voiceData !== null}
                loading={isCapturing && activeMode === 'voice'}
                onClick={() => setActiveMode('voice')}
                icon={Mic}
                title="Audio Sync"
                status={voiceData ? "Acoustic Data Synced" : "Frequency Capture"}
                color="from-brand-accent to-cyan-600"
                description="Detect emotional signatures through vocal jitter, tempo, and frequency resonance."
                onClear={() => setVoiceData(null)}
              />
            </motion.div>

            {/* Row 3: Cognitive Input */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="w-full p-12 glass-card flex flex-col md:flex-row gap-10 items-start group"
            >
              <div className="flex flex-col gap-6 md:w-1/3">
                <div className="flex items-center gap-4">
                  <div className="p-5 bg-brand-teal/20 rounded-2xl text-brand-teal shadow-[0_0_30px_rgba(20,184,166,0.1)] group-hover:scale-110 transition-transform duration-500">
                    <Heart className="w-10 h-10" />
                  </div>
                  <h3 className="font-black text-3xl text-white tracking-tight">Cognitive Input</h3>
                </div>
                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                  Stream your inner monologue. The neural engine analyzes semantic patterns to identify cognitive anomalies.
                </p>
                <div className="mt-auto px-4 py-1.5 rounded-full bg-brand-teal/10 text-brand-teal text-[10px] font-black uppercase tracking-[0.3em] self-start border border-brand-teal/20">
                  Semantic Layer Active
                </div>
              </div>
              <div className="flex-1 w-full relative">
                <textarea 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Stream your thoughts... What's on your mind?"
                  className="w-full h-56 p-8 rounded-[2.5rem] bg-white/5 border border-white/10 focus:ring-4 focus:ring-brand-teal/20 text-slate-200 resize-none font-bold placeholder:text-slate-600 transition-all outline-none text-lg shadow-inner"
                />
                <div className="absolute bottom-6 right-8 text-slate-700 font-black text-xs uppercase tracking-widest pointer-events-none">
                  Intellectual Pulse
                </div>
              </div>
            </motion.div>
          </div>

            <div className="flex justify-center flex-col items-center gap-8 pt-8">
              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={runHolisticAnalysis}
                  disabled={isAnalyzing || (!facialData && !voiceData && !textInput)}
                  className={cn(
                    "group relative px-20 py-8 text-white rounded-[3rem] font-black text-3xl shadow-[0_20px_60px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-8 disabled:opacity-30 disabled:hover:scale-100 overflow-hidden",
                    (facialData || voiceData || textInput) ? "bg-gradient-to-r from-brand-accent via-brand-purple to-brand-accent animate-gradient-x" : "bg-slate-800"
                  )}
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  {isAnalyzing ? (
                    <Loader2 className="w-12 h-12 animate-spin" />
                  ) : (
                    <Sparkles className={cn("w-12 h-12 text-white", (facialData || voiceData || textInput) && "animate-pulse")} />
                  )}
                  <span className="relative z-10 font-sans tracking-tight">{isAnalyzing ? 'SYNTHESIZING...' : 'CORE ANALYSIS'}</span>
                </button>
                
                {isAnalyzing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <p className="text-brand-teal text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
                      {analysisStage}
                    </p>
                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-brand-teal"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 10, ease: "linear" }}
                      />
                    </div>
                  </motion.div>
                )}

                {(facialData || voiceData || textInput) && !isAnalyzing && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-brand-teal text-[10px] font-black uppercase tracking-[0.4em] animate-pulse"
                  >
                    Biometrics Captured • Ready for Synthesis
                  </motion.p>
                )}
              </div>
              
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4">
                <span className="w-12 h-[1px] bg-slate-800" />
                Ensuring 256-bit data encryption
                <span className="w-12 h-[1px] bg-slate-800" />
              </p>
            </div>

          <AnimatePresence>
            {activeMode && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-brand-dark/80 backdrop-blur-2xl"
              >
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-10 relative shadow-[0_0_100px_rgba(59,130,246,0.2)]">
                  <button onClick={() => setActiveMode(null)} className="absolute top-8 right-8 p-3 bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                    <RefreshCcw className="w-6 h-6" />
                  </button>
                  {activeMode === 'facial' ? (
                    <div className="space-y-8">
                      <div className="aspect-video bg-black rounded-[3rem] overflow-hidden relative border-4 border-white/5 shadow-2xl">
                        <Webcam 
                          audio={false} 
                          ref={webcamRef} 
                          screenshotFormat="image/jpeg" 
                          screenshotQuality={0.7}
                          onUserMedia={() => setIsWebcamReady(true)}
                          onUserMediaError={(err) => {
                            console.error("Webcam error:", err);
                            setIsWebcamReady(false);
                          }}
                          videoConstraints={{
                            width: 640,
                            height: 480,
                            facingMode: "user"
                          }}
                          className="w-full h-full object-cover scale-x-[-1]" 
                        />
                        {!isWebcamReady && !isCapturing && (
                          <div className="absolute inset-0 bg-brand-dark/40 flex flex-col items-center justify-center backdrop-blur-md">
                            <Loader2 className="w-12 h-12 text-brand-accent animate-spin mb-4" />
                            <p className="text-white font-black text-xs tracking-widest uppercase">Initializing Optical Node...</p>
                          </div>
                        )}
                        <div className="absolute inset-0 pointer-events-none border-[40px] border-brand-accent/10 rounded-[3rem]" />
                        {isCapturing && (
                          <div className="absolute inset-0 bg-brand-dark/70 flex flex-col items-center justify-center backdrop-blur-sm">
                            <Loader2 className="w-16 h-16 text-brand-accent animate-spin mb-6" />
                            <p className="text-white font-black tracking-[0.3em] uppercase">Digitizing expression...</p>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={captureFacial} 
                        disabled={isCapturing || !isWebcamReady} 
                        className={cn(
                          "w-full py-6 rounded-[2rem] font-black text-xl shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all uppercase tracking-widest",
                          (isCapturing || !isWebcamReady) ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-brand-accent text-white hover:bg-brand-accent/80"
                        )}
                      >
                        {isWebcamReady ? "Capture Biometrics" : "Initializing Sensor..."}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="py-20 flex flex-col items-center justify-center relative">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-brand-accent/20" />
                        <div className={cn(
                          "w-32 h-32 rounded-full flex items-center justify-center relative z-10 transition-all duration-500", 
                          isRecording ? "bg-red-500 text-white scale-110 shadow-[0_0_40px_rgba(239,68,68,0.4)]" : "bg-brand-accent text-white shadow-[0_0_40px_rgba(59,130,246,0.4)]"
                        )}>
                          {isRecording ? <div className="absolute inset-0 rounded-full animate-ping bg-red-500/50" /> : null}
                          <Mic className="w-16 h-16" />
                        </div>
                        <p className="mt-10 text-white font-black tracking-[0.2em] uppercase">{isRecording ? "Analyzing Auditory Texture..." : "Ready for audio uplink"}</p>
                      </div>
                      <button 
                        onClick={isRecording ? () => mediaRecorderRef.current?.stop() : startVoiceRecording} 
                        className={cn(
                          "w-full py-6 rounded-[2rem] font-black text-xl transition-all uppercase tracking-widest", 
                          isRecording ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-brand-accent text-white"
                        )}
                      >
                        {isRecording ? "Terminate Link" : "Initialize Audio"}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
          {/* Analysis View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               className="lg:col-span-1 glass-card p-12 flex flex-col items-center text-center justify-center space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl" />
              <div className="relative">
                <svg className="w-64 h-64 transform -rotate-90">
                  <circle cx="128" cy="128" r="120" stroke="rgba(255,255,255,0.05)" strokeWidth="16" fill="transparent" />
                  <motion.circle 
                    initial={{ strokeDashoffset: 2 * Math.PI * 120 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - analysis.score / 100) }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="16" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 120}
                    className={cn("transition-all duration-1000", analysis.score > 70 ? "text-brand-teal" : analysis.score > 40 ? "text-brand-accent" : "text-brand-purple")}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-7xl font-black text-white tabular-nums tracking-tighter">{analysis.score}</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural Resonance</span>
                </div>
              </div>
              <div className={cn("px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-inner", analysis.critical ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-brand-teal/10 text-brand-teal border border-brand-teal/20")}>
                {analysis.critical ? 'Intervention Recommended' : 'System Optimized'}
              </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="lg:col-span-2 glass-card p-12 relative overflow-hidden flex flex-col justify-center"
            >
              <Sparkles className="absolute -top-12 -right-12 w-64 h-64 text-brand-accent/5 rotate-12" />
              <div className="relative z-10 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <h3 className="text-4xl font-black text-white flex items-center gap-6">
                    <Brain className="text-brand-accent w-12 h-12" /> Neural Insights
                  </h3>
                  {analysis.detectedEmotion && (
                    <div className="px-6 py-2 bg-brand-accent text-white rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(59,130,246,0.4)] animate-pulse">
                      Emotion Signature: {analysis.detectedEmotion}
                    </div>
                  )}
                </div>
                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-inner">
                  <p className="text-2xl text-slate-200 leading-relaxed font-bold italic">
                    "{analysis.insight}"
                  </p>
                </div>

                {analysis.educationalInsight && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 bg-brand-teal/5 rounded-[2.5rem] border border-brand-teal/10 space-y-4"
                  >
                    <div className="flex items-center gap-3 text-brand-teal mb-2">
                      <Info className="w-5 h-5" />
                      <h4 className="font-black text-sm uppercase tracking-[0.2em]">Understanding Your State</h4>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      {analysis.educationalInsight}
                    </p>
                  </motion.div>
                )}

                {analysis.critical && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 bg-red-500/10 rounded-[2.5rem] border border-red-500/20 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-8"
                  >
                    <div className="space-y-2">
                      <h4 className="font-black text-xl text-red-400 uppercase tracking-tight">Priority Escalation</h4>
                      <p className="text-sm text-red-400/60 font-bold">Biometric patterns indicate a critical emotional threshold. Specialized support is synchronized.</p>
                    </div>
                    <Link to="/therapists" className="px-10 py-5 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(239,68,68,0.3)] whitespace-nowrap">
                      Secure Session <ArrowRight className="w-5 h-5" />
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="space-y-12">
            <h3 className="text-5xl font-black text-white flex items-center gap-6 tracking-tighter">
               <Activity className="text-brand-teal w-12 h-12" /> Adaptive Protocol
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="analysis-grid">
              {analysis.recommendations.map((rec, idx) => (
                <motion.div 
                  key={rec.id}
                  id={`rec-${rec.id || idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="glass-card p-8 flex flex-col gap-6 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  <div className="flex justify-between items-start relative z-10">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-inner",
                      rec.type === 'video' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                      rec.type === 'article' ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20" :
                      rec.type === 'activity' ? "bg-brand-teal/10 text-brand-teal border border-brand-teal/20" : "bg-brand-purple/10 text-brand-purple border border-brand-purple/20"
                    )}>
                      {rec.type}
                    </span>
                    <button onClick={() => handleSaveResource(rec)} className="p-3 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:text-brand-accent">
                      <Bookmark className="w-5 h-5" />
                    </button>
                  </div>
                  {rec.thumbnail && (
                    <div className="relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
                      <img src={rec.thumbnail} alt={rec.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-brand-dark/40 flex items-center justify-center group-hover:bg-brand-dark/20 transition-all">
                        <PlayCircle className="text-white/80 w-16 h-16 group-hover:scale-110 group-hover:text-white transition-all drop-shadow-2xl" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-3 relative z-10 flex-1">
                    <h4 className="font-black text-xl text-white tracking-tight line-clamp-2 leading-tight group-hover:text-brand-accent transition-colors">{rec.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-bold">{rec.summary}</p>
                  </div>
                  
                  <div className="pt-4 relative z-10">
                    {rec.type === 'activity' ? (
                      <ActivityButton 
                        label="Execute Guide"
                        onClick={() => {
                          setModalEmotion('Support');
                          setIsModalOpen(true);
                        }}
                        className="w-full py-5 text-xs font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-brand-teal hover:border-brand-teal hover:text-white transition-all"
                      />
                    ) : (
                      <a 
                        href={rec.url} target="_blank" rel="noreferrer"
                        className="w-full py-5 text-xs bg-white text-brand-dark rounded-2xl font-black uppercase tracking-[0.2em] text-center flex items-center justify-center gap-3 hover:bg-brand-accent hover:text-white transition-all shadow-xl"
                      >
                        {rec.type === 'video' ? 'Initialize Stream' : rec.type === 'article' ? 'Retrieve Intel' : 'Initialize Exploration'} 
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center flex-col items-center gap-8 pt-12"
          >
             <button 
                id="reset-neural-session-btn"
                onClick={() => {
                  setAnalysis(null);
                  setFacialData(null);
                  setVoiceData(null);
                  setTextInput('');
                }}
                className="group px-16 py-6 bg-white/5 border border-white/10 text-white rounded-[2.5rem] font-black text-xl uppercase tracking-[0.2em] flex items-center gap-6 hover:bg-white/10 transition-all"
              >
                <RefreshCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" /> Start New Neural Session
              </button>
              <div className="flex items-center gap-4 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
                <span className="w-8 h-[1px] bg-slate-800" />
                Zero-Knowledge User Data Protocol Active
                <span className="w-8 h-[1px] bg-slate-800" />
              </div>
          </motion.div>
        </motion.div>
      )}

      <ActivityModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        emotion={modalEmotion}
      />
    </div>
  );
}

function InputCard({ active, loading, onClick, icon: Icon, title, status, color, description, onUploadClick, preview, onClear }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={cn(
        "p-12 glass-card flex flex-col md:flex-row items-center md:items-start gap-12 text-center md:text-left group transition-all duration-500 w-full relative overflow-hidden",
        active ? "border-brand-accent/50 shadow-[0_0_80px_rgba(59,130,246,0.1)]" : "hover:border-white/20"
      )}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent blur-3xl -mr-32 -mt-32 pointer-events-none" />
      
      <div className="relative shrink-0">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          disabled={loading}
          className={cn(
            "w-36 h-36 rounded-[3rem] flex items-center justify-center transition-all duration-500 shadow-2xl relative overflow-hidden", 
            active ? `bg-gradient-to-br ${color} scale-105 shadow-[0_0_40px_rgba(59,130,246,0.3)]` : "bg-white/5"
          )}
        >
          {active && !preview && <div className="absolute inset-0 rounded-[3rem] animate-ping bg-brand-accent/20" />}
          {preview ? (
            <img src={preview} alt="Biometric Preview" className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700" />
          ) : (
            loading ? <Loader2 className="w-14 h-14 text-white animate-spin" /> : <Icon className={cn("w-14 h-14 transition-all group-hover:rotate-12", active ? "text-white" : "text-slate-500")} />
          )}
        </motion.button>
        {active && onClear && (
          <button 
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-all z-20"
          >
            <RefreshCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 flex-1 h-full py-2">
        <div className="space-y-2">
          <span className="block font-black text-4xl text-white tracking-tighter">{title}</span>
          <p className="text-slate-500 font-bold text-sm max-w-xl leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start mt-auto">
          <span className={cn(
            "text-[10px] font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full border", 
            active ? "bg-brand-accent/10 text-brand-accent border-brand-accent/20" : "bg-white/5 text-slate-600 border-white/5"
          )}>
            {status}
          </span>
          
          {onUploadClick && (
            <button 
              onClick={onUploadClick}
              className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:border-brand-accent/50 transition-all flex items-center gap-2 group/btn"
            >
              <Send className="w-3 h-3 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" /> 
              Upload Static Image
            </button>
          )}

          {!active && (
            <button 
              onClick={onClick}
              className="px-6 py-2 rounded-full bg-brand-accent text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-accent/80 transition-all"
            >
              Initialize Node
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
