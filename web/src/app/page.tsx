'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  ChevronRight,
  ChevronDown,
  Upload,
  Shuffle,
  FolderOpen,
  Database,
  Search,
  X,
  Settings,
  ListChecks,
  Eye,
  Download,
  Clock,
  Thermometer,
  Cpu
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

interface ItemOption {
  id: string;
  text: string;
}

interface Item {
  id: string;
  stem: string;
  code?: string;
  options: ItemOption[] | { A: string; B: string; C: string; D: string };
  correct: string;
  topic?: string;
  difficulty?: string;
  gradeLevel?: string | null;
}

interface Response {
  itemId: string;
  personaId: string;
  selected: string;
  isCorrect: boolean;
  reasoning?: string;
  correctAnswer?: string;
  timestamp?: number;
}

// Experiment configuration
interface ExperimentConfig {
  id: string;
  name: string;
  author: string;
  description: string;
  model: string;
  globalTemperature: number | null;  // null = use persona temperatures
  maxTokens: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Model options
const MODEL_OPTIONS = [
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', cost: 0.00025, description: 'Fast & cheap (~$0.001/item)' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', cost: 0.003, description: 'Smart & balanced (~$0.005/item)' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', cost: 0.003, description: 'Latest Sonnet (~$0.005/item)' },
];

// Results tab type
type ResultsTab = 'attempts' | 'item-stats' | 'persona-stats';

interface ItemStats {
  itemId: string;
  difficulty: number;
  discrimination: number;
  optionRates: { A: number; B: number; C: number; D: number };
  flags: string[];
  quality: number;
}

interface SkillNode {
  id: string;
  name: string;
  children?: SkillNode[];
}

interface ItemBank {
  id: string;
  name: string;
  description: string;
  items: Item[];
  skillTree?: SkillNode;
}

// Default personas
const DEFAULT_PERSONAS: Persona[] = [
  { id: 'expert', name: 'Expert', theta: 2.5, temperature: 0.1, description: 'Deep understanding, rarely wrong', enabled: true },
  { id: 'proficient', name: 'Proficient', theta: 1.0, temperature: 0.3, description: 'Good grasp, occasional slips', enabled: true },
  { id: 'developing', name: 'Developing', theta: 0.0, temperature: 0.5, description: 'Basics understood, gaps remain', enabled: true },
  { id: 'struggling', name: 'Struggling', theta: -1.0, temperature: 0.7, description: 'Major gaps, misconceptions', enabled: true },
  { id: 'novice', name: 'Novice', theta: -2.0, temperature: 0.9, description: 'Beginner, often guessing', enabled: true },
];

// Embedded MCQMCP Item Bank (from item-bank.json)
const MCQMCP_ITEMS: Item[] = [
  // JavaScript - this
  { id: "js-this-001", topic: "js-this", difficulty: "easy", stem: "What will be logged to the console?", code: "const obj = {\n  name: 'Alice',\n  greet() {\n    console.log(this.name);\n  }\n};\n\nobj.greet();", options: [{ id: "A", text: "Alice" }, { id: "B", text: "undefined" }, { id: "C", text: "An empty string" }, { id: "D", text: "ReferenceError: name is not defined" }], correct: "A" },
  { id: "js-this-002", topic: "js-this", difficulty: "medium", stem: "What will be logged to the console?", code: "const obj = {\n  name: 'Alice',\n  greet() {\n    console.log(this.name);\n  }\n};\n\nconst greet = obj.greet;\ngreet();", options: [{ id: "A", text: "Alice" }, { id: "B", text: "undefined" }, { id: "C", text: "TypeError" }, { id: "D", text: "An empty string" }], correct: "B" },
  { id: "js-this-003", topic: "js-this", difficulty: "hard", stem: "What will be logged to the console?", code: "const obj = {\n  name: 'Alice',\n  greet: () => {\n    console.log(this.name);\n  }\n};\n\nobj.greet();", options: [{ id: "A", text: "Alice" }, { id: "B", text: "undefined" }, { id: "C", text: "TypeError: this is undefined" }, { id: "D", text: "The global window's name property" }], correct: "B" },
  // JavaScript - closures
  { id: "js-closures-001", topic: "js-closures", difficulty: "easy", stem: "What will be logged to the console?", code: "function outer() {\n  const x = 10;\n  function inner() {\n    console.log(x);\n  }\n  return inner;\n}\n\nconst fn = outer();\nfn();", options: [{ id: "A", text: "10" }, { id: "B", text: "undefined" }, { id: "C", text: "ReferenceError" }, { id: "D", text: "null" }], correct: "A" },
  { id: "js-closures-002", topic: "js-closures", difficulty: "medium", stem: "What will be logged to the console?", code: "for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}", options: [{ id: "A", text: "0, 1, 2" }, { id: "B", text: "3, 3, 3" }, { id: "C", text: "undefined x3" }, { id: "D", text: "0, 0, 0" }], correct: "B" },
  { id: "js-closures-003", topic: "js-closures", difficulty: "hard", stem: "What will be logged to the console?", code: "function createCounter() {\n  let count = 0;\n  return {\n    increment: () => ++count,\n    getCount: () => count\n  };\n}\n\nconst c1 = createCounter();\nconst c2 = createCounter();\n\nc1.increment(); c1.increment();\nc2.increment();\n\nconsole.log(c1.getCount(), c2.getCount());", options: [{ id: "A", text: "2 1" }, { id: "B", text: "3 3" }, { id: "C", text: "2 2" }, { id: "D", text: "1 1" }], correct: "A" },
  // JavaScript - async
  { id: "js-async-001", topic: "js-async", difficulty: "easy", stem: "What will be logged, and in what order?", code: "console.log('A');\n\nPromise.resolve().then(() => console.log('B'));\n\nconsole.log('C');", options: [{ id: "A", text: "A, B, C" }, { id: "B", text: "A, C, B" }, { id: "C", text: "B, A, C" }, { id: "D", text: "A, C (B never)" }], correct: "B" },
  { id: "js-async-002", topic: "js-async", difficulty: "medium", stem: "What will be logged to the console?", code: "async function foo() {\n  console.log('1');\n  await Promise.resolve();\n  console.log('2');\n}\n\nconsole.log('3');\nfoo();\nconsole.log('4');", options: [{ id: "A", text: "3, 1, 4, 2" }, { id: "B", text: "3, 1, 2, 4" }, { id: "C", text: "1, 2, 3, 4" }, { id: "D", text: "3, 4, 1, 2" }], correct: "A" },
  { id: "js-async-003", topic: "js-async", difficulty: "hard", stem: "What will be logged?", code: "Promise.resolve()\n  .then(() => {\n    console.log('1');\n    return Promise.resolve();\n  })\n  .then(() => console.log('2'));\n\nPromise.resolve()\n  .then(() => console.log('3'))\n  .then(() => console.log('4'));", options: [{ id: "A", text: "1, 2, 3, 4" }, { id: "B", text: "1, 3, 2, 4" }, { id: "C", text: "1, 3, 4, 2" }, { id: "D", text: "3, 1, 4, 2" }], correct: "C" },
  // JavaScript - timers
  { id: "js-timers-001", topic: "js-timers", difficulty: "easy", stem: "What order will be logged?", code: "console.log('start');\n\nsetTimeout(() => console.log('timeout'), 0);\n\nconsole.log('end');", options: [{ id: "A", text: "start, timeout, end" }, { id: "B", text: "start, end, timeout" }, { id: "C", text: "timeout, start, end" }, { id: "D", text: "start, end (timeout never)" }], correct: "B" },
  { id: "js-timers-002", topic: "js-timers", difficulty: "medium", stem: "What order will be logged?", code: "console.log('1');\n\nsetTimeout(() => console.log('2'), 0);\n\nPromise.resolve().then(() => console.log('3'));\n\nconsole.log('4');", options: [{ id: "A", text: "1, 4, 2, 3" }, { id: "B", text: "1, 4, 3, 2" }, { id: "C", text: "1, 2, 3, 4" }, { id: "D", text: "1, 3, 4, 2" }], correct: "B" },
  // React - hooks
  { id: "react-hooks-001", topic: "react-hooks", difficulty: "easy", stem: "What will display after clicking once?", code: "function Counter() {\n  const [count, setCount] = useState(0);\n  \n  const handleClick = () => {\n    setCount(count + 1);\n    setCount(count + 1);\n  };\n  \n  return <button onClick={handleClick}>{count}</button>;\n}", options: [{ id: "A", text: "0" }, { id: "B", text: "1" }, { id: "C", text: "2" }, { id: "D", text: "Error" }], correct: "B" },
  { id: "react-hooks-002", topic: "react-hooks", difficulty: "medium", stem: "What happens when this mounts?", code: "function DataFetcher() {\n  const [data, setData] = useState(null);\n  \n  useEffect(() => {\n    fetch('/api/data')\n      .then(res => res.json())\n      .then(setData);\n  });\n  \n  return <div>{data?.name}</div>;\n}", options: [{ id: "A", text: "Fetches once on mount" }, { id: "B", text: "Infinite loop" }, { id: "C", text: "Error: requires deps array" }, { id: "D", text: "Nothing happens" }], correct: "B" },
  // React - state
  { id: "react-state-001", topic: "react-state", difficulty: "easy", stem: "What's wrong with this update?", code: "function TodoList() {\n  const [todos, setTodos] = useState([...]);\n  \n  const addTodo = (text) => {\n    todos.push({ id: Date.now(), text });\n    setTodos(todos);\n  };\n}", options: [{ id: "A", text: "Should use useReducer" }, { id: "B", text: "Mutating state directly" }, { id: "C", text: "Date.now() invalid ID" }, { id: "D", text: "Missing key prop" }], correct: "B" },
  { id: "react-state-002", topic: "react-state", difficulty: "medium", stem: "What value shows in alert?", code: "function Form() {\n  const [name, setName] = useState('Alice');\n  \n  const handleClick = () => {\n    setName('Bob');\n    alert(name);\n  };\n  \n  return <button onClick={handleClick}>Show</button>;\n}", options: [{ id: "A", text: "Bob" }, { id: "B", text: "Alice" }, { id: "C", text: "undefined" }, { id: "D", text: "Error" }], correct: "B" },
  // Sample general items
  { id: "sample-bio-001", topic: "biology", difficulty: "easy", stem: "What is the powerhouse of the cell?", options: [{ id: "A", text: "Nucleus" }, { id: "B", text: "Ribosome" }, { id: "C", text: "Mitochondria" }, { id: "D", text: "Golgi apparatus" }], correct: "C" },
];

// Skill tree for MCQMCP
const MCQMCP_SKILL_TREE: SkillNode = {
  id: "frontend",
  name: "Frontend Engineering",
  children: [
    {
      id: "javascript",
      name: "JavaScript",
      children: [
        { id: "js-this", name: "this Binding" },
        { id: "js-closures", name: "Closures" },
        { id: "js-async", name: "Async Programming" },
        { id: "js-timers", name: "Timers & Event Loop" },
      ]
    },
    {
      id: "react",
      name: "React",
      children: [
        { id: "react-hooks", name: "Hooks" },
        { id: "react-state", name: "State Management" },
      ]
    },
    {
      id: "general",
      name: "General Knowledge",
      children: [
        { id: "biology", name: "Biology" }
      ]
    }
  ]
};

// Embedded item banks (fallback)
const EMBEDDED_ITEM_BANKS: ItemBank[] = [
  {
    id: "mcqmcp-embedded",
    name: "MCQMCP Frontend (Embedded)",
    description: "JavaScript, React, and web development items from the MCQMCP project",
    items: MCQMCP_ITEMS,
    skillTree: MCQMCP_SKILL_TREE
  }
];

// Supabase source interface
interface SupabaseSource {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  item_count: number;
  topics: string[];
  difficulties: string[];
  tags: string[];
  gradeLevels: string[];
}

// Persona prompts
const PERSONA_PROMPTS: Record<string, string> = {
  expert: 'You are an expert with deep understanding of this subject. Answer correctly. Think step-by-step, then provide your answer as a single letter (A, B, C, or D).',
  proficient: 'You are a good student who usually understands the material well. You occasionally make careless mistakes. Answer based on your understanding. Provide your answer as a single letter (A, B, C, or D).',
  developing: 'You are an average student. You understand basics but struggle with harder concepts. You sometimes confuse similar ideas. Answer as best you can. Provide your answer as a single letter (A, B, C, or D).',
  struggling: 'You are a struggling student with significant gaps in your knowledge. You often misremember facts and fall for common misconceptions. Pick what seems right. Provide your answer as a single letter (A, B, C, or D).',
  novice: 'You are a complete beginner. You have minimal knowledge and often guess based on what sounds familiar. Make your best guess. Provide your answer as a single letter (A, B, C, or D).',
};

// Helper to normalize options
function normalizeOptions(options: ItemOption[] | { A: string; B: string; C: string; D: string }): { A: string; B: string; C: string; D: string } {
  if (Array.isArray(options)) {
    return {
      A: options.find(o => o.id === 'A')?.text || '',
      B: options.find(o => o.id === 'B')?.text || '',
      C: options.find(o => o.id === 'C')?.text || '',
      D: options.find(o => o.id === 'D')?.text || '',
    };
  }
  return options;
}

export default function Home() {
  // State
  const [step, setStep] = useState<'items' | 'setup' | 'run' | 'results'>('items');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [personas, setPersonas] = useState<Persona[]>(DEFAULT_PERSONAS);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [stats, setStats] = useState<ItemStats[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, item: '', persona: '' });
  const [error, setError] = useState<string | null>(null);

  // Experiment config state
  const [experimentConfig, setExperimentConfig] = useState<ExperimentConfig>({
    id: '',
    name: '',
    author: '',
    description: '',
    model: 'claude-3-haiku-20240307',
    globalTemperature: null,
    maxTokens: 1024,
    createdAt: new Date(),
  });
  const [useGlobalTemperature, setUseGlobalTemperature] = useState(false);
  const [resultsTab, setResultsTab] = useState<ResultsTab>('attempts');

  // Supabase item banks state
  const [supabaseSources, setSupabaseSources] = useState<SupabaseSource[]>([]);
  const [supabaseItems, setSupabaseItems] = useState<Map<string, Item[]>>(new Map());
  const [loadingSources, setLoadingSources] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  // Item browser state
  const [selectedBank, setSelectedBank] = useState<ItemBank | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['frontend', 'javascript', 'react']));
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedGradeLevels, setSelectedGradeLevels] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch sources from Supabase on mount
  useEffect(() => {
    async function fetchSources() {
      try {
        const res = await fetch('/api/sources');
        if (res.ok) {
          const data = await res.json();
          setSupabaseSources(data.sources || []);
        }
      } catch (err) {
        console.error('Failed to fetch sources:', err);
      } finally {
        setLoadingSources(false);
      }
    }
    fetchSources();
  }, []);

  // Build hierarchical skill tree from flat topics
  const buildSkillTree = (topics: string[], sourceId: string, sourceName: string): SkillNode | undefined => {
    if (topics.length === 0) return undefined;

    // Group topics by prefix (e.g., "math-algebra" → "math")
    const groups: Record<string, string[]> = {};
    topics.forEach(topic => {
      const parts = topic.split('-');
      const prefix = parts[0];
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(topic);
    });

    // Create hierarchical structure
    const children: SkillNode[] = Object.entries(groups).map(([prefix, groupTopics]) => {
      const formatName = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      if (groupTopics.length === 1 && groupTopics[0] === prefix) {
        // Single topic with no subtopics
        return { id: groupTopics[0], name: formatName(groupTopics[0]) };
      }

      // Multiple subtopics under a category
      const subChildren: SkillNode[] = groupTopics.map(topic => {
        const parts = topic.split('-');
        const subName = parts.length > 1 ? parts.slice(1).join(' ') : topic;
        return { id: topic, name: formatName(subName) };
      });

      return {
        id: `${sourceId}-${prefix}`,
        name: formatName(prefix),
        children: subChildren,
      };
    });

    return {
      id: sourceId,
      name: sourceName,
      children,
    };
  };

  // Convert Supabase sources to ItemBank format
  const supabaseItemBanks: ItemBank[] = useMemo(() => {
    return supabaseSources.map(source => {
      const items = supabaseItems.get(source.id) || [];
      const skillTree = buildSkillTree(source.topics, source.id, source.name);

      return {
        id: source.id,
        name: source.name,
        description: source.description || `${source.item_count} items`,
        items,
        skillTree,
      };
    });
  }, [supabaseSources, supabaseItems]);

  // Combine embedded and Supabase item banks
  const allItemBanks = useMemo(() => {
    return [...supabaseItemBanks, ...EMBEDDED_ITEM_BANKS];
  }, [supabaseItemBanks]);

  // Fetch items when a Supabase bank is selected
  const loadSupabaseItems = useCallback(async (sourceId: string): Promise<Item[]> => {
    if (supabaseItems.has(sourceId)) {
      return supabaseItems.get(sourceId)!;
    }

    setLoadingItems(true);
    try {
      const res = await fetch(`/api/items?source=${sourceId}&limit=1000`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        setSupabaseItems(prev => new Map(prev).set(sourceId, items));
        return items;
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoadingItems(false);
    }
    return [];
  }, [supabaseItems]);

  // Get items for selected topics, difficulties, and grade levels
  const availableItems = useMemo(() => {
    if (!selectedBank) return [];
    let items = selectedBank.items;

    // Filter by topics
    if (selectedTopics.size > 0) {
      items = items.filter(item => item.topic && selectedTopics.has(item.topic));
    }

    // Filter by difficulties
    if (selectedDifficulties.size > 0) {
      items = items.filter(item => item.difficulty && selectedDifficulties.has(item.difficulty));
    }

    // Filter by grade levels
    if (selectedGradeLevels.size > 0) {
      items = items.filter(item => item.gradeLevel && selectedGradeLevels.has(item.gradeLevel));
    }

    return items;
  }, [selectedBank, selectedTopics, selectedDifficulties, selectedGradeLevels]);

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return availableItems;
    const q = searchQuery.toLowerCase();
    return availableItems.filter(item =>
      item.stem.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.topic?.toLowerCase().includes(q)
    );
  }, [availableItems, searchQuery]);

  // Toggle topic selection
  const toggleTopic = (topicId: string) => {
    const newTopics = new Set(selectedTopics);
    if (newTopics.has(topicId)) {
      newTopics.delete(topicId);
    } else {
      newTopics.add(topicId);
    }
    setSelectedTopics(newTopics);
  };

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Add item to selection
  const addItem = (item: Item) => {
    if (!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  // Remove item from selection
  const removeItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== itemId));
  };

  // Add all filtered items
  const addAllItems = () => {
    const newItems = [...selectedItems];
    filteredItems.forEach(item => {
      if (!newItems.find(i => i.id === item.id)) {
        newItems.push(item);
      }
    });
    setSelectedItems(newItems);
  };

  // Pick random items
  const pickRandom = (count: number) => {
    const available = filteredItems.filter(item => !selectedItems.find(i => i.id === item.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const toAdd = shuffled.slice(0, count);
    setSelectedItems([...selectedItems, ...toAdd]);
  };

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

    // Generate experiment ID and set start time
    const experimentId = `exp-${Date.now().toString(36)}`;
    const startTime = new Date();
    setExperimentConfig(prev => ({
      ...prev,
      id: experimentId,
      startedAt: startTime,
    }));

    const enabledPersonas = personas.filter(p => p.enabled);
    const totalCalls = selectedItems.length * enabledPersonas.length;
    setProgress({ current: 0, total: totalCalls, item: '', persona: '' });

    const allResponses: Response[] = [];

    try {
      for (const item of selectedItems) {
        for (const persona of enabledPersonas) {
          setProgress(p => ({ ...p, item: item.id, persona: persona.name }));

          const opts = normalizeOptions(item.options);
          let itemPrompt = item.stem;
          if (item.code) {
            itemPrompt += `\n\n\`\`\`\n${item.code}\n\`\`\``;
          }
          itemPrompt += `\n\nA) ${opts.A}\nB) ${opts.B}\nC) ${opts.C}\nD) ${opts.D}`;

          // Use global temperature if set, otherwise persona temperature
          const temperature = useGlobalTemperature && experimentConfig.globalTemperature !== null
            ? experimentConfig.globalTemperature
            : persona.temperature;

          const response = await fetch('/api/calibrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey,
              systemPrompt: PERSONA_PROMPTS[persona.id],
              userPrompt: itemPrompt,
              temperature,
              model: experimentConfig.model,
              maxTokens: experimentConfig.maxTokens,
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
              correctAnswer: item.correct,
              reasoning: data.text,
              timestamp: Date.now(),
            });
          }

          setProgress(p => ({ ...p, current: p.current + 1 }));
          setResponses([...allResponses]);

          await new Promise(r => setTimeout(r, 100));
        }
      }

      const computedStats = computeStatistics(allResponses, selectedItems);
      setStats(computedStats);
      setExperimentConfig(prev => ({ ...prev, completedAt: new Date() }));
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
            id: item.id as string || `imported-${Math.random().toString(36).slice(2, 8)}`,
            stem: item.stem as string,
            options: item.options || {
              A: item.option_a || '',
              B: item.option_b || '',
              C: item.option_c || '',
              D: item.option_d || '',
            },
            correct: item.correct as string,
            topic: item.topic as string | undefined,
            difficulty: item.difficulty as string | undefined,
          }));

        if (importedItems.length > 0) {
          setSelectedItems([...selectedItems, ...importedItems]);
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

  // Get all topic IDs from a node (recursively)
  const getTopicIds = (node: SkillNode): string[] => {
    if (!node.children || node.children.length === 0) {
      return [node.id];
    }
    return node.children.flatMap(getTopicIds);
  };

  // Count items for a node (recursively)
  const countNodeItems = (node: SkillNode): number => {
    const topicIds = getTopicIds(node);
    return selectedBank?.items.filter(i => i.topic && topicIds.includes(i.topic)).length || 0;
  };

  // Render skill tree node
  const renderSkillNode = (node: SkillNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedTopics.has(node.id);
    const itemCount = countNodeItems(node);

    // Check if any children are selected
    const childTopics = getTopicIds(node);
    const hasSelectedChildren = childTopics.some(t => selectedTopics.has(t));

    return (
      <div key={node.id} style={{ marginLeft: depth * 16 }}>
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isSelected ? 'bg-blue-50 dark:bg-blue-900/30' :
            hasSelectedChildren ? 'bg-blue-50/50 dark:bg-blue-900/15' : ''
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            } else {
              toggleTopic(node.id);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <div className="w-4" />
          )}
          {!hasChildren && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleTopic(node.id)}
              onClick={e => e.stopPropagation()}
              className="rounded"
            />
          )}
          <span className={hasChildren ? 'font-medium' : ''}>{node.name}</span>
          {itemCount > 0 && (
            <span className="ml-auto text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {itemCount.toLocaleString()}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderSkillNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
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
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            {[
              { id: 'items', label: 'Items', icon: FileText },
              { id: 'setup', label: 'Setup', icon: Key },
              { id: 'run', label: 'Run', icon: Play },
              { id: 'results', label: 'Results', icon: BarChart3 },
            ].map((s, i) => (
              <div key={s.id} className="flex items-center">
                {i > 0 && <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />}
                <button
                  onClick={() => {
                    if (s.id === 'items' ||
                        (s.id === 'setup' && selectedItems.length > 0) ||
                        (s.id === 'run' && apiKeyValid) ||
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
                  {s.id === 'items' && selectedItems.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                      {selectedItems.length}
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step: Items */}
        {step === 'items' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Select Assessment Items</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Browse item banks, filter by topic, and select items for calibration.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Item Banks & Skill Tree */}
              <div className="space-y-4">
                {/* Item Banks */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Item Banks
                  </h3>
                  <div className="space-y-2">
                    {loadingSources ? (
                      <div className="text-center py-4 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading item banks...
                      </div>
                    ) : (
                      allItemBanks.map(bank => {
                        const supabaseSource = supabaseSources.find(s => s.id === bank.id);
                        const itemCount = supabaseSource?.item_count || bank.items.length;
                        const isSupabase = !!supabaseSource;
                        const isLoaded = !isSupabase || supabaseItems.has(bank.id);

                        return (
                          <button
                            key={bank.id}
                            onClick={async () => {
                              let items = bank.items;
                              if (isSupabase) {
                                items = await loadSupabaseItems(bank.id);
                              }
                              // Set bank with loaded items and skill tree
                              const skillTree = buildSkillTree(supabaseSource?.topics || [], bank.id, bank.name);
                              setSelectedBank({ ...bank, items, skillTree: skillTree || bank.skillTree });
                              setSelectedTopics(new Set());
                              setSelectedDifficulties(new Set());
                              setSelectedTags(new Set());
                              setSelectedGradeLevels(new Set());
                              // Auto-expand first two levels
                              const newExpanded = new Set<string>([bank.id]);
                              if (skillTree?.children) {
                                skillTree.children.forEach(child => newExpanded.add(child.id));
                              } else if (bank.skillTree?.children) {
                                bank.skillTree.children.forEach(child => newExpanded.add(child.id));
                              }
                              setExpandedNodes(newExpanded);
                            }}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              selectedBank?.id === bank.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{bank.name}</span>
                              {isSupabase && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                  Supabase
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {itemCount.toLocaleString()} items
                              {isSupabase && !isLoaded && ' (click to load)'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{bank.description}</div>
                          </button>
                        );
                      })
                    )}
                    <label className="block w-full text-center p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-gray-400 transition-colors">
                      <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <Upload className="w-4 h-4" />
                        Upload JSON
                      </div>
                    </label>
                  </div>
                </div>

                {/* Skill Tree */}
                {selectedBank?.skillTree && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FolderOpen className="w-5 h-5" />
                      Topics
                    </h3>
                    <div className="max-h-64 overflow-y-auto">
                      {renderSkillNode(selectedBank.skillTree)}
                    </div>
                    {selectedTopics.size > 0 && (
                      <button
                        onClick={() => setSelectedTopics(new Set())}
                        className="mt-3 text-sm text-blue-600 hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                )}

                {/* Difficulty Filter */}
                {selectedBank && (() => {
                  const supabaseSource = supabaseSources.find(s => s.id === selectedBank.id);
                  const difficulties = supabaseSource?.difficulties || [];
                  if (difficulties.length === 0) return null;

                  const difficultyLabels: Record<string, { label: string; color: string }> = {
                    easy: { label: 'Easy', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                    medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
                    hard: { label: 'Hard', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                  };

                  return (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Difficulty
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {difficulties.map(diff => {
                          const isSelected = selectedDifficulties.has(diff);
                          const config = difficultyLabels[diff] || { label: diff, color: 'bg-gray-100 text-gray-700' };
                          const count = selectedBank.items.filter(i => i.difficulty === diff).length;
                          return (
                            <button
                              key={diff}
                              onClick={() => {
                                const newSet = new Set(selectedDifficulties);
                                if (isSelected) newSet.delete(diff);
                                else newSet.add(diff);
                                setSelectedDifficulties(newSet);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                isSelected
                                  ? config.color + ' ring-2 ring-offset-1 ring-blue-500'
                                  : config.color + ' opacity-60 hover:opacity-100'
                              }`}
                            >
                              {config.label} ({count.toLocaleString()})
                            </button>
                          );
                        })}
                      </div>
                      {selectedDifficulties.size > 0 && (
                        <button
                          onClick={() => setSelectedDifficulties(new Set())}
                          className="mt-3 text-sm text-blue-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Tags */}
                {selectedBank && (() => {
                  const supabaseSource = supabaseSources.find(s => s.id === selectedBank.id);
                  const tags = supabaseSource?.tags || [];
                  if (tags.length === 0) return null;

                  return (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                      <h3 className="font-semibold mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Grade Level Filter */}
                {selectedBank && (() => {
                  const supabaseSource = supabaseSources.find(s => s.id === selectedBank.id);
                  const gradeLevels = supabaseSource?.gradeLevels || [];
                  if (gradeLevels.length === 0) return null;

                  const gradeLevelLabels: Record<string, { label: string; color: string }> = {
                    'grades-3-5': { label: 'Grades 3-5', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                    'grades-3-8': { label: 'Grades 3-8', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
                    'grades-6-9': { label: 'Grades 6-9', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
                    'college': { label: 'College', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
                  };

                  return (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                      <h3 className="font-semibold mb-3">Grade Level</h3>
                      <div className="flex flex-wrap gap-2">
                        {gradeLevels.map(level => {
                          const isSelected = selectedGradeLevels.has(level);
                          const config = gradeLevelLabels[level] || { label: level, color: 'bg-gray-100 text-gray-700' };
                          return (
                            <button
                              key={level}
                              onClick={() => {
                                const newSet = new Set(selectedGradeLevels);
                                if (isSelected) newSet.delete(level);
                                else newSet.add(level);
                                setSelectedGradeLevels(newSet);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                isSelected
                                  ? config.color + ' ring-2 ring-offset-1 ring-blue-500'
                                  : config.color + ' opacity-60 hover:opacity-100'
                              }`}
                            >
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                      {selectedGradeLevels.size > 0 && (
                        <button
                          onClick={() => setSelectedGradeLevels(new Set())}
                          className="mt-3 text-sm text-blue-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Middle: Available Items */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Available ({filteredItems.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={addAllItems}
                      disabled={filteredItems.length === 0}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 disabled:opacity-50"
                    >
                      Add All
                    </button>
                    <button
                      onClick={() => pickRandom(5)}
                      disabled={filteredItems.length === 0}
                      className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" />
                      Random 5
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                {/* Compact Filter Bar */}
                {selectedBank && (() => {
                  const supabaseSource = supabaseSources.find(s => s.id === selectedBank.id);
                  const difficulties = supabaseSource?.difficulties || [];
                  const gradeLevels = supabaseSource?.gradeLevels || [];
                  const topics = supabaseSource?.topics || [];

                  if (difficulties.length === 0 && gradeLevels.length === 0 && topics.length === 0) return null;

                  const gradeLevelLabels: Record<string, string> = {
                    'grades-3-5': 'Gr 3-5',
                    'grades-3-8': 'Gr 3-8',
                    'grades-6-9': 'Gr 6-9',
                    'college': 'College',
                  };

                  return (
                    <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex flex-wrap gap-2 items-center text-xs">
                        {/* Grade Level Pills */}
                        {gradeLevels.length > 0 && (
                          <>
                            <span className="text-gray-500 font-medium">Grade:</span>
                            {gradeLevels.map(level => {
                              const isSelected = selectedGradeLevels.has(level);
                              return (
                                <button
                                  key={level}
                                  onClick={() => {
                                    const newSet = new Set(selectedGradeLevels);
                                    if (isSelected) newSet.delete(level);
                                    else newSet.add(level);
                                    setSelectedGradeLevels(newSet);
                                  }}
                                  className={`px-2 py-0.5 rounded ${
                                    isSelected
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                                  }`}
                                >
                                  {gradeLevelLabels[level] || level}
                                </button>
                              );
                            })}
                          </>
                        )}

                        {/* Difficulty Pills */}
                        {difficulties.length > 0 && (
                          <>
                            <span className="text-gray-500 font-medium ml-2">Difficulty:</span>
                            {difficulties.map(diff => {
                              const isSelected = selectedDifficulties.has(diff);
                              return (
                                <button
                                  key={diff}
                                  onClick={() => {
                                    const newSet = new Set(selectedDifficulties);
                                    if (isSelected) newSet.delete(diff);
                                    else newSet.add(diff);
                                    setSelectedDifficulties(newSet);
                                  }}
                                  className={`px-2 py-0.5 rounded capitalize ${
                                    isSelected
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                                  }`}
                                >
                                  {diff}
                                </button>
                              );
                            })}
                          </>
                        )}

                        {/* Topic Pills */}
                        {topics.length > 0 && topics.length <= 5 && (
                          <>
                            <span className="text-gray-500 font-medium ml-2">Topic:</span>
                            {topics.map(topic => {
                              const isSelected = selectedTopics.has(topic);
                              return (
                                <button
                                  key={topic}
                                  onClick={() => {
                                    const newSet = new Set(selectedTopics);
                                    if (isSelected) newSet.delete(topic);
                                    else newSet.add(topic);
                                    setSelectedTopics(newSet);
                                  }}
                                  className={`px-2 py-0.5 rounded ${
                                    isSelected
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                                  }`}
                                >
                                  {topic.replace(/-/g, ' ')}
                                </button>
                              );
                            })}
                          </>
                        )}

                        {/* Clear All */}
                        {(selectedGradeLevels.size > 0 || selectedDifficulties.size > 0 || selectedTopics.size > 0) && (
                          <button
                            onClick={() => {
                              setSelectedGradeLevels(new Set());
                              setSelectedDifficulties(new Set());
                              setSelectedTopics(new Set());
                            }}
                            className="ml-auto text-blue-600 hover:underline"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Items List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loadingItems ? (
                    <div className="text-center py-8 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading items...
                    </div>
                  ) : !selectedBank ? (
                    <div className="text-center py-8 text-gray-500">
                      Select an item bank to browse items
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No items match your filters
                    </div>
                  ) : (
                    filteredItems.map(item => {
                      const isAdded = selectedItems.some(i => i.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            isAdded
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-gray-500">{item.id}</span>
                                {item.difficulty && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    item.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                    item.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {item.difficulty}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm line-clamp-2">{item.stem}</p>
                            </div>
                            <button
                              onClick={() => isAdded ? removeItem(item.id) : addItem(item)}
                              className={`shrink-0 p-1.5 rounded ${
                                isAdded
                                  ? 'text-green-600 hover:bg-green-100'
                                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                              }`}
                            >
                              {isAdded ? <CheckCircle className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right: Selected Items */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Selected ({selectedItems.length})
                  </h3>
                  {selectedItems.length > 0 && (
                    <button
                      onClick={() => setSelectedItems([])}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No items selected yet.<br />
                      Browse and add items from the left.
                    </div>
                  ) : (
                    selectedItems.map(item => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-500">{item.id}</span>
                              {item.topic && (
                                <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                  {item.topic}
                                </span>
                              )}
                            </div>
                            <p className="text-sm line-clamp-2">{item.stem}</p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="shrink-0 p-1.5 rounded text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {selectedItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setStep('setup')}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      Continue to Setup
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step: Setup */}
        {step === 'setup' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Create Experiment</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Configure your experiment settings, API key, and personas.
              </p>
            </div>

            {/* Experiment Details */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Experiment Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Experiment Name</label>
                  <input
                    type="text"
                    value={experimentConfig.name}
                    onChange={(e) => setExperimentConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Math Calibration Run 1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Author</label>
                  <input
                    type="text"
                    value={experimentConfig.author}
                    onChange={(e) => setExperimentConfig(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Your name"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <textarea
                    value={experimentConfig.description}
                    onChange={(e) => setExperimentConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the purpose of this experiment..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2 text-sm text-gray-500">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Created: {new Date().toLocaleString()}
                </div>
              </div>
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

            {/* Model Configuration */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Model Configuration
              </h3>
              <div className="space-y-6">
                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    Model
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {MODEL_OPTIONS.map(model => (
                      <button
                        key={model.id}
                        onClick={() => setExperimentConfig(prev => ({ ...prev, model: model.id }))}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          experimentConfig.model === model.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{model.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={useGlobalTemperature}
                      onChange={(e) => {
                        setUseGlobalTemperature(e.target.checked);
                        if (e.target.checked && experimentConfig.globalTemperature === null) {
                          setExperimentConfig(prev => ({ ...prev, globalTemperature: 0.5 }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Thermometer className="w-4 h-4" />
                      Override Persona Temperatures
                    </span>
                  </label>
                  {useGlobalTemperature && (
                    <div className="ml-6">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={experimentConfig.globalTemperature ?? 0.5}
                        onChange={(e) => setExperimentConfig(prev => ({ ...prev, globalTemperature: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0.0 (Deterministic)</span>
                        <span className="font-medium">{experimentConfig.globalTemperature ?? 0.5}</span>
                        <span>1.0 (Creative)</span>
                      </div>
                    </div>
                  )}
                  {!useGlobalTemperature && (
                    <p className="text-xs text-gray-500 ml-6">
                      Each persona will use its own temperature setting (Expert: 0.1, ..., Novice: 0.9)
                    </p>
                  )}
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-sm font-medium mb-2">Max Tokens</label>
                  <select
                    value={experimentConfig.maxTokens}
                    onChange={(e) => setExperimentConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={256}>256 (Quick answers)</option>
                    <option value={512}>512 (Brief reasoning)</option>
                    <option value={1024}>1024 (Standard)</option>
                    <option value={2048}>2048 (Detailed reasoning)</option>
                  </select>
                </div>
              </div>
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

            <div className="flex justify-between">
              <button
                onClick={() => setStep('items')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('run')}
                disabled={!apiKeyValid}
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
              {experimentConfig.name && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="font-medium">{experimentConfig.name}</div>
                  {experimentConfig.author && <div className="text-sm text-gray-600">By {experimentConfig.author}</div>}
                  {experimentConfig.description && <div className="text-sm text-gray-500 mt-1">{experimentConfig.description}</div>}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{selectedItems.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Items</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{personas.filter(p => p.enabled).length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Personas</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {selectedItems.length * personas.filter(p => p.enabled).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">API Calls</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{MODEL_OPTIONS.find(m => m.id === experimentConfig.model)?.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Model</div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Estimated Cost</span>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  ~${((selectedItems.length * personas.filter(p => p.enabled).length * (MODEL_OPTIONS.find(m => m.id === experimentConfig.model)?.cost || 0.0008))).toFixed(4)} using {MODEL_OPTIONS.find(m => m.id === experimentConfig.model)?.name}
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
                      className="h-full bg-blue-600 progress-bar transition-all duration-300"
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Live Responses ({responses.length})
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {responses.filter(r => r.isCorrect).length} correct
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-red-500" />
                      {responses.filter(r => !r.isCorrect).length} incorrect
                    </span>
                  </div>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {responses.slice().reverse().slice(0, 20).map((r, i) => {
                    const item = selectedItems.find(it => it.id === r.itemId);
                    const opts = item ? normalizeOptions(item.options) : null;
                    return (
                      <div key={i} className={`p-3 rounded-lg border ${r.isCorrect ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : 'border-red-200 bg-red-50/50 dark:bg-red-900/10'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-gray-500">{r.itemId}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{personas.find(p => p.id === r.personaId)?.name}</span>
                            </div>
                            <p className="text-sm line-clamp-1">{item?.stem}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <div className={`text-sm font-medium px-2 py-1 rounded ${
                              r.isCorrect
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              Selected: {r.selected}
                              {!r.isCorrect && r.correctAnswer && (
                                <span className="ml-1 text-gray-500">(Correct: {r.correctAnswer})</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!r.isCorrect && opts && (
                          <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-1">
                            <div className={r.selected === 'A' ? 'text-red-600 font-medium' : r.correctAnswer === 'A' ? 'text-green-600 font-medium' : ''}>A: {opts.A.slice(0, 40)}{opts.A.length > 40 ? '...' : ''}</div>
                            <div className={r.selected === 'B' ? 'text-red-600 font-medium' : r.correctAnswer === 'B' ? 'text-green-600 font-medium' : ''}>B: {opts.B.slice(0, 40)}{opts.B.length > 40 ? '...' : ''}</div>
                            <div className={r.selected === 'C' ? 'text-red-600 font-medium' : r.correctAnswer === 'C' ? 'text-green-600 font-medium' : ''}>C: {opts.C.slice(0, 40)}{opts.C.length > 40 ? '...' : ''}</div>
                            <div className={r.selected === 'D' ? 'text-red-600 font-medium' : r.correctAnswer === 'D' ? 'text-green-600 font-medium' : ''}>D: {opts.D.slice(0, 40)}{opts.D.length > 40 ? '...' : ''}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep('setup')}
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

            {/* Experiment Details */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Experiment Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-sm text-gray-500">ID</div>
                  <div className="font-mono text-sm">{experimentConfig.id || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="font-medium">{experimentConfig.name || 'Unnamed Experiment'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Author</div>
                  <div>{experimentConfig.author || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Model</div>
                  <div>{MODEL_OPTIONS.find(m => m.id === experimentConfig.model)?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Started</div>
                  <div className="text-sm">{experimentConfig.startedAt?.toLocaleString() || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Completed</div>
                  <div className="text-sm">{experimentConfig.completedAt?.toLocaleString() || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Temperature</div>
                  <div>{useGlobalTemperature ? `Global: ${experimentConfig.globalTemperature}` : 'Per Persona'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Responses</div>
                  <div>{responses.length}</div>
                </div>
              </div>
              {experimentConfig.description && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500">Description</div>
                  <div className="text-sm mt-1">{experimentConfig.description}</div>
                </div>
              )}
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

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex">
                  {[
                    { id: 'attempts' as ResultsTab, label: 'All Attempts', icon: ListChecks },
                    { id: 'item-stats' as ResultsTab, label: 'Item Statistics', icon: BarChart3 },
                    { id: 'persona-stats' as ResultsTab, label: 'Persona Statistics', icon: Users },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setResultsTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        resultsTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* All Attempts Tab */}
              {resultsTab === 'attempts' && (
                <div className="p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {responses.map((r, i) => {
                      const item = selectedItems.find(it => it.id === r.itemId);
                      return (
                        <div key={i} className={`p-3 rounded-lg border ${r.isCorrect ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : 'border-red-200 bg-red-50/50 dark:bg-red-900/10'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-gray-500">{r.itemId}</span>
                                <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{personas.find(p => p.id === r.personaId)?.name}</span>
                              </div>
                              <p className="text-sm">{item?.stem}</p>
                            </div>
                            <div className="shrink-0">
                              <div className={`text-sm font-medium px-2 py-1 rounded ${
                                r.isCorrect
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {r.selected} {r.isCorrect ? '✓' : `✗ (${r.correctAnswer})`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Item Stats Tab */}
              {resultsTab === 'item-stats' && (
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
                        const item = selectedItems.find(i => i.id === stat.itemId);
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
              )}

              {/* Persona Stats Tab */}
              {resultsTab === 'persona-stats' && (
                <div className="p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {personas.filter(p => p.enabled).map(persona => {
                      const personaResponses = responses.filter(r => r.personaId === persona.id);
                      const correct = personaResponses.filter(r => r.isCorrect).length;
                      const total = personaResponses.length;
                      const accuracy = total > 0 ? (correct / total) : 0;

                      return (
                        <div key={persona.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{persona.name}</div>
                            <div className={`text-lg font-bold ${
                              accuracy > 0.7 ? 'text-green-600' :
                              accuracy > 0.4 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {(accuracy * 100).toFixed(0)}%
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 mb-2">
                            {correct}/{total} correct | θ={persona.theta} | temp={persona.temperature}
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                accuracy > 0.7 ? 'bg-green-500' :
                                accuracy > 0.4 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${accuracy * 100}%` }}
                            />
                          </div>
                          <div className="mt-2 text-xs text-gray-400">{persona.description}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Export */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep('run')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Run Again
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Export responses CSV
                    const csv = [
                      ['item_id', 'persona_id', 'selected', 'correct_answer', 'is_correct', 'timestamp'].join(','),
                      ...responses.map(r => [
                        r.itemId,
                        r.personaId,
                        r.selected,
                        r.correctAnswer || '',
                        r.isCorrect ? '1' : '0',
                        r.timestamp || ''
                      ].join(','))
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${experimentConfig.id || 'experiment'}-responses.csv`;
                    a.click();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Responses
                </button>
                <button
                  onClick={() => {
                    // Export item stats CSV with metadata
                    const metadata = [
                      `# Experiment: ${experimentConfig.name || 'Unnamed'}`,
                      `# Author: ${experimentConfig.author || 'N/A'}`,
                      `# ID: ${experimentConfig.id || 'N/A'}`,
                      `# Model: ${experimentConfig.model}`,
                      `# Started: ${experimentConfig.startedAt?.toISOString() || 'N/A'}`,
                      `# Completed: ${experimentConfig.completedAt?.toISOString() || 'N/A'}`,
                      `# Total Responses: ${responses.length}`,
                      `# Temperature: ${useGlobalTemperature ? experimentConfig.globalTemperature : 'Per Persona'}`,
                      ''
                    ].join('\n');
                    const csv = metadata + [
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
                    a.download = `${experimentConfig.id || 'experiment'}-item-stats.csv`;
                    a.click();
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Item Stats
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
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
