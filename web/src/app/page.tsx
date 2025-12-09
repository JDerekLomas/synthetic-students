'use client';

import { useState, useCallback } from 'react';
import {
  Users,
  FileText,
  Play,
  BarChart3,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Github,
  ExternalLink,
  ChevronRight,
  Upload
} from 'lucide-react';

// Types
interface Persona {
  id: string;
  name: string;
  theta: number;
  temperature: number;
  description: string;
  enabled: boolean;
}

interface Item {
  id: string;
  stem: string;
  options: { A: string; B: string; C: string; D: string };
  correct: string;
  topic?: string;
}

interface Response {
  itemId: string;
  personaId: string;
  selected: string;
  isCorrect: boolean;
  reasoning?: string;
}

interface ItemStats {
  itemId: string;
  difficulty: number;
  discrimination: number;
  optionRates: { A: number; B: number; C: number; D: number };
  flags: string[];
  quality: number;
}

// Default personas
const DEFAULT_PERSONAS: Persona[] = [
  { id: 'expert', name: 'Expert', theta: 2.5, temperature: 0.1, description: 'Deep understanding, rarely wrong', enabled: true },
  { id: 'proficient', name: 'Proficient', theta: 1.0, temperature: 0.3, description: 'Good grasp, occasional slips', enabled: true },
  { id: 'developing', name: 'Developing', theta: 0.0, temperature: 0.5, description: 'Basics understood, gaps remain', enabled: true },
  { id: 'struggling', name: 'Struggling', theta: -1.0, temperature: 0.7, description: 'Major gaps, misconceptions', enabled: true },
  { id: 'novice', name: 'Novice', theta: -2.0, temperature: 0.9, description: 'Beginner, often guessing', enabled: true },
];

// Sample items for demo
const SAMPLE_ITEMS: Item[] = [
  {
    id: 'js-001',
    stem: 'What will console.log(typeof null) output in JavaScript?',
    options: { A: '"null"', B: '"object"', C: '"undefined"', D: '"boolean"' },
    correct: 'B',
    topic: 'JavaScript'
  },
  {
    id: 'js-002',
    stem: 'What is the output of console.log(1 + "2" + 3)?',
    options: { A: '6', B: '"123"', C: '"33"', D: 'NaN' },
    correct: 'B',
    topic: 'JavaScript'
  },
  {
    id: 'js-003',
    stem: 'Which method removes the last element from an array?',
    options: { A: 'shift()', B: 'unshift()', C: 'pop()', D: 'push()' },
    correct: 'C',
    topic: 'JavaScript'
  },
  {
    id: 'bio-001',
    stem: 'What is the powerhouse of the cell?',
    options: { A: 'Nucleus', B: 'Ribosome', C: 'Mitochondria', D: 'Golgi apparatus' },
    correct: 'C',
    topic: 'Biology'
  },
  {
    id: 'bio-002',
    stem: 'DNA replication is described as:',
    options: { A: 'Conservative', B: 'Semi-conservative', C: 'Dispersive', D: 'Random' },
    correct: 'B',
    topic: 'Biology'
  }
];

// Persona prompts
const PERSONA_PROMPTS: Record<string, string> = {
  expert: 'You are an expert with deep understanding of this subject. Answer correctly. Think step-by-step, then provide your answer as a single letter (A, B, C, or D).',
  proficient: 'You are a good student who usually understands the material well. You occasionally make careless mistakes. Answer based on your understanding. Provide your answer as a single letter (A, B, C, or D).',
  developing: 'You are an average student. You understand basics but struggle with harder concepts. You sometimes confuse similar ideas. Answer as best you can. Provide your answer as a single letter (A, B, C, or D).',
  struggling: 'You are a struggling student with significant gaps in your knowledge. You often misremember facts and fall for common misconceptions. Pick what seems right. Provide your answer as a single letter (A, B, C, or D).',
  novice: 'You are a complete beginner. You have minimal knowledge and often guess based on what sounds familiar. Make your best guess. Provide your answer as a single letter (A, B, C, or D).',
};

export default function Home() {
  // State
  const [step, setStep] = useState<'setup' | 'items' | 'run' | 'results'>('setup');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [personas, setPersonas] = useState<Persona[]>(DEFAULT_PERSONAS);
  const [items, setItems] = useState<Item[]>(SAMPLE_ITEMS);
  const [responses, setResponses] = useState<Response[]>([]);
  const [stats, setStats] = useState<ItemStats[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, item: '', persona: '' });
  const [error, setError] = useState<string | null>(null);

  // Validate API key
  const validateApiKey = useCallback(async () => {
    if (!apiKey.startsWith('sk-ant-')) {
      setApiKeyValid(false);
      return;
    }
    setApiKeyValid(true);
  }, [apiKey]);

  // Parse response to extract answer
  const parseResponse = (text: string): string | null => {
    const patterns = [
      /(?:answer|select|choose|pick)(?:\s+is)?[:\s]+([ABCD])\b/i,
      /\b([ABCD])\)?\s*(?:is\s+)?(?:the\s+)?(?:correct|right|best)\b/i,
      /(?:^|\n)([ABCD])(?:\)|\.|\s|$)/m,
      /\b([ABCD])\b\s*$/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].toUpperCase();
    }
    const lastResort = text.match(/\b([ABCD])\b/g);
    if (lastResort?.length) return lastResort[lastResort.length - 1].toUpperCase();
    return null;
  };

  // Run calibration
  const runCalibration = async () => {
    setIsRunning(true);
    setError(null);
    setResponses([]);
    setStats([]);

    const enabledPersonas = personas.filter(p => p.enabled);
    const totalCalls = items.length * enabledPersonas.length;
    setProgress({ current: 0, total: totalCalls, item: '', persona: '' });

    const allResponses: Response[] = [];

    try {
      for (const item of items) {
        for (const persona of enabledPersonas) {
          setProgress(p => ({ ...p, item: item.id, persona: persona.name }));

          const itemPrompt = `${item.stem}\n\nA) ${item.options.A}\nB) ${item.options.B}\nC) ${item.options.C}\nD) ${item.options.D}`;

          const response = await fetch('/api/calibrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey,
              systemPrompt: PERSONA_PROMPTS[persona.id],
              userPrompt: itemPrompt,
              temperature: persona.temperature,
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'API call failed');
          }

          const data = await response.json();
          const selected = parseResponse(data.text);

          if (selected) {
            allResponses.push({
              itemId: item.id,
              personaId: persona.id,
              selected,
              isCorrect: selected === item.correct,
              reasoning: data.text,
            });
          }

          setProgress(p => ({ ...p, current: p.current + 1 }));
          setResponses([...allResponses]);

          await new Promise(r => setTimeout(r, 100));
        }
      }

      const computedStats = computeStatistics(allResponses, items);
      setStats(computedStats);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  // Compute item statistics
  const computeStatistics = (responses: Response[], items: Item[]): ItemStats[] => {
    return items.map(item => {
      const itemResponses = responses.filter(r => r.itemId === item.id);
      const n = itemResponses.length;

      if (n === 0) {
        return {
          itemId: item.id,
          difficulty: 0,
          discrimination: 0,
          optionRates: { A: 0, B: 0, C: 0, D: 0 },
          flags: ['no_responses'],
          quality: 0,
        };
      }

      const correct = itemResponses.filter(r => r.isCorrect).length;
      const difficulty = correct / n;

      const optionRates = { A: 0, B: 0, C: 0, D: 0 };
      for (const r of itemResponses) {
        if (r.selected in optionRates) {
          optionRates[r.selected as keyof typeof optionRates]++;
        }
      }
      for (const key of Object.keys(optionRates) as (keyof typeof optionRates)[]) {
        optionRates[key] = optionRates[key] / n;
      }

      const expertCorrect = itemResponses.filter(r => r.personaId === 'expert' && r.isCorrect).length;
      const noviceCorrect = itemResponses.filter(r => r.personaId === 'novice' && r.isCorrect).length;
      const expertN = itemResponses.filter(r => r.personaId === 'expert').length;
      const noviceN = itemResponses.filter(r => r.personaId === 'novice').length;
      const discrimination = expertN && noviceN
        ? (expertCorrect / expertN) - (noviceCorrect / noviceN)
        : 0;

      const flags: string[] = [];
      if (difficulty > 0.9) flags.push('ceiling_effect');
      if (difficulty < 0.2) flags.push('floor_effect');
      if (discrimination < 0.2) flags.push('low_discrimination');
      if (discrimination < 0) flags.push('negative_discrimination');

      const nonFunctional = Object.entries(optionRates)
        .filter(([k]) => k !== item.correct)
        .filter(([, v]) => v < 0.05).length;
      if (nonFunctional >= 2) flags.push('weak_distractors');

      let quality = 1.0;
      if (difficulty < 0.2 || difficulty > 0.9) quality -= 0.2;
      if (discrimination < 0.2) quality -= 0.2;
      if (discrimination < 0) quality -= 0.3;
      quality -= nonFunctional * 0.1;
      quality = Math.max(0, Math.min(1, quality));

      return { itemId: item.id, difficulty, discrimination, optionRates, flags, quality };
    });
  };

  // Handle JSON file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const importedItems: Item[] = (Array.isArray(data) ? data : data.items || [])
          .filter((item: Record<string, unknown>) => item.stem && item.correct)
          .map((item: Record<string, unknown>) => ({
            id: item.id || `imported-${Math.random().toString(36).slice(2, 8)}`,
            stem: item.stem as string,
            options: item.options || {
              A: item.option_a || '',
              B: item.option_b || '',
              C: item.option_c || '',
              D: item.option_d || '',
            },
            correct: item.correct as string,
            topic: item.topic as string | undefined,
          }));

        if (importedItems.length > 0) {
          setItems(importedItems);
          setError(null);
        } else {
          setError('No valid items found in file');
        }
      } catch {
        setError('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">OpenSimStudent</h1>
              <p className="text-sm text-gray-500">AI-Based Item Calibration</p>
            </div>
          </div>
          <a
            href="https://github.com/JDerekLomas/synthetic-students"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Github className="w-5 h-5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            {[
              { id: 'setup', label: 'Setup', icon: Key },
              { id: 'items', label: 'Items', icon: FileText },
              { id: 'run', label: 'Run', icon: Play },
              { id: 'results', label: 'Results', icon: BarChart3 },
            ].map((s, i) => (
              <div key={s.id} className="flex items-center">
                {i > 0 && <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />}
                <button
                  onClick={() => {
                    if (s.id === 'setup' || (s.id === 'items' && apiKeyValid) ||
                        (s.id === 'run' && items.length > 0) ||
                        (s.id === 'results' && stats.length > 0)) {
                      setStep(s.id as typeof step);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    step === s.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step: Setup */}
        {step === 'setup' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Setup</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Enter your Anthropic API key and configure personas for calibration.
              </p>
            </div>

            {/* API Key */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Anthropic API Key
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your API key is sent directly to Anthropic and never stored on our servers.
                Get one at{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  console.anthropic.com
                </a>
              </p>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setApiKeyValid(null);
                  }}
                  placeholder="sk-ant-..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={validateApiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Validate
                </button>
              </div>
              {apiKeyValid !== null && (
                <div className={`mt-3 flex items-center gap-2 text-sm ${apiKeyValid ? 'text-green-600' : 'text-red-600'}`}>
                  {apiKeyValid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {apiKeyValid ? 'API key format looks valid' : 'Invalid API key format (should start with sk-ant-)'}
                </div>
              )}
            </div>

            {/* Personas */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Synthetic Student Personas
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select which personas to use. Each persona simulates a different ability level.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {personas.map((persona) => (
                  <label
                    key={persona.id}
                    className={`persona-card p-4 rounded-lg border cursor-pointer ${
                      persona.enabled
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={persona.enabled}
                        onChange={(e) => {
                          setPersonas(personas.map(p =>
                            p.id === persona.id ? { ...p, enabled: e.target.checked } : p
                          ));
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{persona.name}</div>
                        <div className="text-xs text-gray-500">
                          Ability: {persona.theta > 0 ? '+' : ''}{persona.theta} | Temp: {persona.temperature}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {persona.description}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep('items')}
                disabled={!apiKeyValid}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Continue to Items
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Items */}
        {step === 'items' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Assessment Items</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Use sample items or upload your own JSON file.
              </p>
            </div>

            {/* Upload */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Items
              </h3>
              <div className="flex flex-wrap gap-4">
                <label className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload JSON
                  </span>
                </label>
                <button
                  onClick={() => setItems(SAMPLE_ITEMS)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Use Sample Items
                </button>
                <a
                  href="https://github.com/JDerekLomas/mcqmcp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  Browse MCQMCP
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Items ({items.length})
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-mono text-gray-500">{item.id}</span>
                      {item.topic && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {item.topic}
                        </span>
                      )}
                    </div>
                    <p className="font-medium mb-2">{item.stem}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                        <div
                          key={opt}
                          className={`p-2 rounded ${
                            opt === item.correct
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                        >
                          <span className="font-medium">{opt})</span> {item.options[opt]}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('setup')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('run')}
                disabled={items.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Continue to Run
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Run */}
        {step === 'run' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Run Calibration</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Review your configuration and start the calibration process.
              </p>
            </div>

            {/* Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-semibold mb-4">Configuration Summary</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{items.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Items</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{personas.filter(p => p.enabled).length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Personas</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {items.length * personas.filter(p => p.enabled).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">API Calls</div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Estimated Cost</span>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  ~${((items.length * personas.filter(p => p.enabled).length * 0.0008)).toFixed(4)} using Claude 3 Haiku
                </p>
              </div>
            </div>

            {/* Progress */}
            {isRunning && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Calibration...
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>{progress.current} / {progress.total} responses</span>
                    <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 progress-bar"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Current: {progress.item} / {progress.persona}
                  </div>
                </div>
              </div>
            )}

            {/* Live Responses */}
            {responses.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-semibold mb-4">Responses ({responses.length})</h3>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {responses.slice(-10).map((r, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-gray-500 w-24 truncate">{r.itemId}</span>
                      <span className="w-20">{personas.find(p => p.id === r.personaId)?.name}</span>
                      <span className={`px-2 py-0.5 rounded ${
                        r.isCorrect
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {r.selected} {r.isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep('items')}
                disabled={isRunning}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={runCalibration}
                disabled={isRunning}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Calibration
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Results */}
        {step === 'results' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Calibration Results</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Item statistics computed from {responses.length} synthetic responses.
              </p>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-2xl font-bold">
                  {(stats.reduce((a, s) => a + s.difficulty, 0) / stats.length).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Mean Difficulty</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-2xl font-bold">
                  {(stats.reduce((a, s) => a + s.discrimination, 0) / stats.length).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Mean Discrimination</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-2xl font-bold">
                  {stats.filter(s => s.flags.length > 0).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Flagged Items</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-2xl font-bold">
                  {(stats.reduce((a, s) => a + s.quality, 0) / stats.length).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Mean Quality</div>
              </div>
            </div>

            {/* Item Results Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium">Item</th>
                      <th className="text-center px-4 py-3 text-sm font-medium">Difficulty</th>
                      <th className="text-center px-4 py-3 text-sm font-medium">Discrimination</th>
                      <th className="text-center px-4 py-3 text-sm font-medium">A</th>
                      <th className="text-center px-4 py-3 text-sm font-medium">B</th>
                      <th className="text-center px-4 py-3 text-sm font-medium">C</th>
                      <th className="text-center px-4 py-3 text-sm font-medium">D</th>
                      <th className="text-center px-4 py-3 text-sm font-medium">Quality</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stats.map((stat) => {
                      const item = items.find(i => i.id === stat.itemId);
                      return (
                        <tr key={stat.itemId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3">
                            <div className="font-mono text-sm">{stat.itemId}</div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {item?.stem.slice(0, 50)}...
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-sm ${
                              stat.difficulty > 0.9 ? 'bg-yellow-100 text-yellow-700' :
                              stat.difficulty < 0.2 ? 'bg-red-100 text-red-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {stat.difficulty.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-sm ${
                              stat.discrimination < 0 ? 'bg-red-100 text-red-700' :
                              stat.discrimination < 0.2 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {stat.discrimination.toFixed(2)}
                            </span>
                          </td>
                          {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                            <td key={opt} className="px-4 py-3 text-center text-sm">
                              <span className={item?.correct === opt ? 'font-bold text-green-600' : ''}>
                                {(stat.optionRates[opt] * 100).toFixed(0)}%
                              </span>
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center">
                            <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mx-auto">
                              <div
                                className={`h-full ${
                                  stat.quality > 0.7 ? 'bg-green-500' :
                                  stat.quality > 0.4 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${stat.quality * 100}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {stat.flags.map((flag) => (
                                <span key={flag} className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep('run')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Run Again
              </button>
              <button
                onClick={() => {
                  const csv = [
                    ['item_id', 'difficulty', 'discrimination', 'rate_A', 'rate_B', 'rate_C', 'rate_D', 'quality', 'flags'].join(','),
                    ...stats.map(s => [
                      s.itemId,
                      s.difficulty.toFixed(3),
                      s.discrimination.toFixed(3),
                      s.optionRates.A.toFixed(3),
                      s.optionRates.B.toFixed(3),
                      s.optionRates.C.toFixed(3),
                      s.optionRates.D.toFixed(3),
                      s.quality.toFixed(2),
                      `"${s.flags.join(';')}"`
                    ].join(','))
                  ].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'calibration-results.csv';
                  a.click();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>
            OpenSimStudent is open source research software.{' '}
            <a href="https://github.com/JDerekLomas/synthetic-students" className="text-blue-600 hover:underline">
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
