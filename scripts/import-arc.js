#!/usr/bin/env node
/**
 * Import ARC (AI2 Reasoning Challenge) dataset into OpenSimStudent
 *
 * ARC: 7,787 grade-school science questions with Easy/Hard difficulty labels
 * Source: https://huggingface.co/datasets/allenai/ai2_arc
 * License: CC BY-SA 4.0
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = './data/raw';

function transformToItem(entry, subset, index) {
  // ARC format: id, question, choices: {text: [], label: []}, answerKey
  const choices = entry.choices;
  const labels = choices.label;  // Usually ['A', 'B', 'C', 'D'] or ['1', '2', '3', '4']
  const texts = choices.text;

  // Normalize labels to A/B/C/D
  const labelMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D' };

  // Some questions have 3 or 5 options - normalize to 4
  const options = ['', '', '', ''];
  for (let i = 0; i < Math.min(texts.length, 4); i++) {
    const idx = ['A', 'B', 'C', 'D'].indexOf(labelMap[labels[i]] || labels[i]);
    if (idx >= 0) {
      options[idx] = texts[i];
    }
  }

  // If we don't have 4 options, skip this item
  if (options.some(o => !o) && texts.length < 4) {
    return null;
  }

  const correctKey = labelMap[entry.answerKey] || entry.answerKey;

  return {
    id: `arc-${entry.id || index}`,
    source: 'arc',
    topic: 'science',
    difficulty_label: subset === 'ARC-Easy' ? 'easy' : 'hard',
    stem: entry.question,
    option_a: options[0] || texts[0] || '',
    option_b: options[1] || texts[1] || '',
    option_c: options[2] || texts[2] || '',
    option_d: options[3] || texts[3] || '',
    correct: correctKey,
    explanation: null,
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
        delay *= 2;  // Exponential backoff
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

async function fetchDataset(subset, split) {
  const items = [];
  let offset = 0;
  const batchSize = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `https://datasets-server.huggingface.co/rows?dataset=allenai%2Fai2_arc&config=${subset}&split=${split}&offset=${offset}&length=${batchSize}`;
      const data = await fetchWithRetry(url);
      const rows = data.rows || [];

      if (rows.length === 0) {
        hasMore = false;
        continue;
      }

      for (const row of rows) {
        const item = transformToItem(row.row, subset, items.length);
        if (item) items.push(item);
      }

      offset += batchSize;

      // Gentle rate limiting
      await sleep(200);

      if (rows.length < batchSize) {
        hasMore = false;
      }

      // Progress indicator
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

async function importARC() {
  console.log('\n=== ARC Dataset Import ===\n');

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  // Check for cached result
  const cachePath = join(DATA_DIR, 'arc_items.json');
  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, 'utf-8'));
    if (cached.length > 0) {
      console.log(`Using cached ${cachePath} (${cached.length} items)`);
      console.log(`Delete the file to re-download.\n`);
      return;
    }
  }

  const allItems = [];

  // ARC has two configs: ARC-Easy and ARC-Challenge
  const configs = [
    { name: 'ARC-Easy', splits: ['train', 'validation', 'test'] },
    { name: 'ARC-Challenge', splits: ['train', 'validation', 'test'] },
  ];

  for (const config of configs) {
    console.log(`Processing ${config.name}...`);

    for (const split of config.splits) {
      process.stdout.write(`  ${split}...`);
      const items = await fetchDataset(config.name, split);
      console.log(` ${items.length} items`);
      allItems.push(...items);

      // Save progress after each split
      writeFileSync(cachePath, JSON.stringify(allItems, null, 2));
    }
  }

  console.log(`\nTotal items: ${allItems.length}`);

  // Summary by difficulty
  const easy = allItems.filter(i => i.difficulty_label === 'easy');
  const hard = allItems.filter(i => i.difficulty_label === 'hard');
  console.log(`  Easy: ${easy.length}`);
  console.log(`  Hard: ${hard.length}`);

  // Save to file
  writeFileSync(cachePath, JSON.stringify(allItems, null, 2));
  console.log(`\nSaved to ${cachePath}`);
  console.log(`\nTo import into database, run:`);
  console.log(`  npm run import -- -f ${cachePath} -s arc`);
}

// Run
importARC().catch(console.error);
