#!/usr/bin/env node
/**
 * Import SciQ dataset into OpenSimStudent
 *
 * SciQ: 13,679 crowdsourced science questions (Physics, Chemistry, Biology)
 * Source: https://huggingface.co/datasets/sciq
 * License: CC BY-NC 3.0
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = './data/raw';
const SCIQ_URL = 'https://huggingface.co/datasets/allenai/sciq/resolve/main/data';

async function downloadFile(url, dest) {
  console.log(`Downloading ${url}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const text = await response.text();
  writeFileSync(dest, text);
  console.log(`  Saved to ${dest}`);
}

async function downloadSciQ() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const splits = ['train', 'validation', 'test'];
  for (const split of splits) {
    const dest = join(DATA_DIR, `sciq_${split}.jsonl`);
    if (existsSync(dest)) {
      console.log(`  ${split} already exists, skipping`);
      continue;
    }
    await downloadFile(`${SCIQ_URL}/${split}-00000-of-00001.parquet`, dest + '.parquet');
  }
}

function parseJsonl(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function transformToItem(entry, index) {
  // SciQ format: question, distractor1, distractor2, distractor3, correct_answer, support
  const options = [
    entry.correct_answer,
    entry.distractor1,
    entry.distractor2,
    entry.distractor3,
  ];

  // Shuffle options and track correct answer
  const shuffled = options
    .map((opt, i) => ({ opt, isCorrect: i === 0, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort);

  const correctIndex = shuffled.findIndex(o => o.isCorrect);
  const correctLetter = ['A', 'B', 'C', 'D'][correctIndex];

  return {
    id: `sciq-${index}`,
    source: 'sciq',
    topic: 'science',  // SciQ doesn't have fine-grained topics
    difficulty_label: null,  // No difficulty info in SciQ
    stem: entry.question,
    option_a: shuffled[0].opt,
    option_b: shuffled[1].opt,
    option_c: shuffled[2].opt,
    option_d: shuffled[3].opt,
    correct: correctLetter,
    explanation: entry.support || null,
    code: null,
  };
}

async function importSciQ() {
  console.log('\n=== SciQ Dataset Import ===\n');

  // Try to load from HuggingFace API directly
  console.log('Fetching from HuggingFace API...');

  const items = [];
  const splits = ['train', 'validation', 'test'];

  for (const split of splits) {
    try {
      // HuggingFace datasets API
      const url = `https://datasets-server.huggingface.co/rows?dataset=allenai%2Fsciq&config=default&split=${split}&offset=0&length=100`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`  Could not fetch ${split} via API, trying parquet...`);
        continue;
      }

      const data = await response.json();
      console.log(`  ${split}: ${data.rows?.length || 0} rows (sample)`);

      // The API returns paginated results, we need to get all
      // For now, let's use a different approach - download the full dataset
    } catch (err) {
      console.log(`  Error fetching ${split}: ${err.message}`);
    }
  }

  // Better approach: use the HF datasets streaming API
  console.log('\nDownloading full dataset from HuggingFace...');

  const allItems = [];
  let offset = 0;
  const batchSize = 100;

  for (const split of ['train', 'validation', 'test']) {
    console.log(`  Processing ${split}...`);
    let hasMore = true;
    let splitCount = 0;

    while (hasMore) {
      try {
        const url = `https://datasets-server.huggingface.co/rows?dataset=allenai%2Fsciq&config=default&split=${split}&offset=${offset}&length=${batchSize}`;
        const response = await fetch(url);

        if (!response.ok) {
          hasMore = false;
          continue;
        }

        const data = await response.json();
        const rows = data.rows || [];

        if (rows.length === 0) {
          hasMore = false;
          continue;
        }

        for (const row of rows) {
          const entry = row.row;
          allItems.push(transformToItem(entry, allItems.length));
        }

        splitCount += rows.length;
        offset += batchSize;

        // Rate limiting
        await new Promise(r => setTimeout(r, 100));

        if (rows.length < batchSize) {
          hasMore = false;
        }
      } catch (err) {
        console.log(`    Error at offset ${offset}: ${err.message}`);
        hasMore = false;
      }
    }

    console.log(`    Loaded ${splitCount} items from ${split}`);
    offset = 0;  // Reset for next split
  }

  console.log(`\nTotal items: ${allItems.length}`);

  // Save to file for import
  const outputPath = join(DATA_DIR, 'sciq_items.json');
  writeFileSync(outputPath, JSON.stringify(allItems, null, 2));
  console.log(`\nSaved to ${outputPath}`);
  console.log(`\nTo import into database, run:`);
  console.log(`  npm run import -- -f ${outputPath} -s sciq`);
}

// Run
importSciQ().catch(console.error);
