// Fix util._extend deprecation warning
global.util = global.util || {};
global.util._extend = Object.assign;

// Start the actual command
const { spawn } = require('child_process');
const args = process.argv.slice(2);
const child = spawn(args[0], args.slice(1), {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});
