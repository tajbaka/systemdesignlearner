// Start the actual command
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { spawn } = require('child_process');

// Suppress the specific util._extend deprecation warning from dependencies
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.code !== 'DEP0060') {
    console.warn(warning);
  }
});
const args = process.argv.slice(2);
const child = spawn(args[0], args.slice(1), {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});
