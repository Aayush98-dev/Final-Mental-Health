import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

import { apiHistoryService } from '../services/apiHistoryService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
  updateProfileData: (data: { displayName?: string, photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  profile: null,
  updateProfileData: async () => {} 
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const updateProfileData = async (data: { displayName?: string, photoURL?: string }) => {
    if (!user) return;

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: data.displayName,
        photoURL: data.photoURL
      });

      // 2. Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      const updatePayload = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(userDocRef, updatePayload, { merge: true });
      
      // Sync with MongoDB Atlas
      fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          displayName: data.displayName || profile.displayName,
          email: profile.email,
          photoURL: data.photoURL || profile.photoURL
        })
      }).catch(err => console.error('MongoDB profile sync update failed:', err));

      // 3. Update local state
      setProfile((prev: any) => ({
        ...prev,
        ...data
      }));
      
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Log login to MongoDB Atlas custom backend
        apiHistoryService.logLogin(user.uid, user.email || 'anonymous');
        
        const userDocRef = doc(db, 'users', user.uid);
        
        try {
          const userDoc = await getDoc(userDocRef);
          let currentProfile;
          
          if (!userDoc.exists()) {
            currentProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            try {
              await setDoc(userDocRef, currentProfile);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
            }
          } else {
            currentProfile = userDoc.data();
          }

          setProfile(currentProfile);
          
          // Sync with MongoDB Atlas
          apiHistoryService.logLogin(user.uid, user.email || 'unknown');
          
          fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              displayName: currentProfile.displayName,
              email: currentProfile.email,
              photoURL: currentProfile.photoURL
            })
          }).catch(err => console.error('MongoDB profile sync failed:', err));

        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profile, updateProfileData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
