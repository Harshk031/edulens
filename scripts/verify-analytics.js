#!/usr/bin/env node

/**
 * Analytics Verification Script
 * Tests analytics routes, dashboard rendering, gamification, and exports
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

const API_BASE = 'http://localhost:5000';
const TEST_USER = 'test-analytics-' + Date.now();

class AnalyticsVerifier {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
    };
    this.testSessionId = null;
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

    if (response.headers.get('content-type')?.includes('text/csv')) {
      return await response.text();
    }

    return response.json();
  }

  printSummary() {
    console.log('\n' + chalk.bold('\n📊 Analytics Verification Summary:\n'));
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
  console.log(chalk.bold.cyan('\n📊 EduLens Analytics Verification\n'));
  console.log(chalk.gray('Testing analytics infrastructure...\n'));

  // Wait for server
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
      chalk.red('✗ Server not ready. Start backend: npm run dev:backend')
    );
    process.exit(1);
  }

  const verifier = new AnalyticsVerifier();

  // Test 1: Log analytics event
  await verifier.test('Log session event (start)', async () => {
    verifier.testSessionId = 'session-' + Date.now();
    const result = await verifier.request('/api/analytics/log-event', {
      userId: TEST_USER,
      sessionId: verifier.testSessionId,
      eventType: 'start',
      eventData: {
        aiMode: 'offline',
        provider: 'groq',
      },
    });

    if (!result.success || !result.session) {
      throw new Error('Failed to log start event');
    }
  });

  // Test 2: Get analytics summary
  await verifier.test('Fetch analytics summary', async () => {
    const result = await verifier.request(
      '/api/analytics/summary/' + TEST_USER,
      null
    );

    if (!result.summary) {
      throw new Error('No summary returned');
    }

    if (
      result.summary.totalSessions === undefined ||
      result.summary.completionRate === undefined
    ) {
      throw new Error('Summary missing required fields');
    }
  });

  // Test 3: End session
  await verifier.test('Log session event (end)', async () => {
    const result = await verifier.request('/api/analytics/log-event', {
      userId: TEST_USER,
      sessionId: verifier.testSessionId,
      eventType: 'end',
      eventData: {
        completed: true,
        score: 85,
      },
    });

    if (!result.success) {
      throw new Error('Failed to log end event');
    }
  });

  // Test 4: Fetch gamification
  await verifier.test('Fetch gamification state', async () => {
    const result = await verifier.request(
      '/api/analytics/gamification/' + TEST_USER,
      null
    );

    if (!result.gamification) {
      throw new Error('No gamification data');
    }

    if (
      result.gamification.points === undefined ||
      result.gamification.streak === undefined
    ) {
      throw new Error('Gamification missing required fields');
    }
  });

  // Test 5: Update gamification
  await verifier.test('Update gamification (points & streak)', async () => {
    const result = await verifier.request(
      '/api/analytics/gamification/' + TEST_USER,
      'POST',
      {
        pointsEarned: 10,
        sessionCompleted: true,
        badges: [],
      }
    );

    if (!result.success) {
      throw new Error('Failed to update gamification');
    }

    if (!result.gamification.points || result.gamification.points < 10) {
      throw new Error('Points not awarded correctly');
    }
  });

  // Test 6: Award badges
  await verifier.test('Award badge', async () => {
    const result = await verifier.request(
      '/api/analytics/gamification/' + TEST_USER,
      'POST',
      {
        pointsEarned: 0,
        sessionCompleted: false,
        badges: [
          {
            id: 'test-badge',
            name: '🌱 Test Badge',
          },
        ],
      }
    );

    if (!result.gamification.badges || result.gamification.badges.length === 0) {
      throw new Error('Badge not awarded');
    }
  });

  // Test 7: List sessions
  await verifier.test('Fetch sessions list', async () => {
    const result = await verifier.request(
      `/api/analytics/sessions/${TEST_USER}?limit=10&offset=0`,
      null
    );

    if (!Array.isArray(result.sessions)) {
      throw new Error('No sessions array returned');
    }

    if (result.sessions.length === 0) {
      throw new Error('No sessions found (should have test session)');
    }
  });

  // Test 8: Date range filtering
  await verifier.test('Get analytics for date range', async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 86400000).toISOString();
    const endDate = new Date(now.getTime() + 86400000).toISOString();

    const result = await verifier.request(
      `/api/analytics/range/${TEST_USER}?startDate=${startDate}&endDate=${endDate}`,
      null
    );

    if (!result.stats) {
      throw new Error('No stats returned');
    }

    if (result.stats.sessionCount === undefined) {
      throw new Error('Stats missing session count');
    }
  });

  // Test 9: CSV export
  await verifier.test('Export analytics to CSV', async () => {
    const csv = await verifier.request(
      `/api/analytics/export/csv/${TEST_USER}`,
      null
    );

    if (!csv || !csv.includes('Session ID')) {
      throw new Error('Invalid CSV export');
    }

    if (!csv.includes(verifier.testSessionId)) {
      throw new Error('Session not in CSV export');
    }
  });

  // Test 10: Log distraction
  await verifier.test('Log distraction event', async () => {
    const result = await verifier.request('/api/analytics/log-event', {
      userId: TEST_USER,
      sessionId: 'session-distraction-' + Date.now(),
      eventType: 'distraction',
      eventData: {},
    });

    if (!result.success) {
      throw new Error('Failed to log distraction');
    }
  });

  // Test 11: Pause and resume events
  await verifier.test('Log pause and resume events', async () => {
    const pauseId = 'session-pause-' + Date.now();

    // Pause
    const pauseResult = await verifier.request('/api/analytics/log-event', {
      userId: TEST_USER,
      sessionId: pauseId,
      eventType: 'pause',
      eventData: { reason: 'payment' },
    });

    if (!pauseResult.success) {
      throw new Error('Failed to log pause event');
    }

    // Resume
    const resumeResult = await verifier.request('/api/analytics/log-event', {
      userId: TEST_USER,
      sessionId: pauseId,
      eventType: 'resume',
      eventData: {},
    });

    if (!resumeResult.success) {
      throw new Error('Failed to log resume event');
    }
  });

  // Test 12: Payment event
  await verifier.test('Log payment event', async () => {
    const result = await verifier.request('/api/analytics/log-event', {
      userId: TEST_USER,
      sessionId: 'session-payment-' + Date.now(),
      eventType: 'payment',
      eventData: { provider: 'stripe' },
    });

    if (!result.success) {
      throw new Error('Failed to log payment event');
    }
  });

  // Test 13: Encryption integrity
  await verifier.test('Session encryption and persistence', async () => {
    const dataPath = path.join(process.cwd(), '.data', 'insights', TEST_USER);

    if (!(await fs.pathExists(dataPath))) {
      throw new Error('Analytics data directory not created');
    }

    const analyticsPath = path.join(dataPath, 'analytics.enc');
    if (!(await fs.pathExists(analyticsPath))) {
      throw new Error('Encrypted analytics file not found');
    }

    const fileContent = await fs.readFile(analyticsPath, 'utf-8');
    if (!fileContent.includes('iv') || !fileContent.includes('data')) {
      throw new Error('Encrypted file format invalid');
    }
  });

  // Test 14: Dashboard component rendering (simulated)
  await verifier.test('Dashboard component structure validation', async () => {
    const summary = await verifier.request(
      '/api/analytics/summary/' + TEST_USER,
      null
    );

    // Validate structure for dashboard
    const required = [
      'totalSessions',
      'totalFocusTime',
      'completionRate',
      'currentStreak',
      'totalPoints',
    ];

    for (const field of required) {
      if (summary.summary[field] === undefined) {
        throw new Error(`Dashboard field missing: ${field}`);
      }
    }
  });

  // Test 15: Delete history
  await verifier.test('Delete user analytics history', async () => {
    const result = await verifier.request(
      `/api/analytics/${TEST_USER}`,
      'DELETE',
      {}
    );

    if (!result.success) {
      throw new Error('Failed to delete history');
    }

    // Verify deletion
    const analyticsPath = path.join(process.cwd(), '.data', 'insights', TEST_USER, 'analytics.enc');
    if (await fs.pathExists(analyticsPath)) {
      throw new Error('Analytics file still exists after deletion');
    }
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
