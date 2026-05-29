const fs = require('fs');
const content = fs.readFileSync('src/app/app/daily/page.tsx', 'utf-8');

// Find the exact text around the submit button
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('보드') && lines[i].includes('산출')) {
    console.log(`Line ${i + 1}: ${JSON.stringify(lines[i])}`);
  }
}

// Check if specific string exists
console.log('Contains exact match:', content.includes('오늘의 자기운영 보드 산출'));

// Show hex of the relevant portion
const idx = content.indexOf('자기운영');
if (idx >= 0) {
  const sub = content.substring(idx, idx + 20);
  console.log('Found substring:', JSON.stringify(sub));
  console.log('Hex:', Buffer.from(sub).toString('hex'));
} else {
  console.log('자기운영 not found');
  // Try searching for just 보드 산출
  const idx2 = content.indexOf('보드 산출');
  if (idx2 >= 0) {
    const sub2 = content.substring(idx2 - 20, idx2 + 15);
    console.log('Context around 보드 산출:', JSON.stringify(sub2));
  } else {
    console.log('보드 산출 also not found');
  }
}
