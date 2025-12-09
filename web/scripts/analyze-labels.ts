/**
 * Analyze labeled items in the database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyze() {
  const { data: items, error } = await supabase
    .from('items')
    .select('id, metadata')
    .eq('source', 'gsm8k')
    .not('metadata->labels', 'is', null)
    .limit(100);

  if (error) {
    console.error('Error fetching items:', error.message);
    return;
  }

  if (!items || items.length === 0) {
    console.log('No labeled items found');
    return;
  }

  const gradeBands: Record<string, number> = {};
  const bloomsLevels: Record<string, number> = {};
  const dokLevels: Record<string, number> = {};
  const subjects: Record<string, number> = {};
  const confidences: number[] = [];

  items.forEach(item => {
    const labels = (item.metadata as any)?.labels;
    if (!labels) return;

    // Count grade bands
    const band = labels.grade_band || 'unknown';
    gradeBands[band] = (gradeBands[band] || 0) + 1;

    // Count Bloom's levels
    const blooms = labels.blooms_level || 'unknown';
    bloomsLevels[blooms] = (bloomsLevels[blooms] || 0) + 1;

    // Count DOK levels
    const dok = String(labels.dok_level || 'unknown');
    dokLevels[dok] = (dokLevels[dok] || 0) + 1;

    // Count subjects
    const subject = labels.subject || 'unknown';
    subjects[subject] = (subjects[subject] || 0) + 1;

    // Track confidence
    if (labels.confidence) {
      confidences.push(labels.confidence);
    }
  });

  console.log('=== LABELING RESULTS SUMMARY ===');
  console.log(`Total labeled items: ${items.length}`);
  console.log('');
  console.log('Grade Bands:');
  Object.entries(gradeBands).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
  console.log('');
  console.log("Bloom's Taxonomy Levels:");
  Object.entries(bloomsLevels).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
  console.log('');
  console.log('Depth of Knowledge (DOK):');
  Object.entries(dokLevels).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  DOK ${k}: ${v}`));
  console.log('');
  console.log('Subjects:');
  Object.entries(subjects).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
  console.log('');
  if (confidences.length > 0) {
    const avgConf = confidences.reduce((a,b) => a+b, 0) / confidences.length;
    console.log(`Average Confidence: ${(avgConf * 100).toFixed(1)}%`);
  }
}

analyze().catch(console.error);
