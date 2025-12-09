/**
 * Preset persona definitions for synthetic student simulation
 */

import type { Persona, PersonaSet } from './types.js';

/**
 * Ability-based personas with varying skill levels
 * Uses temperature to simulate uncertainty at lower ability levels
 */
export const ABILITY_PERSONAS: Persona[] = [
  {
    id: 'expert',
    name: 'Expert',
    theta: 2.5,
    description: 'Deep understanding, rarely makes mistakes',
    system_prompt: `You are an expert with deep understanding of this subject. Answer this multiple choice question correctly. Think step-by-step, then provide your answer as a single letter (A, B, C, or D).`,
    temperature: 0.1,
    category: 'ability_based',
  },
  {
    id: 'proficient',
    name: 'Proficient',
    theta: 1.0,
    description: 'Good student, occasional careless errors',
    system_prompt: `You are a good student who usually understands the material well. You occasionally make careless mistakes or have small gaps in knowledge. Answer this question based on your understanding. Provide your answer as a single letter (A, B, C, or D).`,
    temperature: 0.3,
    category: 'ability_based',
  },
  {
    id: 'developing',
    name: 'Developing',
    theta: 0.0,
    description: 'Average student, struggles with harder material',
    system_prompt: `You are an average student. You understand the basics but struggle with harder concepts. You sometimes confuse similar ideas or forget details. Answer this question as best you can. Provide your answer as a single letter (A, B, C, or D).`,
    temperature: 0.5,
    category: 'ability_based',
  },
  {
    id: 'struggling',
    name: 'Struggling',
    theta: -1.0,
    description: 'Significant knowledge gaps, common misconceptions',
    system_prompt: `You are a struggling student with significant gaps in your knowledge. You often misremember facts and frequently fall for common misconceptions. Pick the answer that seems most right to you. Provide your answer as a single letter (A, B, C, or D).`,
    temperature: 0.7,
    category: 'ability_based',
  },
  {
    id: 'novice',
    name: 'Novice',
    theta: -2.0,
    description: 'Beginner, mostly guessing',
    system_prompt: `You are a complete beginner who just started learning this topic. You have minimal knowledge and often have to guess based on what sounds familiar or makes intuitive sense. Make your best guess. Provide your answer as a single letter (A, B, C, or D).`,
    temperature: 0.9,
    category: 'ability_based',
  },
  {
    id: 'random',
    name: 'Random Baseline',
    theta: -999, // Special marker for random baseline
    description: 'Pure random guessing (25% expected)',
    system_prompt: `Select one answer at random: A, B, C, or D. Do not think or reason. Just pick one randomly.`,
    temperature: 1.0,
    category: 'ability_based',
  },
];

/**
 * Standard 5-level ability set (excludes random baseline)
 */
export const STANDARD_ABILITY_SET: PersonaSet = {
  id: 'standard-ability',
  name: 'Standard Ability Levels',
  description: '5 personas from expert to novice based on IRT ability parameter',
  personas: ABILITY_PERSONAS.filter((p) => p.id !== 'random'),
};

/**
 * Full ability set including random baseline
 */
export const FULL_ABILITY_SET: PersonaSet = {
  id: 'full-ability',
  name: 'Full Ability Set with Random Baseline',
  description: '6 personas including random guessing baseline for validation',
  personas: ABILITY_PERSONAS,
};

/**
 * Minimal set for quick testing
 */
export const MINIMAL_SET: PersonaSet = {
  id: 'minimal',
  name: 'Minimal Test Set',
  description: '3 personas (expert, developing, novice) for quick calibration',
  personas: ABILITY_PERSONAS.filter((p) =>
    ['expert', 'developing', 'novice'].includes(p.id)
  ),
};

/**
 * Get persona by ID
 */
export function getPersona(id: string): Persona | undefined {
  return ABILITY_PERSONAS.find((p) => p.id === id);
}

/**
 * Get persona set by ID
 */
export function getPersonaSet(id: string): PersonaSet | undefined {
  const sets: Record<string, PersonaSet> = {
    'standard-ability': STANDARD_ABILITY_SET,
    'full-ability': FULL_ABILITY_SET,
    minimal: MINIMAL_SET,
  };
  return sets[id];
}

/**
 * List available persona sets
 */
export function listPersonaSets(): { id: string; name: string; count: number }[] {
  return [
    {
      id: 'standard-ability',
      name: STANDARD_ABILITY_SET.name,
      count: STANDARD_ABILITY_SET.personas.length,
    },
    {
      id: 'full-ability',
      name: FULL_ABILITY_SET.name,
      count: FULL_ABILITY_SET.personas.length,
    },
    {
      id: 'minimal',
      name: MINIMAL_SET.name,
      count: MINIMAL_SET.personas.length,
    },
  ];
}

/**
 * Generate a KLI persona prompt from knowledge components
 */
export function generateKLIPrompt(
  mastered: string[],
  confused: string[],
  unknown: string[]
): string {
  let prompt = 'You are a student with the following knowledge state:\n\n';

  if (mastered.length > 0) {
    prompt += `You UNDERSTAND these concepts well: ${mastered.join(', ')}\n`;
  }

  if (confused.length > 0) {
    prompt += `You are CONFUSED about these concepts and often make mistakes with them: ${confused.join(', ')}\n`;
  }

  if (unknown.length > 0) {
    prompt += `You have NOT LEARNED these concepts yet: ${unknown.join(', ')}\n`;
  }

  prompt += `\nAnswer the question based on your current knowledge state. If you don't know something, make your best guess. Provide your answer as a single letter (A, B, C, or D).`;

  return prompt;
}

/**
 * Generate a misconception persona prompt
 */
export function generateMisconceptionPrompt(
  misconceptions: { concept: string; incorrect_belief: string }[]
): string {
  let prompt =
    'You are a student who has some incorrect beliefs. You believe the following:\n\n';

  for (const m of misconceptions) {
    prompt += `- About ${m.concept}: ${m.incorrect_belief}\n`;
  }

  prompt += `\nAnswer the question based on your beliefs, even if they lead you to the wrong answer. Provide your answer as a single letter (A, B, C, or D).`;

  return prompt;
}
