// Suppress the specific util._extend deprecation warning from dependencies FIRST
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.code !== "DEP0060") {
    console.warn(warning);
  }
});

// Start the actual command
const { spawn } = require("child_process");

const args = process.argv.slice(2);
// Join args into single command string to avoid DEP0190 warning
// (passing args separately with shell:true is deprecated)
const command = args.join(" ");
const child = spawn(command, [], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    // Suppress specific deprecation warnings while keeping other warnings
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --no-deprecation`.trim(),
  },
});

child.on("exit", (code) => {
  process.exit(code);
});
