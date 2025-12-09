/**
 * Type definitions for synthetic student personas
 */

import { z } from 'zod';

/**
 * Schema for persona definition
 */
export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  theta: z.number(), // IRT ability parameter, typically -3 to +3
  description: z.string().optional(),
  system_prompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.3),
  category: z.enum(['ability_based', 'kli', 'misconception', 'custom']),
});

export type Persona = z.infer<typeof PersonaSchema>;

/**
 * Knowledge-Learning-Instruction (KLI) persona definition
 * Based on "Generative Students" framework
 */
export const KLIPersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  theta: z.number(),
  description: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.5),
  category: z.literal('kli'),
  // Knowledge components
  mastered: z.array(z.string()), // Concepts they understand well
  confused: z.array(z.string()), // Concepts they misunderstand
  unknown: z.array(z.string()), // Concepts they haven't learned
});

export type KLIPersona = z.infer<typeof KLIPersonaSchema>;

/**
 * Misconception-based persona
 * Simulates specific common errors
 */
export const MisconceptionPersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  theta: z.number(),
  description: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.5),
  category: z.literal('misconception'),
  // Specific misconceptions this persona holds
  misconceptions: z.array(
    z.object({
      concept: z.string(),
      incorrect_belief: z.string(),
    })
  ),
});

export type MisconceptionPersona = z.infer<typeof MisconceptionPersonaSchema>;

/**
 * Response format from LLM
 */
export const ResponseSchema = z.object({
  selected: z.enum(['A', 'B', 'C', 'D']),
  reasoning: z.string().optional(),
});

export type Response = z.infer<typeof ResponseSchema>;

/**
 * Persona set for a calibration run
 */
export interface PersonaSet {
  id: string;
  name: string;
  description: string;
  personas: Persona[];
}

/**
 * Result of a single response generation
 */
export interface GenerationResult {
  persona_id: string;
  item_id: string;
  selected: 'A' | 'B' | 'C' | 'D';
  is_correct: boolean;
  reasoning?: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  model: string;
}
