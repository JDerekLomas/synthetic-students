-- Synthetic Students Database Schema
-- SQLite database for item calibration research

-- Items imported from MCQMCP or other sources
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,           -- 'mcqmcp', 'mmlu', 'arc', etc.
  topic TEXT,
  difficulty_label TEXT,          -- Original label: easy/medium/hard
  stem TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct TEXT NOT NULL,          -- A/B/C/D
  explanation TEXT,
  code TEXT,                      -- For programming questions
  imported_at TEXT DEFAULT (datetime('now'))
);

-- Synthetic student persona definitions
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theta REAL NOT NULL,            -- IRT ability parameter (-3 to +3)
  description TEXT,
  system_prompt TEXT NOT NULL,
  temperature REAL DEFAULT 0.3,
  category TEXT NOT NULL,         -- 'ability_based', 'kli', 'misconception'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Calibration experiment runs
CREATE TABLE IF NOT EXISTS calibration_runs (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  model TEXT NOT NULL,
  persona_ids TEXT NOT NULL,      -- JSON array of persona IDs
  item_filter TEXT,               -- Filter used (e.g., "topic:science-biology")
  n_items INTEGER,
  n_personas INTEGER,
  n_trials INTEGER DEFAULT 1,
  total_responses INTEGER,
  total_cost_usd REAL,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  status TEXT DEFAULT 'running'   -- running, completed, failed
);

-- Individual synthetic responses
CREATE TABLE IF NOT EXISTS synthetic_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  trial INTEGER DEFAULT 1,        -- Trial number (for multiple attempts)
  selected TEXT NOT NULL,         -- A/B/C/D
  is_correct INTEGER NOT NULL,    -- 0 or 1
  reasoning TEXT,                 -- Chain-of-thought output (optional)
  latency_ms INTEGER,             -- API response time
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES calibration_runs(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (persona_id) REFERENCES personas(id)
);

-- Human responses (for validation)
CREATE TABLE IF NOT EXISTS human_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  user_id TEXT,                   -- Anonymous identifier
  selected TEXT NOT NULL,         -- A/B/C/D
  is_correct INTEGER NOT NULL,
  latency_ms INTEGER,
  source TEXT,                    -- 'mcqmcp', 'qualtrics', 'prolific', etc.
  created_at TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Computed item statistics (synthetic or human)
CREATE TABLE IF NOT EXISTS item_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  source_type TEXT NOT NULL,      -- 'synthetic' or 'human'
  run_id TEXT,                    -- NULL for human stats
  n_responses INTEGER NOT NULL,

  -- Classical Test Theory metrics
  difficulty_index REAL,          -- p-value: proportion correct (0-1)
  point_biserial REAL,            -- Discrimination coefficient (-1 to +1)

  -- Distractor selection rates
  option_a_rate REAL,
  option_b_rate REAL,
  option_c_rate REAL,
  option_d_rate REAL,

  -- Distractor efficiency
  functional_distractors INTEGER, -- Count selected by >=5%
  nonfunctional_distractors INTEGER,

  -- Reliability metrics
  response_variance REAL,         -- Variance across personas/users

  -- Quality assessment
  flags TEXT,                     -- JSON array of flags
  quality_score REAL,             -- Overall quality (0-1)

  computed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (run_id) REFERENCES calibration_runs(id)
);

-- Per-persona breakdown for each item (for research analysis)
CREATE TABLE IF NOT EXISTS persona_item_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  n_correct INTEGER NOT NULL,
  n_total INTEGER NOT NULL,
  accuracy REAL NOT NULL,         -- n_correct / n_total
  FOREIGN KEY (run_id) REFERENCES calibration_runs(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (persona_id) REFERENCES personas(id),
  UNIQUE(run_id, item_id, persona_id)
);

-- Validation comparisons (synthetic vs human)
CREATE TABLE IF NOT EXISTS validation_comparisons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,           -- Synthetic run being validated
  n_items_compared INTEGER,
  n_human_responses INTEGER,

  -- Correlation metrics
  difficulty_correlation REAL,    -- Pearson r for p-values
  discrimination_correlation REAL,

  -- Agreement metrics
  difficulty_mae REAL,            -- Mean absolute error
  difficulty_bias REAL,           -- Mean difference (synthetic - human)
  classification_agreement REAL,  -- % agree on easy/medium/hard

  -- Flag agreement
  flag_sensitivity REAL,          -- True positive rate for flags
  flag_specificity REAL,          -- True negative rate

  computed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES calibration_runs(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_responses_run ON synthetic_responses(run_id);
CREATE INDEX IF NOT EXISTS idx_responses_item ON synthetic_responses(item_id);
CREATE INDEX IF NOT EXISTS idx_responses_persona ON synthetic_responses(persona_id);
CREATE INDEX IF NOT EXISTS idx_human_item ON human_responses(item_id);
CREATE INDEX IF NOT EXISTS idx_stats_item ON item_statistics(item_id);
CREATE INDEX IF NOT EXISTS idx_stats_run ON item_statistics(run_id);
CREATE INDEX IF NOT EXISTS idx_items_topic ON items(topic);
CREATE INDEX IF NOT EXISTS idx_items_source ON items(source);

-- Insert default ability-based personas
INSERT OR IGNORE INTO personas (id, name, theta, description, system_prompt, temperature, category) VALUES
('expert', 'Expert', 2.5, 'Deep understanding, rarely makes mistakes',
'You are an expert with deep understanding of this subject. Answer this multiple choice question correctly. Think step-by-step, then provide your answer as a single letter (A, B, C, or D).',
0.1, 'ability_based'),

('proficient', 'Proficient', 1.0, 'Good student, occasional careless errors',
'You are a good student who usually understands the material well. You occasionally make careless mistakes or have small gaps in knowledge. Answer this question based on your understanding. Provide your answer as a single letter (A, B, C, or D).',
0.3, 'ability_based'),

('developing', 'Developing', 0.0, 'Average student, struggles with harder material',
'You are an average student. You understand the basics but struggle with harder concepts. You sometimes confuse similar ideas or forget details. Answer this question as best you can. Provide your answer as a single letter (A, B, C, or D).',
0.5, 'ability_based'),

('struggling', 'Struggling', -1.0, 'Significant knowledge gaps, common misconceptions',
'You are a struggling student with significant gaps in your knowledge. You often misremember facts and frequently fall for common misconceptions. Pick the answer that seems most right to you. Provide your answer as a single letter (A, B, C, or D).',
0.7, 'ability_based'),

('novice', 'Novice', -2.0, 'Beginner, mostly guessing',
'You are a complete beginner who just started learning this topic. You have minimal knowledge and often have to guess based on what sounds familiar or makes intuitive sense. Make your best guess. Provide your answer as a single letter (A, B, C, or D).',
0.9, 'ability_based'),

('random', 'Random Baseline', -999, 'Pure random guessing (25% expected)',
'Select one answer at random: A, B, C, or D. Do not think or reason. Just pick one randomly.',
1.0, 'ability_based');
