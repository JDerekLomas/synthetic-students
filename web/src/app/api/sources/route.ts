import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Using service role key for server-side API routes (read-only operations)
const supabase = createClient(
  'https://cxzwclvkkjvkromubzmp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4endjbHZra2p2a3JvbXViem1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE1MjEzOCwiZXhwIjoyMDc5NzI4MTM4fQ.eQNjAwY_6jIft6olbpnlysuSukZWmXlTQmKDCxHonJQ'
);

export async function GET() {
  try {
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .order('item_count', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get distinct topics, difficulties, tags, and grade_levels per source
    const { data: metaData } = await supabase
      .from('items')
      .select('source, topic, difficulty, tags, metadata')
      .limit(10000);

    const metaBySource: Record<string, {
      topics: Set<string>;
      difficulties: Set<string>;
      tags: Set<string>;
      gradeLevels: Set<string>;
    }> = {};

    metaData?.forEach(item => {
      if (!metaBySource[item.source]) {
        metaBySource[item.source] = {
          topics: new Set(),
          difficulties: new Set(),
          tags: new Set(),
          gradeLevels: new Set(),
        };
      }
      if (item.topic) {
        metaBySource[item.source].topics.add(item.topic);
      }
      if (item.difficulty) {
        metaBySource[item.source].difficulties.add(item.difficulty);
      }
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => metaBySource[item.source].tags.add(tag));
      }
      // Extract grade_level from metadata
      const metadata = item.metadata as Record<string, unknown> | null;
      if (metadata?.grade_level && typeof metadata.grade_level === 'string') {
        metaBySource[item.source].gradeLevels.add(metadata.grade_level);
      }
    });

    const enrichedSources = sources?.map(source => ({
      ...source,
      topics: Array.from(metaBySource[source.id]?.topics || []).sort(),
      difficulties: Array.from(metaBySource[source.id]?.difficulties || []).sort(),
      tags: Array.from(metaBySource[source.id]?.tags || []).sort(),
      gradeLevels: Array.from(metaBySource[source.id]?.gradeLevels || []).sort(),
    })) || [];

    return NextResponse.json({ sources: enrichedSources });
  } catch (error) {
    console.error('Sources API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
