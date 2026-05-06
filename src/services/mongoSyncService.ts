/**
 * Service to sync application data with the MongoDB Atlas backend.
 */

export async function syncProfile(data: { userId: string, displayName: string, email: string, photoURL: string }) {
  try {
    const response = await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error('Error syncing profile to MongoDB:', err);
  }
}

export async function syncDetection(data: { 
  userId?: string, 
  userEmail?: string, 
  emotion: string, 
  score: number, 
  insight: string 
}) {
  try {
    const response = await fetch('/api/detections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error('Error syncing detection to MongoDB:', err);
  }
}

export async function syncConsultation(data: {
  userId?: string,
  therapistId: number,
  therapistName: string,
  type: string,
  message?: string
}) {
  try {
    const response = await fetch('/api/consultations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error('Error syncing consultation to MongoDB:', err);
  }
}
