# OpenSimStudent

**Open-source synthetic student simulation for educational assessment research**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is OpenSimStudent?

OpenSimStudent is a research platform that uses LLM-powered synthetic students to **calibrate test items before human testing**. Instead of waiting for hundreds of human responses to know if a question is good, simulate diverse student personas and get instant psychometric feedback.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   "What does console.log(typeof null) output?"                          │
│                                                                          │
│   A) "null"      B) "object"     C) "undefined"    D) "boolean"         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌────────────────────────┬┴┬────────────────────────┐
          ▼                        ▼                          ▼
    ┌───────────┐            ┌───────────┐            ┌───────────┐
    │  Expert   │            │  Average  │            │  Novice   │
    │  θ = +2.5 │            │  θ = 0.0  │            │  θ = -2.0 │
    │  T = 0.1  │            │  T = 0.5  │            │  T = 0.9  │
    └─────┬─────┘            └─────┬─────┘            └─────┬─────┘
          │                        │                        │
       ✓ B                      ✗ A                      ✗ C
    "object"                  "null"               "undefined"
          │                        │                        │
          └────────────────────────┴────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SYNTHETIC ITEM STATISTICS                                               │
│                                                                          │
│  Difficulty Index:     0.33  (only expert correct - hard item)          │
│  Discrimination:       0.67  (separates ability levels well)            │
│  Distractor Analysis:  A attracts avg, C attracts novice, D unused      │
│  Quality Flags:        ⚠️ weak_distractor (D < 5%)                       │
│                                                                          │
│  Recommendation: Revise option D or accept 3-option format              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Problem We Solve

### Traditional Item Calibration is Expensive

| Requirement | Cost |
|-------------|------|
| **250-750 responses per item** for stable psychometric parameters | Weeks of data collection |
| **Expert review** for content validity | $50-200 per item |
| **Pilot testing** before deployment | Exposes learners to unvalidated items |
| **Iterative revision** when items fail | Restart the whole process |

### The Chicken-and-Egg Problem

You can't know if an item is good until many people take it, but you don't want to expose learners to bad items.

### Our Solution

Simulate diverse student responses **before** human testing. Get instant feedback on:
- Is this item too easy or too hard?
- Does it discriminate between ability levels?
- Are all distractors functional?
- Should this item be revised before human testing?

---

## Research Questions

OpenSimStudent is designed to answer these core questions:

| RQ | Question | Method | Success Metric |
|----|----------|--------|----------------|
| **RQ1** | Do synthetic difficulty estimates correlate with human difficulty? | Compare p-values across matched items | Pearson r > 0.70 |
| **RQ2** | Which persona design best predicts human response patterns? | Test ability-based vs KLI vs misconception personas | Highest correlation |
| **RQ3** | How many synthetic responses yield stable parameters? | Learning curve analysis (5, 10, 15, 30 responses) | 95% CI width < 0.10 |
| **RQ4** | Can synthetic calibration identify problematic items? | Flag items, validate against human-detected issues | Sensitivity > 0.80 |

### Prior Work

- **[Generative Students](https://arxiv.org/abs/2405.11591)**: Achieved r=0.72 correlation between LLM-simulated and human responses
- **[Can LLMs Simulate Students?](https://arxiv.org/abs/2307.08232)**: Explored ability distribution simulation challenges
- **Key insight**: LLMs struggle to "play dumb" - we address this with temperature variation and explicit knowledge gaps

---

## How It Works

### 1. Import Items

Connect to [MCQMCP](https://github.com/JDerekLomas/mcqmcp) (34,000+ CC-licensed items) or upload your own:

```bash
# From MCQMCP
synthetic-students import --source mcqmcp --topic "javascript"

# From file
synthetic-students import --file ./my-items.json
```

### 2. Configure Personas

Choose a persona framework or create your own:

**Ability-Based (Default)**
| Persona | Ability (θ) | Temperature | Behavior |
|---------|-------------|-------------|----------|
| Expert | +2.5 | 0.1 | Deep understanding, methodical |
| Proficient | +1.0 | 0.3 | Good grasp, occasional slips |
| Developing | 0.0 | 0.5 | Basics understood, gaps remain |
| Struggling | -1.0 | 0.7 | Major gaps, common misconceptions |
| Novice | -2.0 | 0.9 | Beginner, often guessing |
| Random | — | 1.0 | Baseline (25% expected) |

**KLI Framework (Knowledge-Learning-Instruction)**
```typescript
{
  id: 'js-intermediate',
  mastered: ['lexical_scope', 'function_declaration'],
  confused: ['hoisting', 'closure_scope'],  // Will make systematic errors
  unknown: ['let_temporal_deadzone']        // Will guess
}
```

### 3. Run Calibration

```bash
synthetic-students calibrate \
  --topic "javascript" \
  --personas ability-based \
  --trials 3 \
  --model claude-3-haiku-20240307

# Estimate cost first
synthetic-students calibrate --topic "javascript" --estimate
```

### 4. Analyze Results

```bash
# Summary statistics
synthetic-students stats --run <run_id>

# Export for R/SPSS
synthetic-students stats --run <run_id> --output results.csv
```

---

## Statistics Computed

### Classical Test Theory (CTT)

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Difficulty Index (p)** | correct / total | 0.3-0.7 is ideal |
| **Point-Biserial (rpb)** | correlation with total score | > 0.30 is good discrimination |
| **Distractor Efficiency** | % selected per option | All distractors should attract ≥ 5% |

### Quality Flags

| Flag | Trigger | Recommended Action |
|------|---------|-------------------|
| `ceiling_effect` | p > 0.90 | Item too easy - increase difficulty |
| `floor_effect` | p < 0.20 | Item too hard - simplify or add scaffolding |
| `low_discrimination` | rpb < 0.20 | Doesn't separate ability - revise stem |
| `negative_discrimination` | rpb < 0 | Wrong answer key or confusing wording |
| `weak_distractors` | ≥2 options < 5% | Revise non-functional options |
| `high_variance` | personas disagree | Item may be ambiguous |

### Quality Score

Each item receives a 0-1 quality score based on:
- Difficulty in optimal range (0.3-0.7)
- Good discrimination (rpb > 0.30)
- All distractors functional
- No critical flags

---

## Integration with MCQMCP

OpenSimStudent is designed as a **companion to MCQMCP**, the open-source MCQ authoring and delivery platform:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  MCQMCP                              OpenSimStudent                      │
│  (Author & Deliver)                  (Calibrate & Validate)             │
│                                                                          │
│  ┌─────────────────────┐            ┌─────────────────────┐             │
│  │                     │            │                     │             │
│  │  Create Items ──────────────────▶ Synthetic Testing   │             │
│  │                     │            │                     │             │
│  │  Item Bank ─────────────────────▶ Batch Calibration   │             │
│  │  (34K+ items)       │            │                     │             │
│  │                     │            │                     │             │
│  │  Human Responses ◀──────────────── Validation Data    │             │
│  │                     │            │                     │             │
│  │  Item Metadata ◀────────────────── Difficulty Est.    │             │
│  │  (difficulty, etc)  │            │  Quality Flags      │             │
│  │                     │            │                     │             │
│  └─────────────────────┘            └─────────────────────┘             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Workflow

1. **Author items** in MCQMCP or import from existing banks
2. **Send to OpenSimStudent** for pre-human calibration
3. **Review flagged items** and revise before deployment
4. **Deploy to learners** with confidence
5. **Collect human data** and validate synthetic predictions
6. **Publish findings** on synthetic-human correlation

---

## Web Platform (Coming Soon)

A hosted version at **opensimstudent.org** will provide:

- **Persona Designer**: Visual builder for custom student profiles
- **Item Browser**: Search and select items from connected banks
- **Experiment Builder**: Configure runs with cost estimation
- **Results Dashboard**: Interactive statistics and visualizations
- **Validation Tools**: Upload human data for comparison analysis

BYOK (Bring Your Own Key) model - you provide your Anthropic API key.

---

## Installation

```bash
# Clone
git clone https://github.com/JDerekLomas/synthetic-students.git
cd synthetic-students

# Install
npm install

# Configure
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Initialize database
npm run dev -- init

# Verify
npm run dev -- list personas
```

---

## CLI Reference

```bash
# Initialize database
synthetic-students init

# Import items
synthetic-students import --file <path> --source <name>
synthetic-students import --source mcqmcp --topic <topic>

# List data
synthetic-students list items [--source <name>] [--topic <name>] [--limit <n>]
synthetic-students list personas [--category <name>]
synthetic-students list runs [--limit <n>]

# Run calibration
synthetic-students calibrate [options]
  --name <name>           Name for this run
  --source <name>         Filter items by source
  --topic <name>          Filter items by topic
  --limit <n>             Max items to calibrate
  --personas <set>        Persona set (standard-ability, full-ability, minimal)
  --model <name>          Claude model (default: claude-3-haiku-20240307)
  --trials <n>            Responses per persona per item (default: 1)
  --estimate              Show cost estimate without running
  --verbose               Show detailed progress

# Compute statistics
synthetic-students stats --run <id> [--output <path>] [--json]

# Show available models
synthetic-students models
```

---

## Cost Estimation

Using Claude 3 Haiku ($0.25/1M input, $1.25/1M output):

| Use Case | Items | Personas | Trials | API Calls | Est. Cost |
|----------|-------|----------|--------|-----------|-----------|
| Quick test | 10 | 5 | 1 | 50 | ~$0.05 |
| Pilot study | 100 | 6 | 1 | 600 | ~$0.50 |
| Small study | 500 | 6 | 3 | 9,000 | ~$7 |
| Full calibration | 1,000 | 6 | 3 | 18,000 | ~$15 |
| Large scale | 5,000 | 10 | 5 | 250,000 | ~$200 |

Always use `--estimate` before running large calibrations.

---

## Project Structure

```
synthetic-students/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── db/
│   │   ├── schema.sql        # SQLite schema (7 tables)
│   │   └── client.ts         # Database wrapper
│   ├── personas/
│   │   ├── types.ts          # Persona type definitions
│   │   └── presets.ts        # Built-in persona sets
│   ├── simulation/
│   │   └── runner.ts         # LLM response generation
│   ├── statistics/
│   │   └── classical.ts      # CTT computations
│   ├── validation/           # Human comparison (planned)
│   └── export/               # CSV/JSON export (planned)
├── data/
│   ├── items/                # Imported item banks
│   └── results/              # Calibration outputs
└── analysis/                 # R scripts for publication
```

---

## Database Schema

```sql
-- Core tables
items                 -- MCQ items (id, stem, options, correct, topic)
personas              -- Synthetic student definitions
calibration_runs      -- Experiment metadata
synthetic_responses   -- Individual AI responses
human_responses       -- For validation studies
item_statistics       -- Computed CTT metrics
validation_comparisons-- Synthetic vs human correlations
```

---

## Roadmap

### Phase 1: Core Infrastructure ✅
- [x] SQLite database with schema
- [x] CLI with import/calibrate/stats commands
- [x] Ability-based persona framework
- [x] Classical Test Theory statistics
- [x] Quality flagging system

### Phase 2: Research Tools
- [ ] KLI (Knowledge-Learning-Instruction) personas
- [ ] Misconception-based personas
- [ ] Human response import from MCQMCP
- [ ] Correlation analysis and Bland-Altman plots
- [ ] IRT parameter estimation

### Phase 3: Web Platform
- [ ] Next.js frontend
- [ ] Persona designer UI
- [ ] Real-time calibration progress
- [ ] Interactive results dashboard
- [ ] MCQMCP integration via API

### Phase 4: Community
- [ ] Shared persona marketplace
- [ ] Public calibration datasets
- [ ] Validation study results database
- [ ] Integration with other item banks

---

## Contributing

This is a **research project** focused on validating synthetic calibration methods. We welcome:

- **Persona frameworks**: New approaches to simulating student cognition
- **Validation data**: Item banks with human response data for correlation studies
- **Statistical methods**: IRT, Bayesian approaches, ML-based prediction
- **Integration**: Connectors to other assessment platforms

### For Researchers

If you use OpenSimStudent in your research, please:
1. Share your validation findings (synthetic-human correlations)
2. Contribute persona definitions that worked well
3. Report edge cases where synthetic calibration failed

---

## Citation

```bibtex
@software{opensimstudent_2024,
  title = {OpenSimStudent: AI-Based Item Calibration for Educational Assessment},
  author = {Lomas, Derek},
  year = {2024},
  url = {https://github.com/JDerekLomas/synthetic-students},
  note = {Open-source platform for synthetic student simulation}
}
```

---

## License

MIT License - free for research and commercial use.

---

## Acknowledgments

- [MCQMCP](https://github.com/JDerekLomas/mcqmcp) - Source of 34,000+ CC-licensed assessment items
- [Anthropic Claude](https://anthropic.com) - LLM backbone for persona simulation
- [Generative Students](https://arxiv.org/abs/2405.11591) - Foundational research on LLM-based item evaluation

---

**Questions?** Open an issue or contact [@JDerekLomas](https://github.com/JDerekLomas)
