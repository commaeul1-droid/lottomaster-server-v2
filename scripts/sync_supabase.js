#!/usr/bin/env node
/** Synchronize the validated CSV history to Supabase only. */
if (!process.argv.includes('--sync-only')) process.argv.push('--sync-only');
await import('../src/update.js');
