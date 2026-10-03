/**
 * Thai Speech Optimization & Prosody Utilities
 * 
 * Standard offline/browser TTS engines lack contextual Thai word segmentation,
 * causing them to read continuous Thai script without natural breathing pauses.
 * This module pre-processes Thai text into natural phonological chunks and breath pauses.
 */

// Common Thai abbreviations and symbols to phonetic text
const THAI_EXPANSIONS: [RegExp, string][] = [
  [/ฯลฯ/g, ' และอื่นๆ '],
  [/ฯ/g, ' '],
  [/\bกทม\./g, 'กรุงเทพมหานคร'],
  [/\bพ\.ศ\./g, 'พุทธศักราช '],
  [/\bค\.ศ\./g, 'คริสต์ศักราช '],
  [/\bรพ\./g, 'โรงพยาบาล'],
  [/\bรร\./g, 'โรงเรียน'],
  [/\bผอ\./g, 'ผู้อำนวยการ'],
  [/\bดร\./g, 'ดอกเตอร์ '],
  [/\bน\./g, ' นาฬิกา '],
  [/%/g, ' เปอร์เซ็นต์ '],
  [/\+/g, ' บวก '],
  [/&/g, ' และ '],
  [/@/g, ' แอด '],
  [/#/g, ' แฮชแท็ก '],
];

// Natural Thai phrase transition words that warrant a breathing pause
const THAI_CONJUNCTIONS = [
  'แต่ว่า',
  'แต่',
  'เพราะว่า',
  'เพราะ',
  'ดังนั้น',
  'อย่างไรก็ตาม',
  'ในขณะที่',
  'นอกจากนี้',
  'ทั้งนี้',
  'รวมถึง',
  'ตลอดจน',
  'และ',
  'หรือ',
  'ซึ่ง',
  'เพื่อที่จะ',
  'หลังจากนั้น',
  'ต่อมา',
  'ตัวอย่างเช่น',
  'ยกตัวอย่างเช่น',
];

// Polite particles and clause terminals
const THAI_PARTICLES = [
  'นะครับ',
  'นะค่ะ',
  'นะคะ',
  'ครับผม',
  'ครับ',
  'ค่ะ',
  'จ้ะ',
  'จ้า',
];

/**
 * Optimizes Thai text for Browser Speech Synthesis by inserting micro-pauses
 * and expanding abbreviations so offline engines can breathe and segment correctly.
 */
export function optimizeThaiTextForSpeech(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let processed = text;

  // 1. Expand abbreviations and symbols
  for (const [pattern, replacement] of THAI_EXPANSIONS) {
    processed = processed.replace(pattern, replacement);
  }

  // 2. Separate numbers and Thai units (e.g. 500บาท -> 500 บาท)
  processed = processed.replace(/([0-9]+)\s*([ก-๙]+)/g, '$1 $2');
  processed = processed.replace(/([ก-๙]+)\s*([0-9]+)/g, '$1 $2');

  // 3. Add soft pause after polite endings if not followed by punctuation or line break
  for (const p of THAI_PARTICLES) {
    const regex = new RegExp(`(${p})(?![\\s,.:;!?\\n])`, 'g');
    processed = processed.replace(regex, `$1, `);
  }

  // 4. Add subtle breath pause before major conjunctions in long unbroken strings
  for (const conj of THAI_CONJUNCTIONS) {
    // Only insert if not already preceded by space or comma
    const regex = new RegExp(`(?<![\\s,.:;!?\\n])(${conj})`, 'g');
    processed = processed.replace(regex, `, $1`);
  }

  // 5. Clean up duplicate commas and spaces
  processed = processed
    .replace(/,\s*,+/g, ', ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  return processed;
}

/**
 * Formats visible textarea text with natural Thai reading spacing (เคาะเว้นวรรคจังหวะอ่าน)
 */
export function formatThaiTextSpacing(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let formatted = text;

  // Expand abbreviations
  for (const [pattern, replacement] of THAI_EXPANSIONS) {
    formatted = formatted.replace(pattern, replacement);
  }

  // Spacing around numbers
  formatted = formatted.replace(/([0-9]+)\s*([ก-๙]+)/g, '$1 $2');
  formatted = formatted.replace(/([ก-๙]+)\s*([0-9]+)/g, '$1 $2');

  // Space after polite particles
  for (const p of THAI_PARTICLES) {
    const regex = new RegExp(`(${p})(?![\\s,.:;!?\\n])`, 'g');
    formatted = formatted.replace(regex, `$1 `);
  }

  // Space before major conjunctions
  for (const conj of THAI_CONJUNCTIONS) {
    const regex = new RegExp(`(?<![\\s,.:;!?\\n])(${conj})`, 'g');
    formatted = formatted.replace(regex, ` $1`);
  }

  return formatted
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n /g, '\n')
    .trim();
}
