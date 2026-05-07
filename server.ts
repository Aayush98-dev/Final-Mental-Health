import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

  // ******** MongoDB Schemas ---
const detectionSchema = new mongoose.Schema({
  userId: String,
  result: {
    emotion: String,
    confidence: Number,
    recommendations: [String]
  },
  timestamp: { type: Date, default: Date.now }
});

const profileSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  displayName: String,
  email: String,
  photoURL: String,
  updatedAt: { type: Date, default: Date.now }
});

const loginHistorySchema = new mongoose.Schema({
  userId: String,
  email: String,
  device: String,
  timestamp: { type: Date, default: Date.now }
});

const contactRequestSchema = new mongoose.Schema({
  userId: String,
  therapistId: String,
  therapistName: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
  userId: String,
  therapistId: String,
  therapistName: String,
  date: String,
  time: String,
  status: String,
  timestamp: { type: Date, default: Date.now }
});

const Detection = mongoose.model('Detection', detectionSchema);
const Profile = mongoose.model('Profile', profileSchema);
const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);
const ContactRequest = mongoose.model('ContactRequest', contactRequestSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ******** Connect to MongoDB Atlas

  const MONGODB_URI = process.env.MONGODB_URI;
  const isPlaceholder = MONGODB_URI?.includes('<username>') || MONGODB_URI?.includes('<password>');

  if (MONGODB_URI && !isPlaceholder) {
    await mongoose.connect(MONGODB_URI)
      .then(() => console.log('Connected to MongoDB Atlas'))
      .catch(err => {
        if (err.message.includes('authentication failed')) {
          console.error('MongoDB Auth Failed: Please check your MONGODB_URI credentials in Settings.');
        } else {
          console.error('MongoDB connection error:', err);
        }
      });
  } else {
    const reason = isPlaceholder ? 'placeholder credentials detected' : 'URI not found';
    console.warn(`MONGODB_URI ${reason}. Database sync features will be disabled until valid credentials are provided.`);
  }

  // ********** API Routes 

  // Log Login History************

  app.post('/api/auth/login-history', async (req, res) => {
    try {
      const history = new LoginHistory(req.body);
      await history.save();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to log login' });
    }
  });

  // Save User Profile**********

  app.post('/api/user/profile', async (req, res) => {
    try {
      const { userId, displayName, email, photoURL } = req.body;
      const profile = await Profile.findOneAndUpdate(
        { userId },
        { displayName, email, photoURL, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: 'Failed to sync profile' });
    }
  });

  // Save Detection Result*************

  app.post('/api/history/detection', async (req, res) => {
    try {
      const detection = new Detection(req.body);
      await detection.save();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save detection' });
    }
  });

  // Get Detection History ***********

  app.get('/api/history/detection/:userId', async (req, res) => {
    try {
      const history = await Detection.find({ userId: req.params.userId })
        .sort({ timestamp: -1 })
        .limit(10);
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // Log Contact Request*************

  app.post('/api/contacts/request', async (req, res) => {
    try {
      const request = new ContactRequest(req.body);
      await request.save();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to log contact request' });
    }
  });
  
  // Log Appointment********

  app.post('/api/appointments', async (req, res) => {
    try {
      const appointment = new Appointment(req.body);
      await appointment.save();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to log appointment' });
    }
  });

  // Vite Integration*************
  
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
