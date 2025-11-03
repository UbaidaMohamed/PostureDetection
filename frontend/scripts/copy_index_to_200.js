const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");
const destPath = path.join(distDir, "200.html");

if (!fs.existsSync(indexPath)) {
  console.error("index.html not found in dist/. Did the build run?");
  process.exit(1);
}

fs.copyFileSync(indexPath, destPath);
console.log("✅ Copied index.html to 200.html");
