/**
 * AI-Powered Item Metadata Labeling Script
 *
 * Analyzes MCQ items and labels them with:
 * - Grade level (K-12, college)
 * - Topic/subject area
 * - Standards alignment (Common Core, NGSS, etc.)
 * - Specific skills/knowledge components
 * - Cognitive level (Bloom's taxonomy)
 *
 * Usage:
 *   ANTHROPIC_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_KEY=xxx npx tsx scripts/label-items.ts
 *
 * Options:
 *   --source <id>     Filter by source (e.g., gsm8k, arc, mmlu)
 *   --limit <n>       Max items to process (default: 10)
 *   --dry-run         Don't save to database, just print results
 *   --batch <n>       Items per API call for batch analysis (default: 5)
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
  process.exit(1);
}

// Support z.ai and other API providers
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  baseURL: ANTHROPIC_BASE_URL,
});
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// LABELING SCHEMA
// ============================================================================

interface ItemLabels {
  // Grade level
  grade_level: string;  // e.g., "grade-3", "grade-6", "grade-9-12", "college"
  grade_band: string;   // e.g., "elementary", "middle", "high", "college"

  // Subject/Topic hierarchy
  subject: string;      // e.g., "mathematics", "science", "ela"
  domain: string;       // e.g., "algebra", "life-science", "reading-comprehension"
  topic: string;        // e.g., "linear-equations", "cell-biology", "main-idea"

  // Standards alignment
  standards: string[];  // e.g., ["CCSS.MATH.6.EE.A.2", "NGSS.MS-LS1-2"]

  // Skills and knowledge components
  skills: string[];     // e.g., ["solve-equations", "interpret-graphs", "apply-formula"]
  knowledge_components: string[];  // Specific facts/concepts tested

  // Cognitive complexity
  blooms_level: string;  // "remember", "understand", "apply", "analyze", "evaluate", "create"
  dok_level: number;     // Depth of Knowledge (1-4)

  // Item characteristics
  requires_calculation: boolean;
  requires_reasoning: boolean;
  has_visual: boolean;
  word_problem: boolean;

  // Confidence
  confidence: number;    // 0-1, how confident the model is in these labels
  labeling_notes?: string;  // Any notes about edge cases or uncertainty
}

// Grade level definitions
const GRADE_LEVELS = {
  'K': { band: 'elementary', description: 'Kindergarten (ages 5-6)' },
  'grade-1': { band: 'elementary', description: 'First grade (ages 6-7)' },
  'grade-2': { band: 'elementary', description: 'Second grade (ages 7-8)' },
  'grade-3': { band: 'elementary', description: 'Third grade (ages 8-9)' },
  'grade-4': { band: 'elementary', description: 'Fourth grade (ages 9-10)' },
  'grade-5': { band: 'elementary', description: 'Fifth grade (ages 10-11)' },
  'grade-6': { band: 'middle', description: 'Sixth grade (ages 11-12)' },
  'grade-7': { band: 'middle', description: 'Seventh grade (ages 12-13)' },
  'grade-8': { band: 'middle', description: 'Eighth grade (ages 13-14)' },
  'grade-9': { band: 'high', description: 'Ninth grade / Freshman (ages 14-15)' },
  'grade-10': { band: 'high', description: 'Tenth grade / Sophomore (ages 15-16)' },
  'grade-11': { band: 'high', description: 'Eleventh grade / Junior (ages 16-17)' },
  'grade-12': { band: 'high', description: 'Twelfth grade / Senior (ages 17-18)' },
  'college-intro': { band: 'college', description: 'College introductory level' },
  'college-advanced': { band: 'college', description: 'College advanced/upper division' },
  'graduate': { band: 'graduate', description: 'Graduate level' },
};

// Subject taxonomy
const SUBJECTS = {
  mathematics: {
    domains: ['arithmetic', 'algebra', 'geometry', 'statistics', 'calculus', 'number-theory'],
  },
  science: {
    domains: ['life-science', 'physical-science', 'earth-science', 'chemistry', 'physics', 'biology'],
  },
  'english-language-arts': {
    domains: ['reading-comprehension', 'writing', 'grammar', 'vocabulary', 'literature'],
  },
  'social-studies': {
    domains: ['history', 'geography', 'civics', 'economics'],
  },
  'computer-science': {
    domains: ['programming', 'algorithms', 'data-structures', 'systems', 'theory'],
  },
};

// ============================================================================
// LABELING PROMPT
// ============================================================================

const LABELING_SYSTEM_PROMPT = `You are an expert educational content analyst. Your task is to analyze multiple choice questions and label them with detailed metadata.

For each item, provide labels in the following JSON structure:

{
  "grade_level": "grade-X" or "college-intro" etc.,
  "grade_band": "elementary" | "middle" | "high" | "college",
  "subject": "mathematics" | "science" | "english-language-arts" | "social-studies" | "computer-science",
  "domain": specific domain within subject,
  "topic": specific topic being assessed,
  "standards": ["standard codes if identifiable"],
  "skills": ["specific skills required"],
  "knowledge_components": ["specific facts or concepts tested"],
  "blooms_level": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
  "dok_level": 1-4,
  "requires_calculation": true/false,
  "requires_reasoning": true/false,
  "has_visual": true/false,
  "word_problem": true/false,
  "confidence": 0.0-1.0,
  "labeling_notes": "any relevant notes"
}

Grade Level Guidelines:
- Consider vocabulary complexity, concept abstraction, and typical curriculum placement
- Math: Basic arithmetic (K-3), multi-step (3-5), pre-algebra (6-8), algebra/geometry (9-12), calculus (college)
- Science: Simple observations (K-2), basic concepts (3-5), middle school science (6-8), HS biology/chemistry/physics (9-12)

Bloom's Taxonomy Levels:
- remember: recall facts, definitions
- understand: explain concepts, interpret
- apply: use knowledge in new situations
- analyze: break down, compare, contrast
- evaluate: make judgments, critique
- create: synthesize, design new solutions

Depth of Knowledge (DOK):
- 1: Recall - basic facts, simple procedures
- 2: Skill/Concept - requires some mental processing
- 3: Strategic Thinking - requires reasoning, planning
- 4: Extended Thinking - complex, multi-step analysis

Be specific and accurate. If uncertain, note it in labeling_notes and lower the confidence score.`;

// ============================================================================
// ITEM INTERFACE
// ============================================================================

interface DBItem {
  id: string;
  source: string;
  topic: string | null;
  difficulty: string | null;
  stem: string;
  code: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: string;
  explanation: string | null;
  metadata: Record<string, unknown> | null;
}

// ============================================================================
// LABELING FUNCTIONS
// ============================================================================

async function labelItems(items: DBItem[]): Promise<Map<string, ItemLabels>> {
  const results = new Map<string, ItemLabels>();

  // Format items for the prompt
  const itemsText = items.map((item, idx) => {
    let text = `\n--- ITEM ${idx + 1} ---\n`;
    text += `ID: "${item.id}"\n`;
    text += `Question: ${item.stem}\n`;
    if (item.code) {
      text += `Code:\n${item.code}\n`;
    }
    text += `A) ${item.option_a}\n`;
    text += `B) ${item.option_b}\n`;
    if (item.option_c) text += `C) ${item.option_c}\n`;
    if (item.option_d) text += `D) ${item.option_d}\n`;
    text += `Correct: ${item.correct}\n`;
    if (item.explanation) {
      text += `Explanation: ${item.explanation}\n`;
    }
    return text;
  }).join('\n');

  // Create the expected ID list
  const idList = items.map(item => `"${item.id}"`).join(', ');

  const userPrompt = `Please analyze these ${items.length} items and provide labels for each.

IMPORTANT: You MUST use the EXACT item IDs provided (${idList}). Do NOT make up IDs like "item-id-1".

Return a JSON object with the exact item IDs as keys:
{
  "${items[0]?.id}": { ...labels... },
  "${items[1]?.id}": { ...labels... },
  ...
}

${itemsText}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',  // Use Haiku for cost efficiency
      max_tokens: 4096,
      system: LABELING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text from response
    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response');
      return results;
    }

    const labelsObj = JSON.parse(jsonMatch[0]);

    for (const [itemId, labels] of Object.entries(labelsObj)) {
      results.set(itemId, labels as ItemLabels);
    }
  } catch (error) {
    console.error('Error labeling items:', error);
  }

  return results;
}

async function fetchItems(source?: string, limit: number = 10): Promise<DBItem[]> {
  let query = supabase
    .from('items')
    .select('id, source, topic, difficulty, stem, code, option_a, option_b, option_c, option_d, correct, explanation, metadata');

  if (source) {
    query = query.eq('source', source);
  }

  // Prefer items without detailed labels yet
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching items:', error.message);
    return [];
  }

  return data || [];
}

async function updateItemMetadata(itemId: string, labels: ItemLabels): Promise<boolean> {
  // Fetch current metadata
  const { data: item, error: fetchError } = await supabase
    .from('items')
    .select('metadata')
    .eq('id', itemId)
    .single();

  if (fetchError) {
    console.error(`Error fetching item ${itemId}:`, fetchError.message);
    return false;
  }

  // Merge new labels into metadata
  const currentMetadata = (item?.metadata || {}) as Record<string, unknown>;
  const newMetadata = {
    ...currentMetadata,
    labels: {
      ...labels,
      labeled_at: new Date().toISOString(),
      labeled_by: 'claude-3-haiku',
    },
    // Also set top-level grade_level for filtering
    grade_level: labels.grade_level,
    grade_band: labels.grade_band,
  };

  const { error: updateError } = await supabase
    .from('items')
    .update({
      metadata: newMetadata,
      topic: labels.topic,  // Update topic field directly
    })
    .eq('id', itemId);

  if (updateError) {
    console.error(`Error updating item ${itemId}:`, updateError.message);
    return false;
  }

  return true;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const source = args.includes('--source') ? args[args.indexOf('--source') + 1] : undefined;
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 10;
  const dryRun = args.includes('--dry-run');
  const batchSize = args.includes('--batch') ? parseInt(args[args.indexOf('--batch') + 1]) : 5;

  console.log('='.repeat(60));
  console.log('AI-Powered Item Metadata Labeling');
  console.log('='.repeat(60));
  console.log(`Source: ${source || 'all'}`);
  console.log(`Limit: ${limit}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');

  // Fetch items
  console.log('Fetching items...');
  const items = await fetchItems(source, limit);
  console.log(`Found ${items.length} items to label\n`);

  if (items.length === 0) {
    console.log('No items to process.');
    return;
  }

  // Process in batches
  let processed = 0;
  let updated = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)...`);

    const labels = await labelItems(batch);

    for (const [itemId, itemLabels] of labels) {
      processed++;
      console.log(`\n[${processed}/${items.length}] Item: ${itemId}`);
      console.log(`  Grade: ${itemLabels.grade_level} (${itemLabels.grade_band})`);
      console.log(`  Subject: ${itemLabels.subject} > ${itemLabels.domain} > ${itemLabels.topic}`);
      console.log(`  Bloom's: ${itemLabels.blooms_level}, DOK: ${itemLabels.dok_level}`);
      console.log(`  Skills: ${itemLabels.skills.join(', ')}`);
      console.log(`  Confidence: ${(itemLabels.confidence * 100).toFixed(0)}%`);
      if (itemLabels.labeling_notes) {
        console.log(`  Notes: ${itemLabels.labeling_notes}`);
      }

      if (!dryRun) {
        const success = await updateItemMetadata(itemId, itemLabels);
        if (success) {
          updated++;
          console.log(`  -> Saved to database`);
        } else {
          console.log(`  -> Failed to save`);
        }
      }
    }

    // Rate limiting between batches
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Processed: ${processed} items`);
  if (!dryRun) {
    console.log(`Updated: ${updated} items in database`);
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
