import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Using service role key for server-side API routes (read-only operations)
const supabase = createClient(
  'https://cxzwclvkkjvkromubzmp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4endjbHZra2p2a3JvbXViem1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE1MjEzOCwiZXhwIjoyMDc5NzI4MTM4fQ.eQNjAwY_6jIft6olbpnlysuSukZWmXlTQmKDCxHonJQ'
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const random = searchParams.get('random') === 'true';

    let query = supabase
      .from('items')
      .select('id, source, topic, difficulty, stem, code, option_a, option_b, option_c, option_d, correct, explanation, tags, metadata');

    if (source) {
      query = query.eq('source', source);
    }
    if (topic) {
      query = query.eq('topic', topic);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    // For random, we'll order by id and use the offset as a pseudo-random seed
    if (random) {
      query = query.order('id', { ascending: Math.random() > 0.5 });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to expected format
    const items = data?.map(item => {
      const metadata = item.metadata as Record<string, unknown> | null;
      return {
        id: item.id,
        source: item.source,
        topic: item.topic,
        difficulty: item.difficulty,
        gradeLevel: metadata?.grade_level || null,
        stem: item.stem,
        code: item.code,
        options: [
          { id: 'A', text: item.option_a },
          { id: 'B', text: item.option_b },
          { id: 'C', text: item.option_c || '' },
          { id: 'D', text: item.option_d || '' },
        ].filter(o => o.text),
        correct: item.correct,
        explanation: item.explanation,
        tags: item.tags,
      };
    }) || [];

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    console.error('Items API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
