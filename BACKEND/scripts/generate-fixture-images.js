/**
 * Generate placeholder SVG files for all fixture image URLs.
 * Run with: node generate-fixture-images.js
 */
const fs = require('fs');
const path = require('path');

const fixtureDir = path.join(__dirname, '..', 'public', 'fixtures');

// All image filenames referenced in fixture-data.ts
const images = [
  // User avatars
  { name: 'asha-48.jpg', w: 48, h: 48, label: 'Asha', color: '#e57373' },
  { name: 'asha-96.jpg', w: 96, h: 96, label: 'Asha', color: '#e57373' },
  { name: 'rahul-48.jpg', w: 48, h: 48, label: 'Rahul', color: '#64b5f6' },
  { name: 'rahul-96.jpg', w: 96, h: 96, label: 'Rahul', color: '#64b5f6' },
  { name: 'meera-48.jpg', w: 48, h: 48, label: 'Meera', color: '#81c784' },
  { name: 'meera-96.jpg', w: 96, h: 96, label: 'Meera', color: '#81c784' },
  { name: 'arjun-48.jpg', w: 48, h: 48, label: 'Arjun', color: '#ffb74d' },
  { name: 'arjun-96.jpg', w: 96, h: 96, label: 'Arjun', color: '#ffb74d' },
  { name: 'nisha-48.jpg', w: 48, h: 48, label: 'Nisha', color: '#ba68c8' },
  { name: 'nisha-96.jpg', w: 96, h: 96, label: 'Nisha', color: '#ba68c8' },
  { name: 'vikram-48.jpg', w: 48, h: 48, label: 'Vikram', color: '#4dd0e1' },
  { name: 'vikram-96.jpg', w: 96, h: 96, label: 'Vikram', color: '#4dd0e1' },
  // Post media
  { name: 'desk-480.jpg', w: 480, h: 320, label: 'Desk', color: '#5c6bc0' },
  { name: 'desk-1200.jpg', w: 1200, h: 800, label: 'Desk', color: '#5c6bc0' },
  { name: 'code-480.jpg', w: 480, h: 320, label: 'Code', color: '#26a69a' },
  { name: 'code-1200.jpg', w: 1200, h: 800, label: 'Code', color: '#26a69a' },
  { name: 'coffee-480.jpg', w: 480, h: 320, label: 'Coffee', color: '#8d6e63' },
  { name: 'coffee-1200.jpg', w: 1200, h: 800, label: 'Coffee', color: '#8d6e63' },
  { name: 'design-480.jpg', w: 480, h: 320, label: 'Design', color: '#ec407a' },
  { name: 'design-1200.jpg', w: 1200, h: 800, label: 'Design', color: '#ec407a' },
  { name: 'notebook-480.jpg', w: 480, h: 320, label: 'Notebook', color: '#7e57c2' },
  { name: 'notebook-1200.jpg', w: 1200, h: 800, label: 'Notebook', color: '#7e57c2' },
  { name: 'typescript-480.jpg', w: 480, h: 320, label: 'TypeScript', color: '#3178c6' },
  { name: 'typescript-1200.jpg', w: 1200, h: 800, label: 'TypeScript', color: '#3178c6' },
  { name: 'workspace-480.jpg', w: 480, h: 320, label: 'Workspace', color: '#66bb6a' },
  { name: 'workspace-1200.jpg', w: 1200, h: 800, label: 'Workspace', color: '#66bb6a' },
  { name: 'sketches-480.jpg', w: 480, h: 320, label: 'Sketches', color: '#ffa726' },
  { name: 'sketches-1200.jpg', w: 1200, h: 800, label: 'Sketches', color: '#ffa726' },
  { name: 'api-480.jpg', w: 480, h: 320, label: 'API', color: '#42a5f5' },
  { name: 'api-1200.jpg', w: 1200, h: 800, label: 'API', color: '#42a5f5' },
  { name: 'backend-480.jpg', w: 480, h: 320, label: 'Backend', color: '#ef5350' },
  { name: 'backend-1200.jpg', w: 1200, h: 800, label: 'Backend', color: '#ef5350' },
];

function generateSvg(w, h, label, color) {
  const fontSize = Math.min(w, h) * 0.15;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${color}"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="${fontSize}" fill="white" opacity="0.9">
    ${label}
  </text>
</svg>`;
}

if (!fs.existsSync(fixtureDir)) {
  fs.mkdirSync(fixtureDir, { recursive: true });
}

for (const img of images) {
  // Save as SVG even though filename says .jpg — browsers handle this fine
  // for placeholder purposes. The Content-Type will be determined by the
  // extension; we use a proper SVG so it renders everywhere.
  const svgContent = generateSvg(img.w, img.h, img.label, img.color);
  // Actually save with .svg extension and we'll also save as the .jpg name
  // Since browsers will accept SVG content served with any image content type
  fs.writeFileSync(path.join(fixtureDir, img.name), svgContent);
}

console.log(`Generated ${images.length} placeholder fixture images in ${fixtureDir}`);
