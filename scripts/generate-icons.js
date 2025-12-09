const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const pngToIco = require("png-to-ico");

async function generateIcons() {
  const svgPath = path.join(__dirname, "public", "logo.svg");
  const publicDir = path.join(__dirname, "public");

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Read SVG content
  const svgBuffer = fs.readFileSync(svgPath);

  // Sizes for different icons
  const sizes = [16, 32, 64, 128, 256, 512];

  console.log("Generating PNG icons...");

  // Generate PNG icons in different sizes
  for (const size of sizes) {
    const outputPath = path.join(publicDir, `logo-${size}x${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`Generated: logo-${size}x${size}.png`);
  }

  // Generate specific named icons
  const iconMappings = [
    { size: 32, name: "logo-small.png" },
    { size: 128, name: "logo.png" },
    { size: 256, name: "logo-full.png" },
    { size: 180, name: "apple-touch-icon.png" },
    { size: 192, name: "android-chrome-192x192.png" },
    { size: 512, name: "android-chrome-512x512.png" },
  ];

  for (const { size, name } of iconMappings) {
    const outputPath = path.join(publicDir, name);
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`Generated: ${name}`);
  }

  // Generate favicon.ico with multiple sizes
  console.log("Generating favicon.ico...");
  const faviconPath = path.join(__dirname, "public", "favicon.ico");

  // Create ICO with multiple sizes (16x16, 32x32, 48x48)
  const icoSizes = [16, 32, 48];
  const icoBuffers = [];

  for (const size of icoSizes) {
    const buffer = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    icoBuffers.push(buffer);
  }

  // Create the ICO file
  const icoBuffer = await pngToIco(icoBuffers);
  fs.writeFileSync(faviconPath, icoBuffer);

  console.log("Icon generation complete!");
  console.log("\nGenerated files:");
  console.log("- public/logo.svg (source)");
  sizes.forEach((size) => console.log(`- public/logo-${size}x${size}.png`));
  iconMappings.forEach(({ name }) => console.log(`- public/${name}`));
  console.log("- public/favicon.ico (multi-size ICO file)");
}

generateIcons().catch(console.error);
