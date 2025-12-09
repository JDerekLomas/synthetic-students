/**
 * Add grade_level to items metadata in Supabase
 *
 * Grade level mappings:
 * - GSM8K: grades 3-8 (Grade School Math 8K)
 * - ARC-Easy: grades 3-5
 * - ARC-Challenge: grades 6-9
 * - MMLU: college level (most subjects)
 *
 * Usage: SUPABASE_URL=xxx SUPABASE_KEY=xxx npx tsx scripts/add-grade-levels.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface GradeMapping {
  source: string;
  idPattern?: string;  // For ARC difficulty distinction
  grade_level: string;
  description: string;
}

const gradeMappings: GradeMapping[] = [
  {
    source: 'gsm8k',
    grade_level: 'grades-3-8',
    description: 'GSM8K (Grade School Math)'
  },
  {
    source: 'arc',
    idPattern: 'arc-easy%',
    grade_level: 'grades-3-5',
    description: 'ARC Easy'
  },
  {
    source: 'arc',
    idPattern: 'arc-hard%',
    grade_level: 'grades-6-9',
    description: 'ARC Challenge'
  },
  {
    source: 'mmlu',
    grade_level: 'college',
    description: 'MMLU (College Level)'
  },
];

async function fetchAllItems(source: string, idPattern?: string): Promise<{ id: string; metadata: Record<string, unknown> }[]> {
  const allItems: { id: string; metadata: Record<string, unknown> }[] = [];
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from('items').select('id, metadata');
    query = query.eq('source', source);
    if (idPattern) {
      query = query.like('id', idPattern);
    }
    query = query.range(offset, offset + pageSize - 1);

    const { data, error } = await query;

    if (error) {
      console.error(`  Error fetching items: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allItems.push(...data);
    offset += data.length;

    if (data.length < pageSize) {
      hasMore = false;
    }

    await new Promise(r => setTimeout(r, 50));
  }

  return allItems;
}

async function main() {
  console.log('Adding grade_level to items metadata in Supabase');
  console.log('================================================\n');

  for (const mapping of gradeMappings) {
    console.log(`Processing: ${mapping.description}`);
    console.log(`  Setting grade_level = "${mapping.grade_level}"`);

    const items = await fetchAllItems(mapping.source, mapping.idPattern);
    console.log(`  Found ${items.length} items`);

    if (items.length === 0) continue;

    // Update in batches
    const batchSize = 100;
    let updated = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      for (const item of batch) {
        const newMetadata = {
          ...(item.metadata || {}),
          grade_level: mapping.grade_level
        };

        const { error: updateError } = await supabase
          .from('items')
          .update({ metadata: newMetadata })
          .eq('id', item.id);

        if (updateError) {
          console.error(`  Error updating ${item.id}: ${updateError.message}`);
        } else {
          updated++;
        }
      }

      console.log(`  Progress: ${Math.min(i + batchSize, items.length)}/${items.length}`);
      await new Promise(r => setTimeout(r, 50));
    }

    console.log(`  ✓ Done: ${updated} items updated\n`);
  }

  // Verify results
  console.log('Verification (sample):');
  const { data: sample } = await supabase
    .from('items')
    .select('id, source, metadata')
    .limit(10);

  const gradeCounts: Record<string, number> = {};
  sample?.forEach(item => {
    const gl = (item.metadata as Record<string, unknown>)?.grade_level as string || 'no-grade';
    gradeCounts[gl] = (gradeCounts[gl] || 0) + 1;
  });

  Object.entries(gradeCounts).forEach(([gl, count]) => {
    console.log(`  ${gl}: ${count} items`);
  });

  console.log('\n✅ Grade level migration complete!');
}

main().catch(console.error);
