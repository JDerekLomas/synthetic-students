#!/usr/bin/env node
/**
 * Import RACE dataset into OpenSimStudent
 *
 * RACE: ~100,000 reading comprehension questions from Chinese English exams
 * Source: https://huggingface.co/datasets/race
 * License: For research use only
 *
 * Has difficulty labels: middle school vs high school
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = './data/raw';

function transformToItem(entry, subset, globalIndex) {
  // RACE format: article, question, options (array of 4), answer (A/B/C/D)
  const options = entry.options || [];

  // Skip if not 4 options
  if (options.length !== 4) {
    return null;
  }

  // Map middle/high to easy/hard
  const difficultyMap = {
    'middle': 'easy',
    'high': 'hard',
  };

  return {
    id: `race-${subset}-${globalIndex}`,
    source: 'race',
    topic: 'reading-comprehension',
    difficulty_label: difficultyMap[subset] || subset,
    stem: entry.question,
    option_a: options[0] || '',
    option_b: options[1] || '',
    option_c: options[2] || '',
    option_d: options[3] || '',
    correct: entry.answer,
    explanation: entry.article ? `Context: ${entry.article.slice(0, 500)}...` : null,
    code: null,
  };
}

async function fetchDataset(subset, split, limit = null) {
  const items = [];
  let offset = 0;
  const batchSize = 100;
  let hasMore = true;

  while (hasMore) {
    if (limit && items.length >= limit) {
      break;
    }

    try {
      const url = `https://datasets-server.huggingface.co/rows?dataset=ehovy%2Frace&config=${subset}&split=${split}&offset=${offset}&length=${batchSize}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`    API error: ${response.status}`);
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
        if (limit && items.length >= limit) break;
        const item = transformToItem(row.row, subset, items.length);
        if (item) items.push(item);
      }

      offset += batchSize;

      // Rate limiting
      await new Promise(r => setTimeout(r, 50));

      if (rows.length < batchSize) {
        hasMore = false;
      }

      // Progress
      if (offset % 1000 === 0) {
        process.stdout.write(`\r    ${items.length} items...`);
      }
    } catch (err) {
      console.log(`    Error at offset ${offset}: ${err.message}`);
      hasMore = false;
    }
  }

  return items;
}

async function importRACE(limit = null) {
  console.log('\n=== RACE Dataset Import ===\n');

  if (limit) {
    console.log(`Limiting to ${limit} items per split\n`);
  }

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const allItems = [];

  // RACE has two configs: middle and high
  const configs = [
    { name: 'middle', splits: ['train', 'validation', 'test'] },
    { name: 'high', splits: ['train', 'validation', 'test'] },
  ];

  for (const config of configs) {
    console.log(`Processing ${config.name} school...`);

    for (const split of config.splits) {
      process.stdout.write(`  ${split}...`);
      const items = await fetchDataset(config.name, split, limit);
      console.log(` ${items.length} items`);
      allItems.push(...items);
    }
  }

  console.log(`\nTotal items: ${allItems.length}`);

  // Summary by difficulty
  const easy = allItems.filter(i => i.difficulty_label === 'easy');
  const hard = allItems.filter(i => i.difficulty_label === 'hard');
  console.log(`  Middle (easy): ${easy.length}`);
  console.log(`  High (hard): ${hard.length}`);

  // Save to file
  const outputPath = join(DATA_DIR, 'race_items.json');
  writeFileSync(outputPath, JSON.stringify(allItems, null, 2));
  console.log(`\nSaved to ${outputPath}`);
  console.log(`\nTo import into database, run:`);
  console.log(`  npm run import -- -f ${outputPath} -s race`);
}

// Parse args
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

// Run
importRACE(limit).catch(console.error);
