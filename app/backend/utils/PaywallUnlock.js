import sessionManager from './sessionManager.js';

export class PaywallUnlock {
  constructor() {
    this.paymentMethods = {
      stripe: { name: 'Stripe', fee: 0.99, currency: 'USD' },
      razorpay: { name: 'Razorpay', fee: 49, currency: 'INR' },
    };
    this.pendingPayments = new Map();
  }

  /**
   * Initiate early exit payment request
   */
  initiateEarlyExit(sessionId, provider = 'stripe') {
    try {
      const session = sessionManager.loadFocusSession();
      if (!session || session.id !== sessionId) {
        return { success: false, error: 'Invalid session' };
      }

      if (session.status !== 'active') {
        return { success: false, error: 'Session not active' };
      }

      const paymentMethod = this.paymentMethods[provider];
      if (!paymentMethod) {
        return { success: false, error: 'Invalid payment provider' };
      }

      const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create payment record
      const paymentRecord = {
        id: paymentId,
        sessionId,
        provider,
        amount: paymentMethod.fee,
        currency: paymentMethod.currency,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000, // 5 min expiry
        metadata: {
          timeRemaining: Math.max(0, session.timerDuration - session.elapsedTime),
          aiMode: session.aiMode,
          provider: session.provider,
        },
      };

      this.pendingPayments.set(paymentId, paymentRecord);

      // Store in session
      session.metadata.lastPaymentAttempt = paymentId;
      sessionManager.saveFocusSession(session);

      return {
        success: true,
        paymentId,
        payment: paymentRecord,
        paymentUrl: this.generatePaymentUrl(paymentRecord),
      };
    } catch (error) {
      console.error('Failed to initiate early exit:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate payment URL (sandbox mode)
   */
  generatePaymentUrl(paymentRecord) {
    const { provider, id } = paymentRecord;

    if (provider === 'stripe') {
      return `https://checkout.stripe.com/pay/cs_test_${id}`;
    } else if (provider === 'razorpay') {
      return `https://rzp.io/i/${id}`;
    }

    return null;
  }

  /**
   * Process payment success
   */
  processPaymentSuccess(paymentId, transactionId) {
    try {
      const payment = this.pendingPayments.get(paymentId);
      if (!payment) {
        return { success: false, error: 'Payment record not found' };
      }

      if (Date.now() > payment.expiresAt) {
        this.pendingPayments.delete(paymentId);
        return { success: false, error: 'Payment expired' };
      }

      // Update payment status
      payment.status = 'completed';
      payment.transactionId = transactionId;
      payment.completedAt = Date.now();

      // Update session
      const session = sessionManager.loadFocusSession();
      if (session && session.id === payment.sessionId) {
        session.unlockedBy = 'payment';
        session.metadata.paymentId = paymentId;
        session.metadata.transactionId = transactionId;
        sessionManager.saveFocusSession(session);
      }

      console.log(`✅ Payment successful: ${transactionId}`);
      return {
        success: true,
        payment,
        message: 'Payment successful – you may now exit focus mode',
      };
    } catch (error) {
      console.error('Failed to process payment:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process payment failure
   */
  processPaymentFailure(paymentId, reason) {
    try {
      const payment = this.pendingPayments.get(paymentId);
      if (!payment) {
        return { success: false, error: 'Payment record not found' };
      }

      payment.status = 'failed';
      payment.failureReason = reason;
      payment.failedAt = Date.now();

      console.log(`❌ Payment failed: ${reason}`);
      return {
        success: true,
        payment,
        message: 'Payment failed – returning to focus mode',
      };
    } catch (error) {
      console.error('Failed to process payment failure:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if session has active payment
   */
  hasActivePayment(sessionId) {
    for (const [_, payment] of this.pendingPayments) {
      if (
        payment.sessionId === sessionId &&
        payment.status === 'pending' &&
        Date.now() <= payment.expiresAt
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get payment status
   */
  getPaymentStatus(paymentId) {
    const payment = this.pendingPayments.get(paymentId);
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    return {
      success: true,
      payment,
      isExpired: Date.now() > payment.expiresAt,
    };
  }

  /**
   * Clean expired payments
   */
  cleanExpiredPayments() {
    const now = Date.now();
    let cleaned = 0;

    for (const [paymentId, payment] of this.pendingPayments) {
      if (now > payment.expiresAt) {
        this.pendingPayments.delete(paymentId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired payments`);
    }

    return cleaned;
  }

  /**
   * Get pricing info
   */
  getPricingInfo() {
    return {
      providers: this.paymentMethods,
      disclaimer: 'Early exit payment is optional. Focus mode will automatically unlock when timer expires.',
    };
  }

  /**
   * Simulate payment (for testing)
   */
  simulatePayment(paymentId, success = true) {
    try {
      if (success) {
        const transactionId = `txn_test_${Date.now()}`;
        return this.processPaymentSuccess(paymentId, transactionId);
      } else {
        return this.processPaymentFailure(paymentId, 'Simulated payment failure');
      }
    } catch (error) {
      console.error('Failed to simulate payment:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new PaywallUnlock();
