# OpenSimStudent - Web Application

A Next.js web application for the OpenSimStudent project, featuring an MCQ item bank with AI-powered metadata labeling.

## Features

- **Item Bank Browser**: Explore 7,750+ MCQ items from multiple sources (GSM8K, ARC, MMLU)
- **AI-Powered Labeling**: Automatic metadata generation for educational items using Claude AI
- **Rich Metadata**: Grade levels, Bloom's taxonomy, DOK levels, skills, and more
- **API Endpoints**: RESTful API for accessing items and sources
- **Supabase Backend**: PostgreSQL database with real-time capabilities

## Item Bank Statistics

| Source | Items | Grade Level |
|--------|-------|-------------|
| GSM8K | 7,473 | Grades 3-8 (Elementary/Middle) |
| ARC | ~2,300 | Grades 3-9 (Elementary/Middle) |
| MMLU | Varies | College level |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Scripts

### AI-Powered Item Labeling

Label items with educational metadata (grade level, Bloom's taxonomy, DOK, skills):

```bash
ANTHROPIC_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_KEY=xxx \
npx tsx scripts/label-items.ts --source gsm8k --limit 100 --batch 10
```

Options:
- `--source <id>`: Filter by source (gsm8k, arc, mmlu)
- `--limit <n>`: Max items to process (default: 10)
- `--batch <n>`: Items per API call (default: 5)
- `--dry-run`: Preview without saving to database

### Analyze Labels

View statistics on labeled items:

```bash
SUPABASE_URL=xxx SUPABASE_KEY=xxx npx tsx scripts/analyze-labels.ts
```

## API Endpoints

### GET /api/items

Fetch items from the database.

Query parameters:
- `source`: Filter by source
- `topic`: Filter by topic
- `difficulty`: Filter by difficulty
- `limit`: Max items (default: 100)
- `offset`: Pagination offset
- `random`: Randomize results (true/false)

### GET /api/sources

Get all available sources with metadata.

## Label Schema

Each labeled item includes:

```typescript
{
  grade_level: string;      // "grade-3", "grade-6", "college-intro"
  grade_band: string;       // "elementary", "middle", "high", "college"
  subject: string;          // "mathematics", "science", etc.
  domain: string;           // "algebra", "life-science", etc.
  topic: string;            // Specific topic
  blooms_level: string;     // "remember", "understand", "apply", "analyze", etc.
  dok_level: number;        // 1-4 (Depth of Knowledge)
  skills: string[];         // Required skills
  knowledge_components: string[];
  confidence: number;       // 0-1 model confidence
  labeling_notes?: string;
}
```

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API (via z.ai)
- **Language**: TypeScript

## Deployment

Deployed on Vercel at: https://opensimstudent.vercel.app

## License

MIT
