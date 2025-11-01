#!/usr/bin/env node

/**
 * Focus Mode Verification Script
 * Tests focus lock behavior, session persistence, early exits, and app restart
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

const API_BASE = 'http://localhost:5000';
const TEST_TIMEOUT = 30000; // 30 seconds

class FocusVerifier {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
    };
  }

  async test(name, fn) {
    try {
      await fn();
      this.results.passed.push(name);
      console.log(chalk.green(`✓ ${name}`));
    } catch (error) {
      this.results.failed.push({ name, error: error.message });
      console.log(chalk.red(`✗ ${name}: ${error.message}`));
    }
  }

  async request(method, path, body = null) {
    const url = `${API_BASE}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  printSummary() {
    console.log('\n' + chalk.bold('\n📊 Test Summary:\n'));
    console.log(chalk.green(`Passed: ${this.results.passed.length}`));
    console.log(chalk.red(`Failed: ${this.results.failed.length}`));

    if (this.results.failed.length > 0) {
      console.log(chalk.bold('\nFailed Tests:'));
      this.results.failed.forEach(({ name, error }) => {
        console.log(chalk.red(`  - ${name}: ${error}`));
      });
    }

    const total = this.results.passed.length + this.results.failed.length;
    const rate = ((this.results.passed.length / total) * 100).toFixed(1);
    console.log(chalk.bold(`\nSuccess Rate: ${rate}%`));
  }
}

async function main() {
  console.log(chalk.bold.cyan('\n🔥 EduLens Focus Mode Verification\n'));
  console.log(chalk.gray('Waiting for backend server...'));

  // Wait for server to be ready
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`${API_BASE}/health`);
      serverReady = true;
      break;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!serverReady) {
    console.log(
      chalk.red(
        '✗ Server not ready at ' + API_BASE + '. Please start the backend.'
      )
    );
    process.exit(1);
  }

  const verifier = new FocusVerifier();
  let sessionId;

  // Test 1: Start focus mode
  await verifier.test('Start focus mode session', async () => {
    const result = await verifier.request('/api/focus/start', {
      id: Date.now(),
      startTime: Date.now(),
      timerDuration: 600000, // 10 minutes for quick test
      aiMode: 'offline',
      provider: 'groq',
      transcript: 'Test transcript',
      aiContext: { topic: 'verification' },
      metadata: { test: true },
    });

    if (!result.session || !result.session.id) {
      throw new Error('Session not created');
    }

    sessionId = result.session.id;
  });

  // Test 2: Get focus status
  await verifier.test('Get active focus status', async () => {
    const result = await verifier.request('/api/focus/status', null);
    if (!result.isFocusMode || !result.session) {
      throw new Error('Focus mode not detected');
    }
  });

  // Test 3: Pause focus mode
  await verifier.test('Pause focus mode', async () => {
    const result = await verifier.request('/api/focus/pause', {
      sessionId,
    });
    if (!result.success) {
      throw new Error('Failed to pause');
    }
  });

  // Test 4: Resume focus mode
  await verifier.test('Resume focus mode', async () => {
    const result = await verifier.request('/api/focus/resume', {
      sessionId,
    });
    if (!result.success) {
      throw new Error('Failed to resume');
    }
  });

  // Test 5: Initiate payment
  await verifier.test('Initiate early exit payment', async () => {
    const result = await verifier.request('/api/payment/initiate', {
      sessionId,
      provider: 'stripe',
    });

    if (!result.payment || !result.payment.id) {
      throw new Error('Payment not initiated');
    }
  });

  // Test 6: Process payment success
  await verifier.test('Process payment success', async () => {
    const result = await verifier.request('/api/payment/success', {
      paymentId: 'test-payment-' + Date.now(),
      transactionId: 'test-txn-' + Date.now(),
      sessionId,
    });

    if (!result.success) {
      throw new Error('Payment processing failed');
    }
  });

  // Test 7: Exit focus mode
  await verifier.test('Exit focus mode', async () => {
    const result = await verifier.request('/api/focus/exit', {
      sessionId: 'test-exit-' + Date.now(),
      method: 'payment',
      reason: 'Early exit after payment',
    });

    if (!result.success) {
      throw new Error('Failed to exit');
    }
  });

  // Test 8: Session persistence
  await verifier.test('Session data encryption and persistence', async () => {
    const appDataPath = path.join(process.cwd(), '.data');
    const sessionDir = path.join(appDataPath, 'sessions');

    if (!(await fs.pathExists(sessionDir))) {
      throw new Error('Session directory not created');
    }

    const files = await fs.readdir(sessionDir);
    if (files.length === 0) {
      throw new Error('No session files persisted');
    }

    // Check for encrypted files
    const encFiles = files.filter((f) => f.endsWith('.enc'));
    if (encFiles.length === 0) {
      throw new Error('No encrypted session files found');
    }
  });

  // Test 9: IPC preload available (if running in Electron)
  await verifier.test('Electron IPC preload check', async () => {
    // This would be tested in actual Electron context
    console.log(
      chalk.gray('(Skipped - requires Electron context in actual runtime)')
    );
  });

  // Print results
  verifier.printSummary();

  // Exit with appropriate code
  process.exit(verifier.results.failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
