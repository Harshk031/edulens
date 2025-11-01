import express from 'express';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const router = express.Router();

// Compute a writable app data directory without depending on Electron being present
const getUserDataPath = () => {
  try {
    const localApp = process.env.LOCALAPPDATA || process.env.APPDATA || path.join(process.env.USERPROFILE || os.homedir(), 'AppData', 'Local');
    return path.join(localApp, 'EduLensHybrid');
  } catch {
    return path.join(process.cwd(), '.data');
  }
};

// Session storage in memory (in production, use database)
const sessions = new Map();

/**
 * Start focus mode session
 */
router.post('/focus/start', async (req, res) => {
  try {
    const {
      id,
      startTime,
      timerDuration,
      aiMode,
      provider,
      transcript,
      aiContext,
      metadata,
    } = req.body;

    // Create encrypted session file
    const sessionData = {
      id,
      startTime,
      timerDuration,
      elapsedTime: 0,
      status: 'active',
      aiMode,
      provider,
      transcript,
      aiContext,
      metadata,
      createdAt: new Date().toISOString(),
    };

    // Store in memory
    sessions.set(id, sessionData);

    // Store encrypted to disk
    const appDataPath = getUserDataPath();
    const sessionDir = path.join(appDataPath, 'sessions');
    await fs.ensureDir(sessionDir);

    const encryptedPath = path.join(sessionDir, `${id}.enc`);
    const encrypted = encryptSessionData(sessionData);
    await fs.writeFile(encryptedPath, encrypted);

    res.json({ success: true, session: sessionData });
  } catch (error) {
    console.error('Error starting focus mode:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Exit focus mode session
 */
router.post('/focus/exit', async (req, res) => {
  try {
    const { sessionId, method, reason } = req.body;

    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      session.status = 'completed';
      session.exitMethod = method;
      session.exitReason = reason;
      session.completedAt = new Date().toISOString();

      // Save to disk
      const appDataPath = getUserDataPath();
      const sessionDir = path.join(appDataPath, 'sessions');
      const completedPath = path.join(sessionDir, `${sessionId}.completed`);
      const encrypted = encryptSessionData(session);
      await fs.writeFile(completedPath, encrypted);

      sessions.delete(sessionId);
    }

    res.json({ success: true, session: sessionId });
  } catch (error) {
    console.error('Error exiting focus mode:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Pause focus mode
 */
router.post('/focus/pause', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      session.status = 'paused';
      session.pausedAt = new Date().toISOString();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resume focus mode
 */
router.post('/focus/resume', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      session.status = 'active';
      session.resumedAt = new Date().toISOString();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get focus status
 */
router.get('/focus/status', async (req, res) => {
  try {
    // Check for any active sessions
    let activeSession = null;

    for (const [sessionId, session] of sessions) {
      if (session.status === 'active') {
        activeSession = session;
        break;
      }
    }

    // Try to restore from disk if no active session in memory
    if (!activeSession) {
      const appDataPath = getUserDataPath();
      const sessionDir = path.join(appDataPath, 'sessions');
      const sessionFiles = await fs.readdir(sessionDir).catch(() => []);

      for (const file of sessionFiles) {
        if (file.endsWith('.enc')) {
          const encPath = path.join(sessionDir, file);
          const encrypted = await fs.readFile(encPath);
          const session = decryptSessionData(encrypted);

          if (session && session.status === 'active') {
            activeSession = session;
            sessions.set(session.id, session);
            break;
          }
        }
      }
    }

    res.json({
      isFocusMode: !!activeSession,
      session: activeSession,
    });
  } catch (error) {
    console.error('Error getting focus status:', error);
    res.json({ isFocusMode: false, session: null });
  }
});

/**
 * Initiate payment for early exit
 */
router.post('/payment/initiate', async (req, res) => {
  try {
    const { sessionId, provider } = req.body;

    if (!sessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const paymentId = crypto.randomUUID();
    const paymentData = {
      id: paymentId,
      sessionId,
      provider,
      amount: 99, // $0.99 for sandbox
      currency: 'USD',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // In sandbox mode, return dummy payment URL
    let paymentUrl = '';

    if (provider === 'stripe') {
      // Dummy Stripe checkout URL for sandbox
      paymentUrl = `https://checkout.stripe.com/sandbox?id=${paymentId}`;
    } else if (provider === 'razorpay') {
      // Dummy Razorpay URL for sandbox
      paymentUrl = `https://checkout.razorpay.com/sandbox?id=${paymentId}`;
    }

    // Store payment in session
    const session = sessions.get(sessionId);
    session.payments = session.payments || [];
    session.payments.push(paymentData);

    res.json({
      success: true,
      payment: {
        id: paymentId,
        url: paymentUrl,
        provider,
        amount: 99,
      },
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process payment success
 */
router.post('/payment/success', async (req, res) => {
  try {
    const { paymentId, transactionId, sessionId } = req.body;

    // In production, verify with Stripe/Razorpay API
    const session = sessions.get(sessionId);

    if (session && session.payments) {
      const payment = session.payments.find((p) => p.id === paymentId);
      if (payment) {
        payment.status = 'completed';
        payment.transactionId = transactionId;
        payment.completedAt = new Date().toISOString();
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Encrypt session data
 */
function encryptSessionData(sessionData) {
  const secretKey = process.env.FOCUS_SECRET_KEY || 'dev-secret-key-32-chars-min-req';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(secretKey.padEnd(32, '0').slice(0, 32)),
    iv
  );

  let encrypted = cipher.update(JSON.stringify(sessionData), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted,
  });
}

/**
 * Decrypt session data
 */
function decryptSessionData(encrypted) {
  try {
    const secretKey =
      process.env.FOCUS_SECRET_KEY || 'dev-secret-key-32-chars-min-req';
    const { iv, data } = JSON.parse(encrypted.toString());
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(secretKey.padEnd(32, '0').slice(0, 32)),
      Buffer.from(iv, 'hex')
    );

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting session:', error);
    return null;
  }
}

export default router;
