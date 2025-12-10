/**
 * Database client for synthetic-students
 * Uses better-sqlite3 for synchronous SQLite operations
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DbConfig {
  path: string;
  verbose?: boolean;
}

export class SyntheticStudentsDb {
  private db: Database.Database;

  constructor(config: DbConfig) {
    this.db = new Database(config.path, {
      verbose: config.verbose ? console.log : undefined,
    });
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Initialize database with schema
   */
  initialize(): void {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  /**
   * Get raw database instance for advanced queries
   */
  raw(): Database.Database {
    return this.db;
  }

  // ============================================
  // Items
  // ============================================

  insertItem(item: {
    id: string;
    source: string;
    topic?: string;
    difficulty_label?: string;
    stem: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct: string;
    explanation?: string;
    code?: string;
    human_difficulty?: number;
    human_discrimination?: number;
    n_human_responses?: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO items (
        id, source, topic, difficulty_label, stem,
        option_a, option_b, option_c, option_d,
        correct, explanation, code,
        human_difficulty, human_discrimination, n_human_responses
      ) VALUES (
        @id, @source, @topic, @difficulty_label, @stem,
        @option_a, @option_b, @option_c, @option_d,
        @correct, @explanation, @code,
        @human_difficulty, @human_discrimination, @n_human_responses
      )
    `);
    stmt.run(item);
  }

  insertItemsBatch(items: Parameters<typeof this.insertItem>[0][]): void {
    const insert = this.db.transaction((items) => {
      for (const item of items) {
        this.insertItem(item);
      }
    });
    insert(items);
  }

  getItem(id: string) {
    return this.db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  }

  getItems(filter?: { source?: string; topic?: string; limit?: number }) {
    let sql = 'SELECT * FROM items WHERE 1=1';
    const params: Record<string, unknown> = {};

    if (filter?.source) {
      sql += ' AND source = @source';
      params.source = filter.source;
    }
    if (filter?.topic) {
      sql += ' AND topic LIKE @topic';
      params.topic = `%${filter.topic}%`;
    }
    sql += ' ORDER BY imported_at DESC';
    if (filter?.limit) {
      sql += ' LIMIT @limit';
      params.limit = filter.limit;
    }

    return this.db.prepare(sql).all(params);
  }

  countItems(filter?: { source?: string; topic?: string }): number {
    let sql = 'SELECT COUNT(*) as count FROM items WHERE 1=1';
    const params: Record<string, unknown> = {};

    if (filter?.source) {
      sql += ' AND source = @source';
      params.source = filter.source;
    }
    if (filter?.topic) {
      sql += ' AND topic LIKE @topic';
      params.topic = `%${filter.topic}%`;
    }

    const result = this.db.prepare(sql).get(params) as { count: number };
    return result.count;
  }

  // ============================================
  // Personas
  // ============================================

  getPersona(id: string) {
    return this.db.prepare('SELECT * FROM personas WHERE id = ?').get(id);
  }

  getPersonas(category?: string) {
    if (category) {
      return this.db
        .prepare('SELECT * FROM personas WHERE category = ? ORDER BY theta DESC')
        .all(category);
    }
    return this.db
      .prepare('SELECT * FROM personas ORDER BY category, theta DESC')
      .all();
  }

  insertPersona(persona: {
    id: string;
    name: string;
    theta: number;
    description?: string;
    system_prompt: string;
    temperature?: number;
    category: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO personas (
        id, name, theta, description, system_prompt, temperature, category
      ) VALUES (
        @id, @name, @theta, @description, @system_prompt, @temperature, @category
      )
    `);
    stmt.run({
      temperature: 0.3,
      ...persona,
    });
  }

  // ============================================
  // Calibration Runs
  // ============================================

  createRun(run: {
    id: string;
    name?: string;
    description?: string;
    model: string;
    persona_ids: string[];
    item_filter?: string;
    n_items: number;
    n_personas: number;
    n_trials?: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO calibration_runs (
        id, name, description, model, persona_ids, item_filter,
        n_items, n_personas, n_trials, status
      ) VALUES (
        @id, @name, @description, @model, @persona_ids, @item_filter,
        @n_items, @n_personas, @n_trials, 'running'
      )
    `);
    stmt.run({
      ...run,
      persona_ids: JSON.stringify(run.persona_ids),
      n_trials: run.n_trials ?? 1,
    });
  }

  updateRun(
    id: string,
    updates: {
      total_responses?: number;
      total_cost_usd?: number;
      status?: string;
      completed_at?: string;
    }
  ): void {
    const setClauses: string[] = [];
    const params: Record<string, unknown> = { id };

    if (updates.total_responses !== undefined) {
      setClauses.push('total_responses = @total_responses');
      params.total_responses = updates.total_responses;
    }
    if (updates.total_cost_usd !== undefined) {
      setClauses.push('total_cost_usd = @total_cost_usd');
      params.total_cost_usd = updates.total_cost_usd;
    }
    if (updates.status) {
      setClauses.push('status = @status');
      params.status = updates.status;
    }
    if (updates.completed_at) {
      setClauses.push('completed_at = @completed_at');
      params.completed_at = updates.completed_at;
    }

    if (setClauses.length > 0) {
      const sql = `UPDATE calibration_runs SET ${setClauses.join(', ')} WHERE id = @id`;
      this.db.prepare(sql).run(params);
    }
  }

  getRun(id: string) {
    const run = this.db
      .prepare('SELECT * FROM calibration_runs WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (run && typeof run.persona_ids === 'string') {
      run.persona_ids = JSON.parse(run.persona_ids);
    }
    return run;
  }

  getRuns(limit = 20) {
    return this.db
      .prepare('SELECT * FROM calibration_runs ORDER BY started_at DESC LIMIT ?')
      .all(limit);
  }

  // ============================================
  // Synthetic Responses
  // ============================================

  insertResponse(response: {
    run_id: string;
    item_id: string;
    persona_id: string;
    trial?: number;
    selected: string;
    is_correct: number;
    reasoning?: string;
    latency_ms?: number;
    model: string;
    input_tokens?: number;
    output_tokens?: number;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO synthetic_responses (
        run_id, item_id, persona_id, trial, selected, is_correct,
        reasoning, latency_ms, model, input_tokens, output_tokens
      ) VALUES (
        @run_id, @item_id, @persona_id, @trial, @selected, @is_correct,
        @reasoning, @latency_ms, @model, @input_tokens, @output_tokens
      )
    `);
    const result = stmt.run({
      trial: 1,
      ...response,
    });
    return Number(result.lastInsertRowid);
  }

  insertResponsesBatch(responses: Parameters<typeof this.insertResponse>[0][]): void {
    const insert = this.db.transaction((responses) => {
      for (const response of responses) {
        this.insertResponse(response);
      }
    });
    insert(responses);
  }

  getResponses(filter: { run_id?: string; item_id?: string; persona_id?: string }) {
    let sql = 'SELECT * FROM synthetic_responses WHERE 1=1';
    const params: Record<string, unknown> = {};

    if (filter.run_id) {
      sql += ' AND run_id = @run_id';
      params.run_id = filter.run_id;
    }
    if (filter.item_id) {
      sql += ' AND item_id = @item_id';
      params.item_id = filter.item_id;
    }
    if (filter.persona_id) {
      sql += ' AND persona_id = @persona_id';
      params.persona_id = filter.persona_id;
    }

    return this.db.prepare(sql).all(params);
  }

  countResponses(runId: string): number {
    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM synthetic_responses WHERE run_id = ?')
      .get(runId) as { count: number };
    return result.count;
  }

  // ============================================
  // Human Responses
  // ============================================

  insertHumanResponse(response: {
    item_id: string;
    user_id?: string;
    selected: string;
    is_correct: number;
    latency_ms?: number;
    source?: string;
    created_at?: string;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO human_responses (
        item_id, user_id, selected, is_correct, latency_ms, source, created_at
      ) VALUES (
        @item_id, @user_id, @selected, @is_correct, @latency_ms, @source, @created_at
      )
    `);
    const result = stmt.run(response);
    return Number(result.lastInsertRowid);
  }

  getHumanResponses(itemId: string) {
    return this.db
      .prepare('SELECT * FROM human_responses WHERE item_id = ?')
      .all(itemId);
  }

  // ============================================
  // Item Statistics
  // ============================================

  insertStatistics(stats: {
    item_id: string;
    source_type: string;
    run_id?: string;
    n_responses: number;
    difficulty_index?: number;
    point_biserial?: number;
    option_a_rate?: number;
    option_b_rate?: number;
    option_c_rate?: number;
    option_d_rate?: number;
    functional_distractors?: number;
    nonfunctional_distractors?: number;
    response_variance?: number;
    flags?: string[];
    quality_score?: number;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO item_statistics (
        item_id, source_type, run_id, n_responses,
        difficulty_index, point_biserial,
        option_a_rate, option_b_rate, option_c_rate, option_d_rate,
        functional_distractors, nonfunctional_distractors,
        response_variance, flags, quality_score
      ) VALUES (
        @item_id, @source_type, @run_id, @n_responses,
        @difficulty_index, @point_biserial,
        @option_a_rate, @option_b_rate, @option_c_rate, @option_d_rate,
        @functional_distractors, @nonfunctional_distractors,
        @response_variance, @flags, @quality_score
      )
    `);
    const result = stmt.run({
      ...stats,
      flags: stats.flags ? JSON.stringify(stats.flags) : null,
    });
    return Number(result.lastInsertRowid);
  }

  getStatistics(filter: { item_id?: string; run_id?: string; source_type?: string }) {
    let sql = 'SELECT * FROM item_statistics WHERE 1=1';
    const params: Record<string, unknown> = {};

    if (filter.item_id) {
      sql += ' AND item_id = @item_id';
      params.item_id = filter.item_id;
    }
    if (filter.run_id) {
      sql += ' AND run_id = @run_id';
      params.run_id = filter.run_id;
    }
    if (filter.source_type) {
      sql += ' AND source_type = @source_type';
      params.source_type = filter.source_type;
    }

    return this.db.prepare(sql).all(params);
  }

  // ============================================
  // Persona Item Results
  // ============================================

  upsertPersonaItemResult(result: {
    run_id: string;
    item_id: string;
    persona_id: string;
    n_correct: number;
    n_total: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO persona_item_results (
        run_id, item_id, persona_id, n_correct, n_total, accuracy
      ) VALUES (
        @run_id, @item_id, @persona_id, @n_correct, @n_total, @accuracy
      )
      ON CONFLICT(run_id, item_id, persona_id) DO UPDATE SET
        n_correct = @n_correct,
        n_total = @n_total,
        accuracy = @accuracy
    `);
    stmt.run({
      ...result,
      accuracy: result.n_correct / result.n_total,
    });
  }

  getPersonaItemResults(runId: string) {
    return this.db
      .prepare('SELECT * FROM persona_item_results WHERE run_id = ?')
      .all(runId);
  }

  // ============================================
  // Validation Comparisons
  // ============================================

  insertValidation(validation: {
    run_id: string;
    n_items_compared: number;
    n_human_responses: number;
    difficulty_correlation?: number;
    discrimination_correlation?: number;
    difficulty_mae?: number;
    difficulty_bias?: number;
    classification_agreement?: number;
    flag_sensitivity?: number;
    flag_specificity?: number;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO validation_comparisons (
        run_id, n_items_compared, n_human_responses,
        difficulty_correlation, discrimination_correlation,
        difficulty_mae, difficulty_bias, classification_agreement,
        flag_sensitivity, flag_specificity
      ) VALUES (
        @run_id, @n_items_compared, @n_human_responses,
        @difficulty_correlation, @discrimination_correlation,
        @difficulty_mae, @difficulty_bias, @classification_agreement,
        @flag_sensitivity, @flag_specificity
      )
    `);
    const result = stmt.run(validation);
    return Number(result.lastInsertRowid);
  }

  // ============================================
  // Utility
  // ============================================

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: SyntheticStudentsDb | null = null;

export function getDb(config?: DbConfig): SyntheticStudentsDb {
  if (!dbInstance) {
    const path = config?.path ?? process.env.DATABASE_PATH ?? './data/synthetic-students.db';
    dbInstance = new SyntheticStudentsDb({ path, verbose: config?.verbose });
    dbInstance.initialize();
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
