import fs from "node:fs";
import path from "node:path";

const clientDir = path.resolve(process.cwd(), "dist/client");
const indexPath = path.join(clientDir, "index.html");
const notFoundPath = path.join(clientDir, "404.html");
const noJekyllPath = path.join(clientDir, ".nojekyll");

if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
  console.log("✓ Created 404.html fallback for GitHub Pages SPA routing");
}

fs.writeFileSync(noJekyllPath, "");
console.log("✓ Created .nojekyll for GitHub Pages");
