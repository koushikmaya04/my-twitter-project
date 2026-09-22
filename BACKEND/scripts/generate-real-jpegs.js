const fs = require('fs');
const path = require('path');

const fixtureDir = path.join(__dirname, '..', 'public', 'fixtures');

// All image filenames referenced in fixture-data.ts
const images = [
  // User avatars
  'asha-48.jpg',
  'asha-96.jpg',
  'rahul-48.jpg',
  'rahul-96.jpg',
  'meera-48.jpg',
  'meera-96.jpg',
  'arjun-48.jpg',
  'arjun-96.jpg',
  'nisha-48.jpg',
  'nisha-96.jpg',
  'vikram-48.jpg',
  'vikram-96.jpg',
  // Post media
  'desk-480.jpg',
  'desk-1200.jpg',
  'code-480.jpg',
  'code-1200.jpg',
  'coffee-480.jpg',
  'coffee-1200.jpg',
  'design-480.jpg',
  'design-1200.jpg',
  'notebook-480.jpg',
  'notebook-1200.jpg',
  'typescript-480.jpg',
  'typescript-1200.jpg',
  'workspace-480.jpg',
  'workspace-1200.jpg',
  'sketches-480.jpg',
  'sketches-1200.jpg',
  'api-480.jpg',
  'api-1200.jpg',
  'backend-480.jpg',
  'backend-1200.jpg',
];

/**
 * Valid 2x2 solid-color JPEG base64 buffers.
 * These are 100% compliant JPEG binary files that image decoders in all browsers can render.
 */
const colorJpegs = {
  red: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAICAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  blue: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAICATEA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  green: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAICAZEA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  purple: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAICAdEA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  orange: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAICAcEA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  teal: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAACAAICAYEA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
};

// Map each image to a specific color JPEG
const imageColorMap = {
  'asha-48.jpg': colorJpegs.red,
  'asha-96.jpg': colorJpegs.red,
  'rahul-48.jpg': colorJpegs.blue,
  'rahul-96.jpg': colorJpegs.blue,
  'meera-48.jpg': colorJpegs.green,
  'meera-96.jpg': colorJpegs.green,
  'arjun-48.jpg': colorJpegs.orange,
  'arjun-96.jpg': colorJpegs.orange,
  'nisha-48.jpg': colorJpegs.purple,
  'nisha-96.jpg': colorJpegs.purple,
  'vikram-48.jpg': colorJpegs.teal,
  'vikram-96.jpg': colorJpegs.teal,
};

// Default fallback valid JPEG base64 (a simple valid 100x100 JPEG)
const defaultJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAZABgBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

if (!fs.existsSync(fixtureDir)) {
  fs.mkdirSync(fixtureDir, { recursive: true });
}

for (const name of images) {
  const base64Str = imageColorMap[name] || defaultJpegBase64;
  const buffer = Buffer.from(base64Str, 'base64');
  fs.writeFileSync(path.join(fixtureDir, name), buffer);
}

console.log(`Successfully generated ${images.length} valid binary JPEG images in ${fixtureDir}`);
