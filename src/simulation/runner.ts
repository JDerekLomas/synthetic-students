/**
 * Simulation runner - orchestrates synthetic response generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import ora from 'ora';
import type { Persona, GenerationResult } from '../personas/types.js';
import { getDb } from '../db/client.js';

interface Item {
  id: string;
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: string;
  code?: string;
}

interface CalibrationConfig {
  name?: string;
  description?: string;
  model: string;
  personas: Persona[];
  items: Item[];
  trials: number;
  verbose?: boolean;
  onProgress?: (progress: ProgressUpdate) => void;
}

interface ProgressUpdate {
  completed: number;
  total: number;
  currentItem: string;
  currentPersona: string;
}

interface CalibrationResult {
  runId: string;
  totalResponses: number;
  totalCostUsd: number;
  durationMs: number;
}

// Pricing per 1M tokens (as of late 2024)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-3-5-haiku-20241022': { input: 1.0, output: 5.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
};

/**
 * Format an item for LLM consumption
 */
function formatItem(item: Item): string {
  let prompt = item.stem;

  if (item.code) {
    prompt += `\n\n\`\`\`\n${item.code}\n\`\`\``;
  }

  prompt += `\n\nA) ${item.option_a}`;
  prompt += `\nB) ${item.option_b}`;
  prompt += `\nC) ${item.option_c}`;
  prompt += `\nD) ${item.option_d}`;

  return prompt;
}

/**
 * Parse LLM response to extract answer
 */
function parseResponse(text: string): { selected: 'A' | 'B' | 'C' | 'D'; reasoning: string } | null {
  // Look for explicit answer patterns
  const patterns = [
    /(?:answer|select|choose|pick)(?:\s+is)?[:\s]+([ABCD])\b/i,
    /\b([ABCD])\)?\s*(?:is\s+)?(?:the\s+)?(?:correct|right|best)\b/i,
    /(?:^|\n)([ABCD])(?:\)|\.|\s|$)/m,
    /\b([ABCD])\b\s*$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const selected = match[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      return { selected, reasoning: text };
    }
  }

  // Last resort: find any standalone A/B/C/D
  const lastResort = text.match(/\b([ABCD])\b/g);
  if (lastResort && lastResort.length > 0) {
    const selected = lastResort[lastResort.length - 1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    return { selected, reasoning: text };
  }

  return null;
}

/**
 * Calculate cost for a response
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model] ?? PRICING['claude-3-haiku-20240307'];
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/**
 * Main calibration runner
 */
export async function runCalibration(config: CalibrationConfig): Promise<CalibrationResult> {
  const {
    name,
    description,
    model,
    personas,
    items,
    trials,
    verbose = false,
    onProgress,
  } = config;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const client = new Anthropic({ apiKey });
  const db = getDb();
  const runId = nanoid(12);

  // Create calibration run record
  db.createRun({
    id: runId,
    name: name ?? `calibration-${runId}`,
    description,
    model,
    persona_ids: personas.map((p) => p.id),
    n_items: items.length,
    n_personas: personas.length,
    n_trials: trials,
  });

  const totalCalls = items.length * personas.length * trials;
  let completed = 0;
  let totalCostUsd = 0;
  const startTime = Date.now();

  const spinner = ora({
    text: `Starting calibration (${totalCalls} API calls)...`,
    isSilent: !verbose,
  }).start();

  const results: GenerationResult[] = [];

  // Process each item
  for (const item of items) {
    for (const persona of personas) {
      for (let trial = 1; trial <= trials; trial++) {
        const itemPrompt = formatItem(item);
        const startMs = Date.now();

        try {
          const response = await client.messages.create({
            model,
            max_tokens: 500,
            temperature: persona.temperature,
            system: persona.system_prompt,
            messages: [
              {
                role: 'user',
                content: itemPrompt,
              },
            ],
          });

          const latencyMs = Date.now() - startMs;
          const text =
            response.content[0].type === 'text' ? response.content[0].text : '';
          const parsed = parseResponse(text);

          if (!parsed) {
            if (verbose) {
              console.warn(
                `\nFailed to parse response for ${item.id} / ${persona.id}: ${text.slice(0, 100)}`
              );
            }
            continue;
          }

          const isCorrect = parsed.selected === item.correct;
          const inputTokens = response.usage.input_tokens;
          const outputTokens = response.usage.output_tokens;
          const cost = calculateCost(model, inputTokens, outputTokens);
          totalCostUsd += cost;

          // Save to database
          db.insertResponse({
            run_id: runId,
            item_id: item.id,
            persona_id: persona.id,
            trial,
            selected: parsed.selected,
            is_correct: isCorrect ? 1 : 0,
            reasoning: parsed.reasoning,
            latency_ms: latencyMs,
            model,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
          });

          results.push({
            persona_id: persona.id,
            item_id: item.id,
            selected: parsed.selected,
            is_correct: isCorrect,
            reasoning: parsed.reasoning,
            latency_ms: latencyMs,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            model,
          });

          completed++;
          const progress: ProgressUpdate = {
            completed,
            total: totalCalls,
            currentItem: item.id,
            currentPersona: persona.id,
          };

          spinner.text = `[${completed}/${totalCalls}] ${item.id} / ${persona.id} (trial ${trial}) - $${totalCostUsd.toFixed(4)}`;

          if (onProgress) {
            onProgress(progress);
          }
        } catch (error) {
          if (verbose) {
            console.error(`\nError for ${item.id} / ${persona.id}:`, error);
          }
          // Continue with next item
        }

        // Rate limiting: small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  const durationMs = Date.now() - startTime;

  // Update run record
  db.updateRun(runId, {
    total_responses: completed,
    total_cost_usd: totalCostUsd,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });

  spinner.succeed(
    `Calibration complete: ${completed} responses, $${totalCostUsd.toFixed(4)}, ${(durationMs / 1000).toFixed(1)}s`
  );

  return {
    runId,
    totalResponses: completed,
    totalCostUsd,
    durationMs,
  };
}

/**
 * Estimate cost for a calibration run
 */
export function estimateCost(
  model: string,
  nItems: number,
  nPersonas: number,
  trials: number,
  avgInputTokens = 300,
  avgOutputTokens = 100
): { calls: number; minCost: number; maxCost: number } {
  const calls = nItems * nPersonas * trials;
  const pricing = PRICING[model] ?? PRICING['claude-3-haiku-20240307'];

  // Estimate based on average tokens
  const costPerCall =
    (avgInputTokens * pricing.input + avgOutputTokens * pricing.output) / 1_000_000;

  return {
    calls,
    minCost: calls * costPerCall * 0.7, // 30% buffer
    maxCost: calls * costPerCall * 1.3,
  };
}

/**
 * Get available models and their pricing
 */
export function getAvailableModels(): {
  id: string;
  inputPer1M: number;
  outputPer1M: number;
}[] {
  return Object.entries(PRICING).map(([id, prices]) => ({
    id,
    inputPer1M: prices.input,
    outputPer1M: prices.output,
  }));
}
