'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  DollarSign,
  Clock,
  Users,
  BarChart3,
  CheckCircle2,
  Github,
  FlaskConical,
  Target,
  AlertTriangle,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Database,
  BookOpen
} from 'lucide-react';

// Reusable components
function Badge({ children, variant = 'brand' }: { children: React.ReactNode; variant?: 'brand' | 'success' | 'gray' }) {
  const variants = {
    brand: 'bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-200)]',
    success: 'bg-[var(--success-50)] text-[var(--success-700)] border-[var(--success-200)]',
    gray: 'bg-[var(--gray-100)] text-[var(--gray-700)] border-[var(--gray-200)]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full border ${variants[variant]}`}>
      {children}
    </span>
  );
}

function FeatureCard({ icon: Icon, title, description, color }: { icon: React.ElementType; title: string; description: string; color: string }) {
  return (
    <div className="p-6 bg-white rounded-xl border border-[var(--gray-200)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-2">{title}</h3>
      <p className="text-[var(--gray-600)] text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-25)] via-white to-[var(--warning-25)] -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[var(--brand-100)] rounded-full blur-3xl opacity-20 -z-10" />

      <div className="max-w-4xl mx-auto text-center">
        <Badge variant="brand">
          <FlaskConical size={14} />
          Research Platform
        </Badge>

        <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--gray-900)] leading-tight">
          Know if your test question is good
          <span className="block text-[var(--brand-600)]">before anyone takes it</span>
        </h1>

        <p className="mt-6 text-xl text-[var(--gray-600)] max-w-2xl mx-auto leading-relaxed">
          Simulate diverse student responses with AI personas. Get instant psychometric feedback. Fix bad questions before they reach real learners.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-600)] text-white font-semibold rounded-xl hover:bg-[var(--brand-700)] shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-all"
          >
            Try the Dashboard
            <ArrowRight size={18} />
          </Link>
          <a
            href="https://github.com/JDerekLomas/synthetic-students"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--gray-700)] font-semibold rounded-xl border border-[var(--gray-300)] hover:border-[var(--gray-400)] hover:bg-[var(--gray-50)] transition-all"
          >
            <Github size={18} />
            View on GitHub
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto">
          <div>
            <div className="text-3xl font-bold text-[var(--gray-900)]">~$0.005</div>
            <div className="text-sm text-[var(--gray-500)]">per item</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--gray-900)]">r=0.72</div>
            <div className="text-sm text-[var(--gray-500)]">prior work correlation</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--gray-900)]">15</div>
            <div className="text-sm text-[var(--gray-500)]">personas included</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="gray">
            <AlertTriangle size={14} />
            The Problem
          </Badge>
          <h2 className="mt-4 text-3xl font-bold text-[var(--gray-900)]">Item Calibration is Broken</h2>
          <p className="mt-4 text-lg text-[var(--gray-600)] max-w-2xl mx-auto">
            Traditional test development is slow, expensive, and exposes learners to unvalidated questions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Clock}
            title="Weeks of Data Collection"
            description="Need 250-750 responses per item for stable psychometric parameters. That's months before you know if a question works."
            color="bg-[var(--error-50)] text-[var(--error-600)]"
          />
          <FeatureCard
            icon={DollarSign}
            title="$50-200 Per Item"
            description="Expert review, pilot testing, iterative revision. A 100-item test can cost $10,000+ just for calibration."
            color="bg-[var(--warning-50)] text-[var(--warning-600)]"
          />
          <FeatureCard
            icon={AlertTriangle}
            title="Bad Items Reach Learners"
            description="The chicken-and-egg: you can't know if an item is bad until people take it, but you don't want to expose learners to bad items."
            color="bg-[var(--error-50)] text-[var(--error-600)]"
          />
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section className="py-20 px-6 bg-[var(--gray-50)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="success">
            <Sparkles size={14} />
            The Solution
          </Badge>
          <h2 className="mt-4 text-3xl font-bold text-[var(--gray-900)]">Simulate Before You Deploy</h2>
          <p className="mt-4 text-lg text-[var(--gray-600)] max-w-2xl mx-auto">
            Run your items through AI personas at different ability levels. Get instant feedback on difficulty, discrimination, and distractor quality.
          </p>
        </div>

        {/* Flow diagram */}
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] shadow-[var(--shadow-sm)] p-8 mb-12">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Item */}
            <div className="flex-1 w-full">
              <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-3">Your Question</div>
              <div className="p-4 bg-[var(--gray-50)] rounded-xl border border-[var(--gray-200)]">
                <p className="text-sm text-[var(--gray-700)] mb-3 font-medium">What does <code className="px-1.5 py-0.5 bg-[var(--gray-200)] rounded text-xs">typeof null</code> return?</p>
                <div className="space-y-1.5 text-sm text-[var(--gray-600)]">
                  <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[var(--gray-200)] flex items-center justify-center text-xs">A</span> "null"</div>
                  <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[var(--success-500)] text-white flex items-center justify-center text-xs">B</span> "object"</div>
                  <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[var(--gray-200)] flex items-center justify-center text-xs">C</span> "undefined"</div>
                  <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-[var(--gray-200)] flex items-center justify-center text-xs">D</span> "boolean"</div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex flex-col items-center gap-1 text-[var(--gray-400)]">
              <ArrowRight size={24} />
              <span className="text-xs">simulate</span>
            </div>

            {/* Personas */}
            <div className="flex-1 w-full">
              <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-3">Synthetic Students</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { emoji: '🎓', name: 'Expert', theta: '+2.5', answer: 'B', correct: true },
                  { emoji: '📚', name: 'Average', theta: '0.0', answer: 'A', correct: false },
                  { emoji: '🌱', name: 'Novice', theta: '-2.0', answer: 'C', correct: false },
                ].map(p => (
                  <div key={p.name} className={`p-3 rounded-xl border text-center ${p.correct ? 'bg-[var(--success-25)] border-[var(--success-200)]' : 'bg-[var(--gray-50)] border-[var(--gray-200)]'}`}>
                    <div className="text-2xl mb-1">{p.emoji}</div>
                    <div className="text-xs font-semibold text-[var(--gray-700)]">{p.name}</div>
                    <div className="text-xs text-[var(--gray-500)]">θ = {p.theta}</div>
                    <div className={`mt-2 text-sm font-bold ${p.correct ? 'text-[var(--success-600)]' : 'text-[var(--error-500)]'}`}>
                      {p.answer} {p.correct ? '✓' : '✗'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex flex-col items-center gap-1 text-[var(--gray-400)]">
              <ArrowRight size={24} />
              <span className="text-xs">analyze</span>
            </div>

            {/* Stats */}
            <div className="flex-1 w-full">
              <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-3">Instant Feedback</div>
              <div className="p-4 bg-[var(--brand-25)] rounded-xl border border-[var(--brand-100)] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--gray-600)]">Difficulty:</span>
                  <span className="font-semibold text-[var(--gray-900)]">0.33 (Hard)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--gray-600)]">Discrimination:</span>
                  <span className="font-semibold text-[var(--success-600)]">0.67 (Good)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--gray-600)]">Weak Distractor:</span>
                  <span className="font-semibold text-[var(--warning-600)]">D (0%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Zap}
            title="Instant Results"
            description="Get psychometric estimates in seconds, not months. Iterate rapidly on item quality."
            color="bg-[var(--brand-50)] text-[var(--brand-600)]"
          />
          <FeatureCard
            icon={Target}
            title="Catch Problems Early"
            description="Identify weak distractors, ambiguous stems, and difficulty mismatches before learners see them."
            color="bg-[var(--brand-50)] text-[var(--brand-600)]"
          />
          <FeatureCard
            icon={DollarSign}
            title="100x Cheaper"
            description="~$0.005 per item vs $50-200 traditional. Scale your item bank without scaling your budget."
            color="bg-[var(--brand-50)] text-[var(--brand-600)]"
          />
        </div>
      </div>
    </section>
  );
}

function ResearchSection() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="brand">
            <BookOpen size={14} />
            Research
          </Badge>
          <h2 className="mt-4 text-3xl font-bold text-[var(--gray-900)]">Open Questions</h2>
          <p className="mt-4 text-lg text-[var(--gray-600)] max-w-2xl mx-auto">
            OpenSimStudent is a research platform. We're investigating whether synthetic calibration can predict real human performance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { num: '1', title: 'Correlation with Human Data', desc: 'Do synthetic difficulty estimates correlate with actual human difficulty?', target: 'Target: r > 0.70' },
            { num: '2', title: 'Persona Design', desc: 'Which persona configurations best predict human response patterns?', target: 'Comparing multiple designs' },
            { num: '3', title: 'Sample Size', desc: 'How many synthetic responses yield stable parameters?', target: 'Target: 95% CI < 0.10' },
            { num: '4', title: 'Problem Detection', desc: 'Can synthetic calibration identify problematic items?', target: 'Target: Sensitivity > 0.80' },
          ].map(rq => (
            <div key={rq.num} className="p-5 bg-[var(--gray-50)] rounded-xl border border-[var(--gray-200)]">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-100)] flex items-center justify-center text-[var(--brand-700)] font-bold text-sm shrink-0">
                  {rq.num}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--gray-900)] mb-1">{rq.title}</h3>
                  <p className="text-sm text-[var(--gray-600)] mb-2">{rq.desc}</p>
                  <span className="text-xs text-[var(--gray-500)]">{rq.target}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-5 bg-[var(--brand-25)] rounded-xl border border-[var(--brand-100)]">
          <h3 className="font-semibold text-[var(--gray-900)] mb-3">Prior Work</h3>
          <ul className="space-y-2 text-sm text-[var(--gray-600)]">
            <li>
              <a href="https://arxiv.org/abs/2405.11591" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-600)] hover:underline font-medium">
                Generative Students (2024)
              </a>
              : Achieved r=0.72 correlation between LLM-simulated and human responses
            </li>
            <li>
              <a href="https://arxiv.org/abs/2307.08232" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-600)] hover:underline font-medium">
                Can LLMs Simulate Students? (2023)
              </a>
              : Explored challenges with ability distribution simulation
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function DatasetsSection() {
  return (
    <section className="py-20 px-6 bg-[var(--gray-50)]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="gray">
            <Database size={14} />
            Data Sources
          </Badge>
          <h2 className="mt-4 text-3xl font-bold text-[var(--gray-900)]">Validated Datasets</h2>
          <p className="mt-4 text-lg text-[var(--gray-600)] max-w-2xl mx-auto">
            Import items from open-source assessment datasets with real psychometric data.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'EdNet', items: '13K+', desc: 'TOEIC prep with 131M+ interactions', license: 'CC BY-NC 4.0' },
            { name: 'ASSISTments', items: '1M+', desc: 'Math problems with response data', license: 'Research' },
            { name: 'MCQMCP', items: '34K+', desc: 'CC-licensed items across domains', license: 'MIT' },
          ].map(ds => (
            <div key={ds.name} className="p-5 bg-white rounded-xl border border-[var(--gray-200)] shadow-[var(--shadow-xs)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--gray-900)]">{ds.name}</h3>
                <span className="text-xs px-2 py-1 bg-[var(--gray-100)] text-[var(--gray-600)] rounded">{ds.license}</span>
              </div>
              <div className="text-2xl font-bold text-[var(--brand-600)] mb-1">{ds.items}</div>
              <p className="text-sm text-[var(--gray-500)]">{ds.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 px-6 bg-[var(--brand-600)]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Try It Yourself</h2>
        <p className="text-lg text-[var(--brand-100)] mb-8">
          Load items, configure personas, run simulations, and analyze results—all in your browser.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--brand-700)] font-semibold rounded-xl hover:bg-[var(--brand-50)] shadow-[var(--shadow-lg)] transition-all"
          >
            Open Dashboard
            <ArrowRight size={18} />
          </Link>
          <a
            href="https://github.com/JDerekLomas/synthetic-students"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-500)] text-white font-semibold rounded-xl border border-[var(--brand-400)] hover:bg-[var(--brand-400)] transition-all"
          >
            <Github size={18} />
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-8 px-6 bg-[var(--gray-900)]">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-white">
          <Users size={20} />
          <span className="font-semibold">OpenSimStudent</span>
        </div>
        <div className="text-sm text-[var(--gray-400)]">
          Open source research · MIT License ·{' '}
          <a href="https://github.com/JDerekLomas/synthetic-students" className="text-[var(--brand-400)] hover:underline">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--gray-200)]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Users size={24} className="text-[var(--brand-600)]" />
            <span className="font-semibold text-[var(--gray-900)]">OpenSimStudent</span>
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/JDerekLomas/synthetic-students"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-[var(--gray-500)] hover:text-[var(--gray-700)] transition-colors"
            >
              <Github size={20} />
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand-600)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-700)] transition-colors"
            >
              Dashboard
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <ResearchSection />
      <DatasetsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
