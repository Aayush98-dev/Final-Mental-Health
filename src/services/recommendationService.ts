import { GoogleGenAI, Type } from "@google/genai";

export interface Recommendation {
  id: string;
  title: string;
  type: 'video' | 'article' | 'activity' | 'advice';
  summary: string;
  url: string;
  thumbnail?: string;
}

export interface WellnessAnalysis {
  score: number;
  insight: string;
  educationalInsight?: string;
  recommendations: Recommendation[];
  detectedEmotion?: string;
  critical: boolean;
}

export interface DetailedActivity {
  title: string;
  explanation: string;
}

const EMOTIONS_LIST = ['Happy', 'Sad', 'Angry', 'Stress', 'Neutral'];

const EMOTION_QUERIES: Record<string, string> = {
  'Happy': 'positive psychology, maintaining joy, mindful gratitude, flow state',
  'Sad': 'coping with sadness, emotional resilience, uplifting philosophy, gentle self care',
  'Angry': 'anger management, emotional regulation, Stoic calm, physical release for anger',
  'Stress': 'stress relief, burnout prevention, vagus nerve exercises, deep relaxation',
  'Neutral': 'wellness optimization, focus and clarity, productive morning routine, digital minimalism',
};

function normalizeEmotion(emotion?: string): string {
  if (!emotion) return 'Neutral';
  const normalized = emotion.toLowerCase();
  
  // Direct mapping check first
  if (normalized.includes('happy') || normalized.includes('joy') || normalized.includes('glad')) return 'Happy';
  if (normalized.includes('sad') || normalized.includes('grief') || normalized.includes('unhappy')) return 'Sad';
  if (normalized.includes('angr') || normalized.includes('frustrat') || normalized.includes('irrit')) return 'Angry';
  if (normalized.includes('stress') || normalized.includes('anxious') || normalized.includes('overwhelm')) return 'Stress';
  if (normalized.includes('neutral') || normalized.includes('calm') || normalized.includes('okay')) return 'Neutral';

  const found = EMOTIONS_LIST.find(e => normalized.includes(e.toLowerCase()));
  return found || 'Neutral';
}

export interface AnalyzeParams {
  facialImage?: { mimeType: string; data: string };
  voiceAudio?: { mimeType: string; data: string };
  textInput?: string;
  history?: string[];
}

export async function analyzeMentalState(params: AnalyzeParams): Promise<WellnessAnalysis> {
  const { facialImage, voiceAudio, textInput, history = [] } = params;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Speed Optimization: Start fetching resources in parallel
  const preliminaryEmotion = normalizeEmotion(textInput);
  const resourcesPromise = fetchResources({ 
    emotion: preliminaryEmotion, 
    maxVideos: 3, 
    maxArticles: 2 
  });

  try {
    const contents: any[] = [];
    
    const contextPrompt = `
      Perform a high-precision multimodal mental wellness analysis.
      
      Data Inputs:
      - Written Context: ${textInput || 'Not provided'}
      - History: ${history.join(', ')}
      
      Expert Diagnostic Guidelines:
      1. FACIAL SCAN (Visuals): If image data is provided, analyze facial landmarks with clinical precision. Examine the corrugator supercilii for tension (stress/anger), the orbicularis oculi for narrowing (fatigue/constriction), and the zygomaticus major for micro-expressions.
      2. ACOUSTIC SCAN (Audio): If audio data is provided, evaluate prosodic features. Analyze fundamental frequency (F0) variability, speech rate, and vocal resonance (formants) to identify signatures of anxiety, depression, or emotional suppression.
      3. COGNITIVE SYNTHESIS: Cross-reference biometric markers with semantic written patterns. Identify "Emotional Masking" where verbal output contradicts physical biometric indicators.
      
      Output Requirements:
      - Wellness Score: 0-100 (100 = Optimal/Thriving, 0 = Critical Distress).
      - Insight: 2-3 sentences of supportive, expert feedback referencing specific biometric cues identified.
      - Educational Insight: 3-4 sentences explaining the neurobiology of this state (e.g., cortisol effects, amygdala activation).
      - Critical: True if severe markers of instability or distress are detected.
      - detectedEmotion: ONE of Happy, Sad, Angry, Stress, Neutral.
      - recommendations: Provide 3-4 wellness activities and 2 pieces of advice.

      Return ONLY a JSON object.
    `;

    contents.push({ text: contextPrompt });

    if (facialImage) {
      contents.push({ inlineData: facialImage });
    }
    if (voiceAudio) {
      contents.push({ inlineData: voiceAudio });
    }

    const dataPromise = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            insight: { type: Type.STRING },
            educationalInsight: { type: Type.STRING },
            critical: { type: Type.BOOLEAN },
            activities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            advice: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            detectedEmotion: { type: Type.STRING }
          }
        }
      }
    });

    const response = await dataPromise;
    let text = response.text || '{}';
    if (text.includes('```')) {
      text = text.replace(/```json|```/g, '').trim();
    }
    
    const data = JSON.parse(text);
    
    // Performance: Refresh resources based on final detected emotion
    const detectedEmotion = normalizeEmotion(data.detectedEmotion);
    let finalResources: Recommendation[];
    
    if (detectedEmotion !== preliminaryEmotion || !textInput) {
      finalResources = await fetchResources({ 
        emotion: detectedEmotion, 
        maxVideos: 3, 
        maxArticles: 2 
      });
    } else {
      finalResources = await resourcesPromise;
    }

    const recommendations: Recommendation[] = [];
    const activities = data.activities || [];
    const advice = data.advice || [];

    activities.forEach((act: any, idx: number) => {
      recommendations.push({
        id: `ai-act-${idx}`,
        title: act.title,
        type: 'activity',
        summary: act.description,
        url: '#'
      });
    });

    advice.forEach((adv: any, idx: number) => {
      recommendations.push({
        id: `ai-advice-${idx}`,
        title: adv.title,
        type: 'advice',
        summary: adv.description,
        url: '#'
      });
    });
    
    // Sort final result to have AI advice first, then videos/articles
    return {
      score: data.score,
      insight: data.insight,
      educationalInsight: data.educationalInsight,
      critical: data.critical,
      detectedEmotion: data.detectedEmotion,
      recommendations: [...recommendations, ...finalResources]
    };

  } catch (err) {
    console.error("Mental State Analysis Failed:", err);
    return {
      score: 50,
      insight: "Biometric synchronization encounterd a variance. Let's focus on foundational wellness protocols.",
      critical: false,
      recommendations: [
        { id: 'fallback-1', title: 'Box Breathing', type: 'activity', summary: 'A tactical breathing technique to reset your nervous system.', url: '#' },
        { id: 'fallback-2', title: 'Mindful Grounding', type: 'activity', summary: 'Connect with your immediate surroundings to reduce cognitive load.', url: '#' },
        { id: 'fallback-3', title: 'Hydration Sync', type: 'advice', summary: 'Ensure optimal biometric performance with proper hydration.', url: '#' }
      ]
    };
  }
}

export async function fetchResources(params: { emotion: string; maxVideos?: number; maxArticles?: number }): Promise<Recommendation[]> {
  const emotion = normalizeEmotion(params.emotion);
  const { maxVideos = 5, maxArticles = 5 } = params;
  
  const queryBase = EMOTION_QUERIES[emotion] || 'wellness';
  const youtubeKey = process.env.YOUTUBE_API_KEY || (import.meta as any).env.VITE_YOUTUBE_API_KEY;

  const fetchYoutube = async () => {
    if (!youtubeKey) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      console.warn("YouTube fetch timed out after 10s");
    }, 10000);
    try {
      // Pick a specific search term from the base for better results
      const searchTerms = queryBase.split(',').map(s => s.trim());
      const selectedQuery = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      const query = encodeURIComponent(`mental health ${selectedQuery}`);
      
      const ytResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxVideos}&q=${query}&key=${youtubeKey}`,
        { signal: controller.signal }
      );

      if (!ytResponse.ok) {
        const errorText = await ytResponse.text();
        throw new Error(`YouTube API error: ${ytResponse.status} - ${errorText}`);
      }
      
      const ytData = await ytResponse.json();
      
      return (ytData.items || []).filter((item: any) => item.id.videoId).map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        type: 'video' as const,
        summary: item.snippet.description,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails.high.url
      }));
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.error("YouTube request was aborted due to timeout");
      } else {
        console.error("YouTube fetch failed:", e);
      }
      return [];
    } finally {
      clearTimeout(timeout);
    }
  };

  const fetchWikipedia = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      console.warn("Wikipedia fetch timed out after 8s");
    }, 8000);
    try {
      const wikiQuery = encodeURIComponent(queryBase.split(',')[0]);
      const wikiResponse = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${wikiQuery}&format=json&origin=*&srlimit=${maxArticles}`,
        { signal: controller.signal }
      );
      
      if (!wikiResponse.ok) throw new Error(`Wikipedia API error: ${wikiResponse.status}`);
      const wikiData = await wikiResponse.json();
      
      return (wikiData.query?.search || []).map((item: any) => ({
        id: `wiki-${item.pageid}`,
        title: item.title,
        type: 'article' as const,
        summary: item.snippet.replace(/<[^>]*>/g, ''),
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
      }));
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.error("Wikipedia request was aborted due to timeout");
      } else {
        console.error("Wikipedia fetch failed:", e);
      }
      return [];
    } finally {
      clearTimeout(timeout);
    }
  };

  const [ytResults, wikiResults] = await Promise.all([fetchYoutube(), fetchWikipedia()]);
  return [...ytResults, ...wikiResults];
}

export async function fetchDetailedActivities(emotion: string): Promise<DetailedActivity[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User is feeling ${emotion}. Suggest 3 simple, effective mental health activities with short explanations tailored to this emotion. Return as JSON array of objects: [{"title": "...", "explanation": "..."}]`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["title", "explanation"]
          }
        }
      }
    });
    
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Gemini activity skip failed", e);
    return [
      { title: "Deep Breathing", explanation: "Focus on your breath for 2 minutes to center yourself." },
      { title: "Short Walk", explanation: "A brief change of environment can help reset your mood." },
      { title: "Journaling", explanation: "Write down your thoughts to process them better." }
    ];
  }
}
