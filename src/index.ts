#!/usr/bin/env node
/**
 * Synthetic Students CLI
 * AI-based item calibration using synthetic student personas
 */

import { Command } from 'commander';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { getDb, closeDb } from './db/client.js';
import {
  ABILITY_PERSONAS,
  getPersonaSet,
  listPersonaSets,
} from './personas/presets.js';
import { runCalibration, estimateCost, getAvailableModels } from './simulation/runner.js';
import { computeRunStatistics, correlateStatistics } from './statistics/classical.js';

const program = new Command();

program
  .name('synthetic-students')
  .description('AI-based item calibration using synthetic student personas')
  .version('0.1.0');

// ============================================
// Import Command
// ============================================

program
  .command('import')
  .description('Import items from a JSON file')
  .requiredOption('-f, --file <path>', 'Path to JSON file containing items')
  .option('-s, --source <name>', 'Source name (e.g., mcqmcp, mmlu)', 'imported')
  .action(async (options) => {
    const db = getDb();

    if (!existsSync(options.file)) {
      console.error(`File not found: ${options.file}`);
      process.exit(1);
    }

    const data = JSON.parse(readFileSync(options.file, 'utf-8'));
    const items = Array.isArray(data) ? data : data.items ?? [];

    let imported = 0;
    for (const item of items) {
      // Skip non-MCQ items
      if (item.type && item.type !== 'multiple-choice') continue;

      try {
        db.insertItem({
          id: item.id,
          source: options.source,
          topic: item.topic,
          difficulty_label: item.difficulty,
          stem: item.stem,
          option_a: item.options?.A ?? item.option_a ?? '',
          option_b: item.options?.B ?? item.option_b ?? '',
          option_c: item.options?.C ?? item.option_c ?? '',
          option_d: item.options?.D ?? item.option_d ?? '',
          correct: item.correct,
          explanation: item.explanation ?? item.feedback?.explanation,
          code: item.code,
        });
        imported++;
      } catch (err) {
        console.warn(`Skipped item ${item.id}: ${err}`);
      }
    }

    console.log(`Imported ${imported} items from ${options.source}`);
    closeDb();
  });

// ============================================
// List Commands
// ============================================

const listCmd = program.command('list').description('List database contents');

listCmd
  .command('items')
  .description('List items in the database')
  .option('-s, --source <name>', 'Filter by source')
  .option('-t, --topic <name>', 'Filter by topic')
  .option('-l, --limit <n>', 'Limit results', '20')
  .action((options) => {
    const db = getDb();
    const items = db.getItems({
      source: options.source,
      topic: options.topic,
      limit: parseInt(options.limit),
    });

    console.log(`\nItems (${items.length} shown):\n`);
    for (const item of items as Record<string, unknown>[]) {
      console.log(`  ${item.id} [${item.source}] ${item.topic ?? 'no topic'}`);
      console.log(`    ${(item.stem as string).slice(0, 80)}...`);
    }

    const total = db.countItems({
      source: options.source,
      topic: options.topic,
    });
    console.log(`\nTotal: ${total} items`);
    closeDb();
  });

listCmd
  .command('personas')
  .description('List available personas')
  .option('-c, --category <name>', 'Filter by category')
  .action((options) => {
    const db = getDb();
    const personas = db.getPersonas(options.category);

    console.log('\nPersonas:\n');
    for (const p of personas as Record<string, unknown>[]) {
      console.log(
        `  ${p.id} (θ=${p.theta}, T=${p.temperature}) - ${p.name}`
      );
      console.log(`    ${p.description ?? 'No description'}`);
    }

    console.log('\nPersona Sets:\n');
    for (const set of listPersonaSets()) {
      console.log(`  ${set.id} - ${set.name} (${set.count} personas)`);
    }
    closeDb();
  });

listCmd
  .command('runs')
  .description('List calibration runs')
  .option('-l, --limit <n>', 'Limit results', '10')
  .action((options) => {
    const db = getDb();
    const runs = db.getRuns(parseInt(options.limit));

    console.log('\nCalibration Runs:\n');
    for (const run of runs as Record<string, unknown>[]) {
      const status = run.status === 'completed' ? '✓' : '...';
      console.log(
        `  ${status} ${run.id} - ${run.name ?? 'unnamed'} (${run.model})`
      );
      console.log(
        `    ${run.n_items} items × ${run.n_personas} personas = ${run.total_responses ?? '?'} responses`
      );
      if (run.total_cost_usd) {
        console.log(`    Cost: $${(run.total_cost_usd as number).toFixed(4)}`);
      }
    }
    closeDb();
  });

// ============================================
// Calibrate Command
// ============================================

program
  .command('calibrate')
  .description('Run calibration on items')
  .option('-n, --name <name>', 'Name for this calibration run')
  .option('-s, --source <name>', 'Filter items by source')
  .option('-t, --topic <name>', 'Filter items by topic')
  .option('-l, --limit <n>', 'Limit number of items')
  .option(
    '-p, --personas <set>',
    'Persona set to use (standard-ability, full-ability, minimal)',
    'standard-ability'
  )
  .option(
    '-m, --model <name>',
    'Claude model to use',
    process.env.DEFAULT_MODEL ?? 'claude-3-haiku-20240307'
  )
  .option('--trials <n>', 'Number of trials per persona per item', '1')
  .option('--estimate', 'Only estimate cost, do not run')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const db = getDb();

    // Get items
    const items = db.getItems({
      source: options.source,
      topic: options.topic,
      limit: options.limit ? parseInt(options.limit) : undefined,
    }) as Record<string, unknown>[];

    if (items.length === 0) {
      console.error('No items found matching filter');
      process.exit(1);
    }

    // Get personas
    const personaSet = getPersonaSet(options.personas);
    if (!personaSet) {
      console.error(`Unknown persona set: ${options.personas}`);
      console.error('Available sets:', listPersonaSets().map((s) => s.id).join(', '));
      process.exit(1);
    }

    const trials = parseInt(options.trials);

    // Cost estimate
    const estimate = estimateCost(
      options.model,
      items.length,
      personaSet.personas.length,
      trials
    );

    console.log('\nCalibration Plan:');
    console.log(`  Items: ${items.length}`);
    console.log(`  Personas: ${personaSet.personas.length} (${personaSet.name})`);
    console.log(`  Trials: ${trials}`);
    console.log(`  Model: ${options.model}`);
    console.log(`  Total API calls: ${estimate.calls}`);
    console.log(
      `  Estimated cost: $${estimate.minCost.toFixed(2)} - $${estimate.maxCost.toFixed(2)}`
    );

    if (options.estimate) {
      closeDb();
      return;
    }

    console.log('\nStarting calibration...\n');

    const result = await runCalibration({
      name: options.name,
      model: options.model,
      personas: personaSet.personas,
      items: items.map((i) => ({
        id: i.id as string,
        stem: i.stem as string,
        option_a: i.option_a as string,
        option_b: i.option_b as string,
        option_c: i.option_c as string,
        option_d: i.option_d as string,
        correct: i.correct as string,
        code: i.code as string | undefined,
      })),
      trials,
      verbose: options.verbose,
    });

    console.log(`\nRun ID: ${result.runId}`);
    console.log(`Use 'synthetic-students stats --run ${result.runId}' to compute statistics`);

    closeDb();
  });

// ============================================
// Stats Command
// ============================================

program
  .command('stats')
  .description('Compute statistics for a calibration run')
  .requiredOption('-r, --run <id>', 'Calibration run ID')
  .option('-o, --output <path>', 'Output CSV file')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const db = getDb();

    const run = db.getRun(options.run);
    if (!run) {
      console.error(`Run not found: ${options.run}`);
      process.exit(1);
    }

    // Get responses
    const responses = db.getResponses({ run_id: options.run }) as {
      persona_id: string;
      item_id: string;
      selected: string;
      is_correct: number;
    }[];

    // Get item correct answers
    const itemIds = [...new Set(responses.map((r) => r.item_id))];
    const items = itemIds.map((id) => db.getItem(id)).filter(Boolean) as {
      id: string;
      correct: string;
    }[];

    // Compute statistics
    const stats = computeRunStatistics(responses, items);

    // Save to database
    for (const s of stats) {
      db.insertStatistics({
        item_id: s.item_id,
        source_type: 'synthetic',
        run_id: options.run,
        n_responses: s.n_responses,
        difficulty_index: s.difficulty_index,
        point_biserial: s.point_biserial,
        option_a_rate: s.option_rates.A,
        option_b_rate: s.option_rates.B,
        option_c_rate: s.option_rates.C,
        option_d_rate: s.option_rates.D,
        functional_distractors: s.functional_distractors,
        nonfunctional_distractors: s.nonfunctional_distractors,
        response_variance: s.response_variance,
        flags: s.flags,
        quality_score: s.quality_score,
      });
    }

    // Output
    if (options.json) {
      console.log(JSON.stringify(stats, null, 2));
    } else if (options.output) {
      const csv = stringify(
        stats.map((s) => ({
          item_id: s.item_id,
          n: s.n_responses,
          difficulty: s.difficulty_index.toFixed(3),
          discrimination: s.point_biserial.toFixed(3),
          rate_A: s.option_rates.A.toFixed(3),
          rate_B: s.option_rates.B.toFixed(3),
          rate_C: s.option_rates.C.toFixed(3),
          rate_D: s.option_rates.D.toFixed(3),
          functional_distractors: s.functional_distractors,
          flags: s.flags.join(';'),
          quality: s.quality_score.toFixed(2),
        })),
        { header: true }
      );
      const dir = options.output.split('/').slice(0, -1).join('/');
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      require('fs').writeFileSync(options.output, csv);
      console.log(`Statistics saved to ${options.output}`);
    } else {
      // Summary output
      console.log(`\nStatistics for run ${options.run}:`);
      console.log(`  Items: ${stats.length}`);
      console.log(
        `  Mean difficulty: ${(stats.reduce((a, s) => a + s.difficulty_index, 0) / stats.length).toFixed(3)}`
      );
      console.log(
        `  Mean discrimination: ${(stats.reduce((a, s) => a + s.point_biserial, 0) / stats.length).toFixed(3)}`
      );

      const flagged = stats.filter((s) => s.flags.length > 0);
      console.log(`  Flagged items: ${flagged.length} (${((flagged.length / stats.length) * 100).toFixed(1)}%)`);

      // Flag breakdown
      const flagCounts: Record<string, number> = {};
      for (const s of stats) {
        for (const f of s.flags) {
          flagCounts[f] = (flagCounts[f] ?? 0) + 1;
        }
      }
      if (Object.keys(flagCounts).length > 0) {
        console.log('\n  Flag breakdown:');
        for (const [flag, count] of Object.entries(flagCounts).sort(
          (a, b) => b[1] - a[1]
        )) {
          console.log(`    ${flag}: ${count}`);
        }
      }
    }

    closeDb();
  });

// ============================================
// Models Command
// ============================================

program
  .command('models')
  .description('List available Claude models and pricing')
  .action(() => {
    console.log('\nAvailable Models:\n');
    for (const m of getAvailableModels()) {
      console.log(`  ${m.id}`);
      console.log(
        `    Input: $${m.inputPer1M.toFixed(2)}/1M tokens, Output: $${m.outputPer1M.toFixed(2)}/1M tokens`
      );
    }
  });

// ============================================
// Init Command
// ============================================

program
  .command('init')
  .description('Initialize database with schema and default personas')
  .action(() => {
    // Ensure data directory exists
    if (!existsSync('./data')) {
      mkdirSync('./data', { recursive: true });
    }

    const db = getDb();
    console.log('Database initialized');
    console.log(`  Location: ${process.env.DATABASE_PATH ?? './data/synthetic-students.db'}`);
    console.log(`  Default personas: ${ABILITY_PERSONAS.length}`);
    closeDb();
  });

// Parse and run
program.parse();
