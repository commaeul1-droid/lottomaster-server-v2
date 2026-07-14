#!/usr/bin/env node
/** Collect and store the latest draw without Supabase synchronization. */
if (!process.argv.includes('--collect-only')) process.argv.push('--collect-only');
await import('../src/update.js');
