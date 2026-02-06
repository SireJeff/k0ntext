#!/usr/bin/env node

/**
 * K0ntext CLI Entry Point
 *
 * This is the main entry point for the k0ntext command.
 */

import('../dist/cli/index.js').catch((error) => {
  console.error('Failed to start K0ntext CLI:', error);
  process.exit(1);
});
