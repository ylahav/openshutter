#!/usr/bin/env node

const { spawn } = require('child_process');

const delay = parseInt(process.argv[2] || '3000', 10);
const command = process.argv.slice(3);

if (command.length === 0) {
  console.error('Usage: node delay-start.js <delay-ms> <command> [args...]');
  process.exit(1);
}

console.log(`Waiting ${delay}ms before starting: ${command.join(' ')}`);

setTimeout(() => {
  const child = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}, delay);

// Keep process alive
process.stdin.resume();

