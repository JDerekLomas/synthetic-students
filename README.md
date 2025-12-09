# Synthetic Students

**Can AI personas predict how humans respond to test questions?**

This research project explores using LLM-simulated student personas to calibrate educational assessment items *before* expensive human validation studies.

## The Problem

Traditional item calibration requires **250-750 human responses per item** for stable psychometric parameters. This creates a chicken-and-egg problem: you can't know if an item is good until many people take it, but you don't want to expose learners to bad items.

## Our Approach

We simulate diverse student personas using LLMs, then compare their aggregate response patterns to real human data:

```
┌─────────────────────────────────────────────────────────────┐
│  MCQ Item: "What will console.log(typeof null) output?"     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ Expert  │          │ Average │          │ Novice  │
   │ θ = 2.0 │          │ θ = 0.0 │          │ θ = -2.0│
   └────┬────┘          └────┬────┘          └────┬────┘
        │ ✓ "object"         │ ✗ "null"          │ ✗ "undefined"
        └─────────────────────┴─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Synthetic Statistics                                        │
│  • Difficulty: 0.33 (only expert got it right)              │
│  • Discrimination: 0.67 (separates ability levels)          │
│  • Distractors: "null" attracts average, "undefined" novice │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Research Question: Does this predict human statistics?      │
└─────────────────────────────────────────────────────────────┘
```

## Research Questions

| RQ | Question | Metric |
|----|----------|--------|
| **RQ1** | Do synthetic difficulty estimates correlate with human difficulty? | Pearson r |
| **RQ2** | Which persona framework best predicts human response patterns? | Correlation by persona type |
| **RQ3** | How many synthetic responses yield stable item parameters? | Learning curve analysis |
| **RQ4** | Can synthetic calibration flag problematic items before human testing? | Sensitivity/specificity |

## Key Insight

Prior work shows LLMs struggle to *lower* their accuracy when role-playing weaker students. We address this by:

1. **Varying temperature** (0.1 for experts → 0.9 for novices)
2. **Explicit knowledge gaps** in prompts ("You don't know about X")
3. **Multiple trials** per persona to capture response variance
4. **Aggregate statistics** rather than individual predictions

## Quick Start

```bash
# Install
npm install

# Import items from MCQMCP (34K+ assessment items)
npx synthetic-students import --source mcqmcp

# Run calibration on 100 science items
npx synthetic-students calibrate \
  --items "topic:science-biology" \
  --limit 100 \
  --personas ability-based \
  --trials 3

# View results
npx synthetic-students report --run-id <run_id>
```

## Persona Frameworks

### Ability-Based (Default)

Simple personas defined by ability level (θ) on IRT scale:

| Persona | θ | Temperature | Description |
|---------|---|-------------|-------------|
| Expert | +2.5 | 0.1 | Deep understanding, rarely wrong |
| Proficient | +1.0 | 0.3 | Good student, occasional errors |
| Developing | 0.0 | 0.5 | Average, struggles with hard items |
| Struggling | -1.0 | 0.7 | Significant gaps, common misconceptions |
| Novice | -2.0 | 0.9 | Beginner, often guessing |

### KLI Framework (Research)

Based on [Generative Students](https://arxiv.org/abs/2405.11591) - personas defined by specific knowledge components:

```typescript
{
  id: 'kli-js-intermediate',
  mastered: ['lexical_scope', 'closure_definition'],
  confused: ['var_hoisting'],  // Will make errors here
  unknown: ['let_const']       // Will guess randomly
}
```

## Statistics Computed

### Classical Test Theory (CTT)

- **Difficulty Index (p)**: Proportion correct (0-1)
- **Point-Biserial (rpb)**: Discrimination coefficient (-1 to +1)
- **Distractor Efficiency**: % of non-functional options (<5% selection)

### Quality Flags

| Flag | Condition | Action |
|------|-----------|--------|
| `ceiling_effect` | p > 0.90 | Item too easy |
| `floor_effect` | p < 0.20 | Item too hard |
| `low_discrimination` | rpb < 0.20 | Doesn't separate ability |
| `negative_discrimination` | rpb < 0 | Wrong answer key? |
| `weak_distractors` | ≥2 non-functional | Revise options |

## Output Example

```json
{
  "item_id": "js-closures-042",
  "synthetic": {
    "difficulty_index": 0.63,
    "point_biserial": 0.42,
    "distractor_analysis": {
      "A": { "rate": 0.10, "functional": true },
      "B": { "rate": 0.63, "correct": true },
      "C": { "rate": 0.20, "functional": true },
      "D": { "rate": 0.07, "functional": false }
    },
    "flags": ["weak_distractor_D"]
  },
  "human": {
    "difficulty_index": 0.58,
    "point_biserial": 0.39
  },
  "correlation": {
    "difficulty_diff": 0.05,
    "agreement": "high"
  }
}
```

## Project Structure

```
synthetic-students/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── db/                   # SQLite storage
│   ├── personas/             # Persona definitions
│   ├── simulation/           # LLM response generation
│   ├── statistics/           # CTT computations
│   └── validation/           # Human comparison
├── data/
│   ├── items/                # Imported item banks
│   └── results/              # Calibration outputs
└── analysis/                 # R scripts for paper
```

## Related Work

- [Generative Students](https://arxiv.org/abs/2405.11591) - LLM-simulated profiles for item evaluation (r=0.72 with human)
- [Can LLMs Simulate Students?](https://arxiv.org/abs/2507.08232) - Ability distribution analysis
- [MCQMCP](https://github.com/JDerekLomas/MCQMCP) - Item bank source (34K+ items, MIT/CC licensed)

## Cost Estimation

Using Claude 3 Haiku ($0.25/1M input, $1.25/1M output):

| Scenario | Items | Personas | Trials | Cost |
|----------|-------|----------|--------|------|
| Pilot | 100 | 6 | 1 | ~$0.50 |
| Small study | 500 | 6 | 3 | ~$7 |
| Full calibration | 1,000 | 10 | 3 | ~$25 |

## Roadmap

- [x] Core infrastructure (SQLite, CLI)
- [x] Ability-based personas
- [x] CTT statistics computation
- [ ] KLI persona framework
- [ ] Human response import from MCQMCP
- [ ] Correlation analysis & validation
- [ ] Paper figures (R scripts)

## Contributing

This is a research project. We welcome:
- Additional persona frameworks to test
- Item banks with human response data for validation
- Statistical methods beyond CTT (IRT, etc.)

## License

MIT

## Citation

```bibtex
@software{synthetic_students_2024,
  title = {Synthetic Students: AI-Based Item Calibration},
  author = {Lomas, Derek},
  year = {2024},
  url = {https://github.com/JDerekLomas/synthetic-students}
}
```
