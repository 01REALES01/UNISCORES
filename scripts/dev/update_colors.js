const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

let count = 0;
walk('./src', function (filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let raw = fs.readFileSync(filePath, 'utf8');

    // Replace hardcoded marine dark colors with Uninorte identity colors
    let processed = raw
      .replace(/#0a0f1c/ig, '#17130D') // Uninorte specific dark base
      .replace(/#030711/ig, '#0a0805') // Deeper dark for contrast
      .replace(/#0c1222/ig, '#1f1911') // Hover states
      .replace(/#070b14/ig, '#0f0c08') // Darker pill 
      .replace(/border-yellow-500/ig, 'border-[#FFC000]') // Use exact gold 
      .replace(/text-yellow-500/ig, 'text-[#FFC000]')
      .replace(/bg-yellow-500/ig, 'bg-[#FFC000]')
    if (raw !== processed) {
      fs.writeFileSync(filePath, processed, 'utf8');
      console.log('Updated: ' + filePath);
      count++;
    }
  }
});
console.log('Updated files:', count);
