#!/usr/bin/env node
/**
 * Import MGKT (Multifactor General Knowledge Test) dataset into OpenSimStudent
 *
 * Source: http://openpsychometrics.org/_rawdata/
 * Contains: 32 questions, 19,218 human responses
 *
 * This is a unique dataset that has BOTH question text AND human response data,
 * allowing us to compute real psychometric statistics (difficulty, discrimination).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = './data/raw';
const MGKT_DIR = join(DATA_DIR, 'MGKT_data');

// Question definitions from codebook
const QUESTIONS = {
  'Q1': { text: 'Who of these were famous poets?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Emily Dickinson', A1: 'Robert Frost', A2: 'Sylvia Plath', A3: 'Maya Angelou', A4: 'Langston Hughes', A5: 'Elizabeth Cady Stanton', A6: 'Abigail Adams', A7: 'Marcel Cordoba', A8: 'Sun Tzu', A9: 'Trent Moseson' }},
  'Q2': { text: 'Which of these are Broadway musicals?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Cats', A1: 'The Lion King', A2: 'Hamilton', A3: 'Wicked', A4: 'Kinky Boots', A5: 'Casablanca', A6: 'The Tin Man', A7: 'Blue Swede Shoes', A8: 'Common Projects', A9: 'Amandine' }},
  'Q3': { text: 'Which of these are religious holidays?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Kwanzaa', A1: 'Christmas', A2: 'Ramadan', A3: 'Yom Kippur', A4: 'Hanukkah', A5: 'Mirch Masala', A6: 'Reconciliation', A7: 'Amadar', A8: 'Durest', A9: 'Viveza' }},
  'Q4': { text: 'Which of these are brands of makeup?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'CoverGirl', A1: 'Sephora', A2: 'Maybelline', A3: 'Dior', A4: 'Shiseido', A5: 'ThriftyGal', A6: 'Allenda', A7: 'Reis', A8: 'NewBeautyTruth', A9: 'Aejeong' }},
  'Q5': { text: 'Which of these drugs are painkillers?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Oxycodone', A1: 'Ibuprofen', A2: 'Codeine', A3: 'Morphine', A4: 'Asprin', A5: 'Modafinil', A6: 'Creatine', A7: 'Alemtuzumab', A8: 'Semtex', A9: 'Carboplatin' }},
  'Q6': { text: 'Which of these diseases are sexually transmitted?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'AIDS', A1: 'Herpes', A2: 'Chlamydia', A3: 'Human Papillomavirus', A4: 'Trichomoniasis', A5: 'Botulism', A6: 'Shingles', A7: 'Pneumonia', A8: 'Tuberculosis', A9: 'Pertusis' }},
  'Q7': { text: 'Which of these are brands of cigarettes?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Camel', A1: 'Marlboro', A2: 'Newport', A3: 'Pall Mall Box', A4: 'Pyramid', A5: "Seagram's", A6: 'Black Velvet', A7: 'Windsor', A8: 'Black Turkey', A9: 'Solo' }},
  'Q8': { text: 'Which of these are slang terms for marijuana?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'weed', A1: '420', A2: 'ganja', A3: 'chronic', A4: 'reefer', A5: 'smack', A6: 'tilt', A7: 'DnB', A8: 'José Garcia', A9: 'heavenly green' }},
  'Q9': { text: 'Which of these were ever colonies of France?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Senegal', A1: 'Ivory Coast', A2: 'Quebec', A3: 'Morocco', A4: 'Vietnam', A5: 'India', A6: 'Florida', A7: 'Brazil', A8: 'South Africa', A9: 'Egypt' }},
  'Q10': { text: 'Which of these countries still have a monarchy?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'United Kingdom', A1: 'Japan', A2: 'Sweden', A3: 'Thailand', A4: 'Saudi Arabia', A5: 'France', A6: 'Germany', A7: 'Russia', A8: 'China', A9: 'Brazil' }},
  'Q11': { text: 'Which of these countries produce a lot of oil?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Saudi Arabia', A1: 'Venezuela', A2: 'Nigeria', A3: 'Norway', A4: 'Qatar', A5: 'Zimbabwe', A6: 'Sweden', A7: 'Singapore', A8: 'Panama', A9: 'Japan' }},
  'Q12': { text: 'Which of these countries possess nuclear weapons?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Russia', A1: 'France', A2: 'Israel', A3: 'China', A4: 'Pakistan', A5: 'Germany', A6: 'Saudi Arabia', A7: 'Nigeria', A8: 'Mexico', A9: 'Spain' }},
  'Q13': { text: 'Which of these file types are video?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: '.mp4', A1: '.mkv', A2: '.avi', A3: '.wmv', A4: '.mov', A5: '.csv', A6: '.xls', A7: '.flac', A8: '.msi', A9: '.mp3' }},
  'Q14': { text: 'Which of these are web browsers?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Internet Explorer', A1: 'Firefox', A2: 'Safari', A3: 'Opera', A4: 'Chrome', A5: 'Slate', A6: 'Expedition', A7: 'Pipes', A8: 'Adele', A9: 'Telegram' }},
  'Q15': { text: 'Which of these are versions of the Linux operating system?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Ubuntu', A1: 'Debian', A2: 'Fedora', A3: 'RHEL', A4: 'Slackware', A5: 'IIS', A6: 'Kodiak', A7: 'Technitium', A8: 'Oracle', A9: 'Go' }},
  'Q16': { text: 'Which of these are HTTP status codes?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: '100 Continue', A1: '500 Internal Server Error', A2: '301 Moved Permanently', A3: '404 Not Found', A4: '502 Bad Gateway', A5: '500 Deleted', A6: '600 Encrypted', A7: '303 Payment Processing', A8: '209 Download Complete', A9: '101 Use Proxy' }},
  'Q17': { text: 'Which of these are garments (pieces of clothing)?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Shirt', A1: 'Tunic', A2: 'Sarong', A3: 'Shawl', A4: 'Camisole', A5: 'Jayanti', A6: 'Wristlings', A7: 'Cornik', A8: 'Cheapnik', A9: 'Frutiger' }},
  'Q18': { text: "Which of these are craftsman's tools?", correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Saw', A1: 'Chisel', A2: 'Bevel', A3: 'Caliper', A4: 'Awl', A5: 'Skree', A6: 'Wry', A7: 'Whisket', A8: 'Skane', A9: 'Brutch' }},
  'Q19': { text: 'Which of these are red wines?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Merlot', A1: 'Cabernet sauvignon', A2: 'Malbec', A3: 'Sangiovese', A4: 'Pinot noir', A5: 'Chardonnay', A6: 'Semillon', A7: 'Moscato', A8: 'Gewürztraminer', A9: 'Riesling' }},
  'Q20': { text: 'Which of these are card games?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Rummy', A1: 'Hearts', A2: 'Poker', A3: 'Bridge', A4: 'Cribbage', A5: 'Yahtzee', A6: 'Croquet', A7: 'Bocce', A8: 'Black 2s', A9: 'Manhattan' }},
  'Q21': { text: 'Which of these are electronic components?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Resistor', A1: 'Inductor', A2: 'Capacitor', A3: 'Transistor', A4: 'Diode', A5: 'Signer', A6: 'Subductor', A7: 'Annulus', A8: 'Boson', A9: 'Zenoid' }},
  'Q22': { text: 'Which of these are cryptocurrencies?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Bitcoin', A1: 'Litecoin', A2: 'Ethereum', A3: 'Monero', A4: 'Ripple', A5: 'AlphaBay', A6: 'DCA', A7: 'PayPal', A8: 'Liberty Ledger', A9: 'Dwork' }},
  'Q23': { text: 'Which of these countries contain many ancient pyramids?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Mexico', A1: 'Egypt', A2: 'India', A3: 'Sudan', A4: 'Indonesia', A5: 'Greece', A6: 'Turkey', A7: 'Congo', A8: 'Mongolia', A9: 'Japan' }},
  'Q24': { text: 'Who of these are famous criminals?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Al Capone', A1: 'Ted Kaczynski', A2: 'Pablo Escobar', A3: 'Timothy McVeigh', A4: 'Jim Jones', A5: 'Harvey Parnell', A6: 'Sid McMath', A7: 'John Goodman', A8: 'Buster Keaton', A9: 'Pavel Tikhonov' }},
  'Q25': { text: 'Which of these books have more than 1,000 pages?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Infinite Jest', A1: 'Les Miserables', A2: 'Atlas Shrugged', A3: 'War and Peace', A4: 'Cryptonomicon', A5: 'Pride and Prejudice', A6: 'Harry Potter and the Prisoner of Azkaban', A7: 'Fahrenheit 451', A8: 'To Kill a Mockingbird', A9: 'Science, and its Antecedents' }},
  'Q26': { text: 'Which of these are units of distance?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Mile', A1: 'Meter', A2: 'Furlong', A3: 'Parsec', A4: 'Angstrom', A5: 'Newton', A6: 'Pascal', A7: 'Pitch', A8: 'Hertz', A9: 'Annum' }},
  'Q27': { text: 'Which of these are exercise programs?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'CrossFit', A1: 'Zumba', A2: 'Barre', A3: 'Pilates', A4: 'Tabata', A5: 'Shiatsu', A6: 'Reflexology', A7: 'Gooba', A8: 'UltraMaxFit', A9: 'NTP' }},
  'Q28': { text: 'Which of these are internet abbreviations?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'LOL', A1: 'ROFL', A2: 'BRB', A3: 'GG', A4: 'DM', A5: 'QTY', A6: 'FUM', A7: 'AET', A8: 'TT', A9: 'MRLO' }},
  'Q29': { text: 'Which of these words have similar meaning to "fancy"?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'ornate', A1: 'adorned', A2: 'cushy', A3: 'resplendent', A4: 'spiffy', A5: 'effective', A6: 'virile', A7: 'esulent', A8: 'adscititious', A9: 'thalassic' }},
  'Q30': { text: 'Which of these are types of computer cables?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'HDMI', A1: 'USB', A2: 'Ethernet', A3: 'SATA', A4: 'FireWire', A5: 'WiFi', A6: 'D-High', A7: '2Interlink', A8: 'RTC', A9: 'HDD' }},
  'Q31': { text: 'Which of these are types of cancer?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Leukemia', A1: 'Lymphoma', A2: 'Melanoma', A3: 'Mesothelioma', A4: 'Sarcoma', A5: 'Lymnoma', A6: 'Colerectia', A7: 'Vitisus', A8: 'Tradoma', A9: 'Cellenia' }},
  'Q32': { text: 'Which of these are fabric patterns?', correct: ['A0', 'A1', 'A2', 'A3', 'A4'], options: { A0: 'Calico', A1: 'Paisley', A2: 'Pinstripe', A3: 'Plaid', A4: 'Tartan', A5: 'Periwinkle', A6: 'Snapdragon', A7: 'Stilted', A8: 'Arvo', A9: 'Tahoma' }},
};

// Topic mapping based on question content
const TOPIC_MAP = {
  'Q1': 'literature', 'Q2': 'arts', 'Q3': 'culture', 'Q4': 'consumer',
  'Q5': 'medicine', 'Q6': 'medicine', 'Q7': 'consumer', 'Q8': 'culture',
  'Q9': 'history', 'Q10': 'geography', 'Q11': 'geography', 'Q12': 'politics',
  'Q13': 'technology', 'Q14': 'technology', 'Q15': 'technology', 'Q16': 'technology',
  'Q17': 'culture', 'Q18': 'crafts', 'Q19': 'food', 'Q20': 'games',
  'Q21': 'technology', 'Q22': 'technology', 'Q23': 'history', 'Q24': 'history',
  'Q25': 'literature', 'Q26': 'science', 'Q27': 'health', 'Q28': 'technology',
  'Q29': 'language', 'Q30': 'technology', 'Q31': 'medicine', 'Q32': 'crafts',
};

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => row[h] = values[i]);
    return row;
  });
}

function computeItemStatistics(responses, questionId) {
  const scoreCol = `${questionId}S`;
  const answerCol = `${questionId}A`;
  const timeCol = `${questionId}E`;

  // Filter valid responses (score is a number)
  const validResponses = responses.filter(r => {
    const score = parseInt(r[scoreCol]);
    return !isNaN(score);
  });

  const n = validResponses.length;
  if (n === 0) return null;

  // Scores range from -5 to +5 (correct - incorrect selections)
  // Convert to binary: positive score = "correct enough"
  const scores = validResponses.map(r => parseInt(r[scoreCol]));

  // Difficulty: proportion with positive score (got more right than wrong)
  const positiveScores = scores.filter(s => s > 0).length;
  const difficulty = positiveScores / n;

  // For discrimination, we need total test performance
  // Calculate total score across all questions for each respondent
  const totalScores = validResponses.map(r => {
    let total = 0;
    for (let i = 1; i <= 32; i++) {
      const s = parseInt(r[`Q${i}S`]);
      if (!isNaN(s)) total += s;
    }
    return total;
  });

  // Split into high/low performers (median split)
  const sortedTotals = [...totalScores].sort((a, b) => a - b);
  const median = sortedTotals[Math.floor(n / 2)];

  const highPerformers = validResponses.filter((r, i) => totalScores[i] > median);
  const lowPerformers = validResponses.filter((r, i) => totalScores[i] <= median);

  // Discrimination: difference in correct rate between high and low groups
  const highCorrect = highPerformers.filter(r => parseInt(r[scoreCol]) > 0).length / highPerformers.length;
  const lowCorrect = lowPerformers.filter(r => parseInt(r[scoreCol]) > 0).length / lowPerformers.length;
  const discrimination = highCorrect - lowCorrect;

  // Response time statistics
  const times = validResponses.map(r => parseInt(r[timeCol])).filter(t => !isNaN(t) && t > 0);
  const meanTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;

  // Score distribution
  const scoreDist = {};
  for (let s = -5; s <= 5; s++) scoreDist[s] = 0;
  scores.forEach(s => {
    if (s >= -5 && s <= 5) scoreDist[s]++;
  });

  return {
    n_responses: n,
    difficulty_index: difficulty,
    discrimination_index: discrimination,
    mean_response_time_ms: meanTime,
    score_distribution: scoreDist,
    mean_score: scores.reduce((a, b) => a + b, 0) / n,
  };
}

function convertToMCQFormat(questionId, question, stats) {
  // Convert multi-select to standard MCQ format
  // We'll create a "which is correct" style question
  const opts = question.options;
  const correct = question.correct;

  // Pick 3 correct and 1 incorrect for a standard 4-option MCQ
  const correctOpts = correct.slice(0, 3).map(k => opts[k]);
  const incorrectOpts = Object.entries(opts)
    .filter(([k]) => !correct.includes(k))
    .map(([, v]) => v);
  const wrongOpt = incorrectOpts[0];

  // Shuffle and determine correct answer
  const allOpts = [...correctOpts, wrongOpt];
  // Don't shuffle - keep wrong answer as D for consistency

  return {
    id: `mgkt-${questionId.toLowerCase()}`,
    source: 'mgkt',
    topic: TOPIC_MAP[questionId] || 'general-knowledge',
    difficulty_label: stats.difficulty_index > 0.7 ? 'easy' : stats.difficulty_index > 0.4 ? 'medium' : 'hard',
    stem: `${question.text} (Select ALL that apply - 3 are correct)`,
    option_a: correctOpts[0],
    option_b: correctOpts[1],
    option_c: correctOpts[2],
    option_d: wrongOpt,
    correct: 'D',  // D is the incorrect one - inverted logic
    explanation: `Correct answers: ${correctOpts.join(', ')}. "${wrongOpt}" is NOT correct.`,
    code: null,
    // Human statistics
    human_difficulty: stats.difficulty_index,
    human_discrimination: stats.discrimination_index,
    n_human_responses: stats.n_responses,
    mean_response_time_ms: stats.mean_response_time_ms,
  };
}

async function importMGKT() {
  console.log('\n=== MGKT Dataset Import ===\n');
  console.log('Multifactor General Knowledge Test');
  console.log('Source: http://openpsychometrics.org/_rawdata/\n');

  if (!existsSync(MGKT_DIR)) {
    console.error(`Dataset not found at ${MGKT_DIR}`);
    console.error('Download from: http://openpsychometrics.org/_rawdata/MGKT_data.zip');
    process.exit(1);
  }

  // Load response data
  const csvPath = join(MGKT_DIR, 'data.csv');
  console.log(`Loading ${csvPath}...`);
  const csvContent = readFileSync(csvPath, 'utf-8');
  const responses = parseCSV(csvContent);
  console.log(`  Loaded ${responses.length} responses\n`);

  // Compute statistics for each question
  console.log('Computing item statistics...\n');
  const items = [];
  const statsReport = [];

  for (const [qId, question] of Object.entries(QUESTIONS)) {
    const stats = computeItemStatistics(responses, qId);
    if (!stats) {
      console.log(`  ${qId}: No valid responses`);
      continue;
    }

    const item = convertToMCQFormat(qId, question, stats);
    items.push(item);

    statsReport.push({
      id: qId,
      topic: TOPIC_MAP[qId],
      n: stats.n_responses,
      difficulty: stats.difficulty_index.toFixed(3),
      discrimination: stats.discrimination_index.toFixed(3),
      mean_time_sec: (stats.mean_response_time_ms / 1000).toFixed(1),
      mean_score: stats.mean_score.toFixed(2),
    });

    console.log(`  ${qId}: p=${stats.difficulty_index.toFixed(2)}, D=${stats.discrimination_index.toFixed(2)}, n=${stats.n_responses}`);
  }

  // Summary
  console.log('\n--- Summary ---\n');
  const avgDiff = items.reduce((a, i) => a + i.human_difficulty, 0) / items.length;
  const avgDisc = items.reduce((a, i) => a + i.human_discrimination, 0) / items.length;
  console.log(`Total items: ${items.length}`);
  console.log(`Mean difficulty (p-value): ${avgDiff.toFixed(3)}`);
  console.log(`Mean discrimination (D): ${avgDisc.toFixed(3)}`);

  // Difficulty distribution
  const easy = items.filter(i => i.difficulty_label === 'easy').length;
  const medium = items.filter(i => i.difficulty_label === 'medium').length;
  const hard = items.filter(i => i.difficulty_label === 'hard').length;
  console.log(`\nBy difficulty: Easy=${easy}, Medium=${medium}, Hard=${hard}`);

  // Save items
  const outputPath = join(DATA_DIR, 'mgkt_items.json');
  writeFileSync(outputPath, JSON.stringify(items, null, 2));
  console.log(`\nSaved items to ${outputPath}`);

  // Save statistics report
  const statsPath = join(DATA_DIR, 'mgkt_statistics.json');
  writeFileSync(statsPath, JSON.stringify(statsReport, null, 2));
  console.log(`Saved statistics to ${statsPath}`);

  console.log(`\nTo import into database, run:`);
  console.log(`  npm run import -- -f ${outputPath} -s mgkt`);
}

// Run
importMGKT().catch(console.error);
