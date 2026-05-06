/**
 * API History Service
 * This service communicates with the custom Express/MongoDB backend.
 */

const API_BASE_URL = '/api';

export interface DetectionResult {
  emotion: String;
  confidence: Number;
  recommendations: string[];
}

export const apiHistoryService = {
  /**
   * Log a login event to the custom backend
   */
  logLogin: async (userId: string, email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          device: navigator.userAgent
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to log login:', error);
    }
  },

  /**
   * Save detection results to MongoDB
   */
  saveDetection: async (userId: string, result: DetectionResult) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, result }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to save detection:', error);
    }
  },

  /**
   * Fetch detection history from MongoDB
   */
  getDetectionHistory: async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/detection/${userId}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch history:', error);
      return [];
    }
  },

  /**
   * Log therapist contact request to MongoDB
   */
  logContactRequest: async (userId: string, therapistId: string, therapistName: string, message: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/contacts/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, therapistId, therapistName, message }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to log contact request:', error);
    }
  },
  
  /**
   * Log appointment to MongoDB
   */
  logAppointment: async (userId: string, therapistId: string, therapistName: string, date: string, time: string, status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, therapistId, therapistName, date, time, status }),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to log appointment:', error);
    }
  }
};
