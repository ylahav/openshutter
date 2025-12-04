#!/usr/bin/env node

import { spawn } from 'child_process';

const delay = parseInt(process.argv[2] || '3000', 10);
const command = process.argv.slice(3).join(' ');

if (!command) {
  console.error('Usage: node delay-start.js <delay-ms> <command> [args...]');
  process.exit(1);
}

console.log(`Waiting ${delay}ms before starting: ${command}`);

setTimeout(() => {
  // Use shell: true and pass the entire command as a string
  const child = spawn(command, {
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });

  child.on('error', (err) => {
    console.error('Error starting command:', err);
    process.exit(1);
  });
}, delay);

// Keep process alive
process.stdin.resume();
