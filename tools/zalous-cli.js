#!/usr/bin/env node
/* eslint-disable no-console */
const { main } = require('./zalous-cli/core');

main().catch((err) => {
  console.error('[zalous] ERROR', err && err.message ? err.message : err);
  process.exit(1);
});
