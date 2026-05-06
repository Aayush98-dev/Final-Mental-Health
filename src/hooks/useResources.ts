import { useState, useCallback, useEffect } from 'react';
import { Recommendation, fetchResources } from '../services/recommendationService';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query as firestoreQuery, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export function useResources(initialCategory: string) {
  const { user } = useAuth();
  const [resources, setResources] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  const load = useCallback(async (cat: string) => {
    setLoading(true);
    setError(null);
    try {
      let queryTarget = cat;
      
      // Special handling for personal "For You" category
      if (cat === 'For You' && user) {
        const path = 'emotionLogs';
        try {
          const q = firestoreQuery(
            collection(db, path),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          const snapshot = await getDocs(q);
          queryTarget = !snapshot.empty ? snapshot.docs[0].data().emotion : 'Neutral';
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      } else if (cat === 'For You') {
        queryTarget = 'Neutral';
      }

      const data = await fetchResources({ 
        emotion: queryTarget, 
        maxVideos: 6, 
        maxArticles: 6 
      });
      
      setResources(data);
    } catch (err) {
      console.error("Resource load error:", err);
      setError("Failed to sync library. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load(activeCategory);
  }, [activeCategory, load]);

  return {
    resources,
    loading,
    error,
    activeCategory,
    setActiveCategory,
    refresh: () => load(activeCategory)
  };
}
