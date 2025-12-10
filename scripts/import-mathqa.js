#!/usr/bin/env node
/**
 * Import MathQA dataset into OpenSimStudent
 *
 * MathQA: 37,297 math word problems with explanations
 * Source: https://huggingface.co/datasets/math_qa
 * License: Apache 2.0
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = './data/raw';

function parseOptions(optionsStr) {
  // MathQA options format: "a ) 1 , b ) 2 , c ) 3 , d ) 4 , e ) 5"
  const matches = optionsStr.match(/([a-e])\s*\)\s*([^,]+)/gi);
  if (!matches) return null;

  const options = { a: '', b: '', c: '', d: '', e: '' };
  for (const match of matches) {
    const [, letter, text] = match.match(/([a-e])\s*\)\s*(.+)/i) || [];
    if (letter && text) {
      options[letter.toLowerCase()] = text.trim();
    }
  }

  return options;
}

function transformToItem(entry, index) {
  // MathQA format: Problem, Rationale, options (string), correct, category
  const options = parseOptions(entry.options || '');

  if (!options || !options.a) {
    return null;
  }

  // MathQA often has 5 options (a-e), we'll use only 4
  const correctLetter = (entry.correct || '').toLowerCase();
  const letterMap = { 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'D' };

  // Category maps to topic
  const categoryMap = {
    'gain': 'math-profit-loss',
    'general': 'math-general',
    'geometry': 'math-geometry',
    'other': 'math-general',
    'physics': 'math-physics',
    'probability': 'math-probability',
  };

  return {
    id: `mathqa-${index}`,
    source: 'mathqa',
    topic: categoryMap[entry.category] || 'math-general',
    difficulty_label: null,  // MathQA doesn't have difficulty labels
    stem: entry.Problem,
    option_a: options.a || '',
    option_b: options.b || '',
    option_c: options.c || '',
    option_d: options.d || options.e || '',  // If only 4 options, d; if 5, use e for d
    correct: letterMap[correctLetter] || 'A',
    explanation: entry.Rationale || null,
    code: null,
  };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        console.log(`    Rate limited, waiting ${delay}ms...`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`    Retry ${i + 1}/${retries}: ${err.message}`);
      await sleep(delay);
    }
  }
}

async function fetchDataset(split, limit = null) {
  const items = [];
  let offset = 0;
  const batchSize = 100;
  let hasMore = true;

  while (hasMore) {
    if (limit && items.length >= limit) {
      break;
    }

    try {
      const url = `https://datasets-server.huggingface.co/rows?dataset=math_qa&config=default&split=${split}&offset=${offset}&length=${batchSize}`;
      const data = await fetchWithRetry(url);
      const rows = data.rows || [];

      if (rows.length === 0) {
        hasMore = false;
        continue;
      }

      for (const row of rows) {
        if (limit && items.length >= limit) break;
        const item = transformToItem(row.row, items.length);
        if (item) items.push(item);
      }

      offset += batchSize;

      // Rate limiting
      await sleep(200);

      if (rows.length < batchSize) {
        hasMore = false;
      }

      // Progress
      if (offset % 500 === 0) {
        process.stdout.write(`\r    ${items.length} items...`);
      }
    } catch (err) {
      console.log(`    Error at offset ${offset}: ${err.message}`);
      hasMore = false;
    }
  }

  return items;
}

async function importMathQA(limit = null) {
  console.log('\n=== MathQA Dataset Import ===\n');

  if (limit) {
    console.log(`Limiting to ${limit} items per split\n`);
  }

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const allItems = [];
  const splits = ['train', 'validation', 'test'];

  for (const split of splits) {
    process.stdout.write(`Processing ${split}...`);
    const items = await fetchDataset(split, limit);
    console.log(` ${items.length} items`);
    allItems.push(...items);
  }

  console.log(`\nTotal items: ${allItems.length}`);

  // Summary by topic
  const topics = {};
  for (const item of allItems) {
    topics[item.topic] = (topics[item.topic] || 0) + 1;
  }
  console.log('\nBy topic:');
  for (const [topic, count] of Object.entries(topics).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${topic}: ${count}`);
  }

  // Save to file
  const outputPath = join(DATA_DIR, 'mathqa_items.json');
  writeFileSync(outputPath, JSON.stringify(allItems, null, 2));
  console.log(`\nSaved to ${outputPath}`);
  console.log(`\nTo import into database, run:`);
  console.log(`  npm run import -- -f ${outputPath} -s mathqa`);
}

// Parse args
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// Run
importMathQA(limit).catch(console.error);
