/**
 * Classical Test Theory (CTT) statistics computation
 */

import {
  mean,
  standardDeviation,
  sampleCorrelation,
  variance,
} from 'simple-statistics';

export interface Response {
  persona_id: string;
  item_id: string;
  selected: string;
  is_correct: number;
}

export interface ItemStatistics {
  item_id: string;
  n_responses: number;
  difficulty_index: number; // p-value (proportion correct)
  point_biserial: number; // Discrimination index
  option_rates: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  functional_distractors: number;
  nonfunctional_distractors: number;
  response_variance: number;
  flags: string[];
  quality_score: number;
}

/**
 * Calculate difficulty index (p-value)
 * Proportion of respondents who answered correctly
 */
export function difficultyIndex(responses: Response[]): number {
  if (responses.length === 0) return 0;
  const correct = responses.filter((r) => r.is_correct === 1).length;
  return correct / responses.length;
}

/**
 * Calculate option selection rates
 */
export function optionRates(responses: Response[]): Record<string, number> {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of responses) {
    if (r.selected in counts) {
      counts[r.selected as keyof typeof counts]++;
    }
  }
  const total = responses.length || 1;
  return {
    A: counts.A / total,
    B: counts.B / total,
    C: counts.C / total,
    D: counts.D / total,
  };
}

/**
 * Calculate distractor effectiveness
 * Functional distractors are those selected by >= 5% of respondents
 */
export function distractorAnalysis(
  responses: Response[],
  correctAnswer: string
): { functional: number; nonfunctional: number } {
  const rates = optionRates(responses);
  let functional = 0;
  let nonfunctional = 0;

  for (const [option, rate] of Object.entries(rates)) {
    if (option === correctAnswer) continue;
    if (rate >= 0.05) {
      functional++;
    } else {
      nonfunctional++;
    }
  }

  return { functional, nonfunctional };
}

/**
 * Calculate point-biserial correlation (discrimination index)
 * Measures how well an item discriminates between high and low performers
 *
 * Formula: r_pb = (M_p - M_q) / S_t * sqrt(p * q)
 * Where:
 * - M_p = mean total score of those who got item correct
 * - M_q = mean total score of those who got item incorrect
 * - S_t = standard deviation of total scores
 * - p = proportion correct
 * - q = 1 - p
 */
export function pointBiserial(
  itemResponses: Response[],
  totalScores: Map<string, number>
): number {
  if (itemResponses.length < 3) return 0;

  const correct = itemResponses.filter((r) => r.is_correct === 1);
  const incorrect = itemResponses.filter((r) => r.is_correct === 0);

  if (correct.length === 0 || incorrect.length === 0) return 0;

  const scoresCorrect = correct
    .map((r) => totalScores.get(r.persona_id))
    .filter((s): s is number => s !== undefined);
  const scoresIncorrect = incorrect
    .map((r) => totalScores.get(r.persona_id))
    .filter((s): s is number => s !== undefined);

  if (scoresCorrect.length === 0 || scoresIncorrect.length === 0) return 0;

  const meanCorrect = mean(scoresCorrect);
  const meanIncorrect = mean(scoresIncorrect);
  const allScores = [...totalScores.values()];
  const sd = standardDeviation(allScores);

  if (sd === 0) return 0;

  const p = correct.length / itemResponses.length;
  const q = 1 - p;

  return ((meanCorrect - meanIncorrect) / sd) * Math.sqrt(p * q);
}

/**
 * Calculate total scores for each persona across all items
 */
export function calculateTotalScores(
  responses: Response[]
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const r of responses) {
    const current = scores.get(r.persona_id) ?? 0;
    scores.set(r.persona_id, current + r.is_correct);
  }

  return scores;
}

/**
 * Flag items based on statistical criteria
 */
export function flagItem(stats: {
  difficulty_index: number;
  point_biserial: number;
  nonfunctional_distractors: number;
  response_variance: number;
}): string[] {
  const flags: string[] = [];

  // Difficulty flags
  if (stats.difficulty_index > 0.9) {
    flags.push('ceiling_effect'); // Too easy
  }
  if (stats.difficulty_index < 0.2) {
    flags.push('floor_effect'); // Too hard
  }

  // Discrimination flags
  if (stats.point_biserial < 0.2 && stats.point_biserial >= 0) {
    flags.push('low_discrimination');
  }
  if (stats.point_biserial < 0) {
    flags.push('negative_discrimination'); // Serious problem
  }

  // Distractor flags
  if (stats.nonfunctional_distractors >= 2) {
    flags.push('weak_distractors');
  }

  // Variance flag (personas disagree significantly)
  if (stats.response_variance > 0.4) {
    flags.push('high_variance');
  }

  return flags;
}

/**
 * Calculate quality score based on CTT metrics (0-1)
 */
export function qualityScore(stats: {
  difficulty_index: number;
  point_biserial: number;
  functional_distractors: number;
  flags: string[];
}): number {
  let score = 1.0;

  // Ideal difficulty is 0.4-0.8
  if (stats.difficulty_index < 0.2 || stats.difficulty_index > 0.9) {
    score -= 0.2;
  } else if (stats.difficulty_index < 0.3 || stats.difficulty_index > 0.85) {
    score -= 0.1;
  }

  // Good discrimination is >= 0.3
  if (stats.point_biserial < 0) {
    score -= 0.4; // Serious problem
  } else if (stats.point_biserial < 0.2) {
    score -= 0.2;
  } else if (stats.point_biserial < 0.3) {
    score -= 0.1;
  }

  // All 3 distractors should be functional
  score -= (3 - stats.functional_distractors) * 0.1;

  // Deduct for critical flags
  if (stats.flags.includes('negative_discrimination')) {
    score -= 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Compute full statistics for a single item
 */
export function computeItemStatistics(
  itemId: string,
  itemResponses: Response[],
  allResponses: Response[],
  correctAnswer: string
): ItemStatistics {
  const totalScores = calculateTotalScores(allResponses);
  const difficulty = difficultyIndex(itemResponses);
  const discrimination = pointBiserial(itemResponses, totalScores);
  const rates = optionRates(itemResponses);
  const distractors = distractorAnalysis(itemResponses, correctAnswer);

  // Calculate response variance across personas
  const personaCorrectRates = new Map<string, number[]>();
  for (const r of itemResponses) {
    const arr = personaCorrectRates.get(r.persona_id) ?? [];
    arr.push(r.is_correct);
    personaCorrectRates.set(r.persona_id, arr);
  }
  const personaMeans = [...personaCorrectRates.values()].map(mean);
  const responseVariance = personaMeans.length > 1 ? variance(personaMeans) : 0;

  const flags = flagItem({
    difficulty_index: difficulty,
    point_biserial: discrimination,
    nonfunctional_distractors: distractors.nonfunctional,
    response_variance: responseVariance,
  });

  const quality = qualityScore({
    difficulty_index: difficulty,
    point_biserial: discrimination,
    functional_distractors: distractors.functional,
    flags,
  });

  return {
    item_id: itemId,
    n_responses: itemResponses.length,
    difficulty_index: difficulty,
    point_biserial: discrimination,
    option_rates: rates as ItemStatistics['option_rates'],
    functional_distractors: distractors.functional,
    nonfunctional_distractors: distractors.nonfunctional,
    response_variance: responseVariance,
    flags,
    quality_score: quality,
  };
}

/**
 * Compute statistics for all items in a run
 */
export function computeRunStatistics(
  responses: Response[],
  items: { id: string; correct: string }[]
): ItemStatistics[] {
  const itemMap = new Map(items.map((i) => [i.id, i.correct]));
  const responsesByItem = new Map<string, Response[]>();

  for (const r of responses) {
    const arr = responsesByItem.get(r.item_id) ?? [];
    arr.push(r);
    responsesByItem.set(r.item_id, arr);
  }

  const stats: ItemStatistics[] = [];

  for (const [itemId, itemResponses] of responsesByItem) {
    const correctAnswer = itemMap.get(itemId);
    if (!correctAnswer) continue;

    stats.push(
      computeItemStatistics(itemId, itemResponses, responses, correctAnswer)
    );
  }

  return stats;
}

/**
 * Compute correlation between two sets of item statistics
 * (e.g., synthetic vs human)
 */
export function correlateStatistics(
  stats1: ItemStatistics[],
  stats2: ItemStatistics[]
): {
  difficulty_correlation: number;
  discrimination_correlation: number;
  n_items: number;
} {
  // Match items by ID
  const map2 = new Map(stats2.map((s) => [s.item_id, s]));
  const pairs: { diff1: number; diff2: number; disc1: number; disc2: number }[] = [];

  for (const s1 of stats1) {
    const s2 = map2.get(s1.item_id);
    if (s2) {
      pairs.push({
        diff1: s1.difficulty_index,
        diff2: s2.difficulty_index,
        disc1: s1.point_biserial,
        disc2: s2.point_biserial,
      });
    }
  }

  if (pairs.length < 3) {
    return {
      difficulty_correlation: 0,
      discrimination_correlation: 0,
      n_items: pairs.length,
    };
  }

  const diffCorr = sampleCorrelation(
    pairs.map((p) => p.diff1),
    pairs.map((p) => p.diff2)
  );

  const discCorr = sampleCorrelation(
    pairs.map((p) => p.disc1),
    pairs.map((p) => p.disc2)
  );

  return {
    difficulty_correlation: isNaN(diffCorr) ? 0 : diffCorr,
    discrimination_correlation: isNaN(discCorr) ? 0 : discCorr,
    n_items: pairs.length,
  };
}

/**
 * Calculate mean absolute error between difficulty indices
 */
export function difficultyMAE(
  stats1: ItemStatistics[],
  stats2: ItemStatistics[]
): number {
  const map2 = new Map(stats2.map((s) => [s.item_id, s]));
  let totalError = 0;
  let count = 0;

  for (const s1 of stats1) {
    const s2 = map2.get(s1.item_id);
    if (s2) {
      totalError += Math.abs(s1.difficulty_index - s2.difficulty_index);
      count++;
    }
  }

  return count > 0 ? totalError / count : 0;
}
