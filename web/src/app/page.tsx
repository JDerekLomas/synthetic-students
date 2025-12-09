'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  DollarSign,
  Clock,
  Users,
  BarChart3,
  CheckCircle,
  Github,
  FlaskConical,
  Target,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-amber-50 -z-10" />

      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6">
          <FlaskConical size={16} />
          Research Platform
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Know if your test question is good
          <br />
          <span className="text-violet-600">before anyone takes it</span>
        </h1>

        {/* Subhead */}
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Simulate diverse student responses with AI personas. Get instant psychometric feedback.
          Fix bad questions before they reach real learners.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 hover:shadow-xl"
          >
            Try the Dashboard
            <ArrowRight size={18} />
          </Link>
          <a
            href="https://github.com/JDerekLomas/synthetic-students"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
          >
            <Github size={18} />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">The Item Calibration Problem</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Traditional test development is slow, expensive, and exposes learners to unvalidated questions.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-red-50 border border-red-100">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
              <Clock className="text-red-600" size={24} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Weeks of Data Collection</h3>
            <p className="text-gray-600 text-sm">
              Need 250-750 responses per item for stable psychometric parameters. That's months before you know if a question works.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
              <DollarSign className="text-amber-600" size={24} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">$50-200 Per Item</h3>
            <p className="text-gray-600 text-sm">
              Expert review, pilot testing, iterative revision. A 100-item test can cost $10,000+ just for calibration.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-orange-50 border border-orange-100">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Bad Items Reach Learners</h3>
            <p className="text-gray-600 text-sm">
              The chicken-and-egg: you can't know if an item is bad until people take it, but you don't want to expose learners to bad items.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-4">
            <Sparkles size={14} />
            The Solution
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simulate Before You Deploy</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Run your items through AI personas at different ability levels. Get instant feedback on difficulty, discrimination, and distractor quality.
          </p>
        </div>

        {/* Visual diagram */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-12 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Item */}
            <div className="flex-1 w-full">
              <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Your Question</div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 font-mono text-sm">
                <p className="text-gray-700 mb-2">What does <code className="bg-gray-200 px-1 rounded">typeof null</code> return?</p>
                <div className="space-y-1 text-gray-600">
                  <div>A) "null"</div>
                  <div>B) "object"</div>
                  <div>C) "undefined"</div>
                  <div>D) "boolean"</div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex flex-col items-center gap-2">
              <ArrowRight size={24} className="text-violet-400" />
              <span className="text-xs text-gray-500">simulate</span>
            </div>

            {/* Personas */}
            <div className="flex-1 w-full">
              <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Synthetic Students</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-center">
                  <div className="text-2xl mb-1">🎓</div>
                  <div className="text-xs font-medium text-green-800">Expert</div>
                  <div className="text-xs text-green-600">θ = +2.5</div>
                  <div className="mt-2 text-green-700 font-bold">B ✓</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <div className="text-2xl mb-1">📚</div>
                  <div className="text-xs font-medium text-amber-800">Average</div>
                  <div className="text-xs text-amber-600">θ = 0.0</div>
                  <div className="mt-2 text-red-600 font-bold">A ✗</div>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center">
                  <div className="text-2xl mb-1">🌱</div>
                  <div className="text-xs font-medium text-red-800">Novice</div>
                  <div className="text-xs text-red-600">θ = -2.0</div>
                  <div className="mt-2 text-red-600 font-bold">C ✗</div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex flex-col items-center gap-2">
              <ArrowRight size={24} className="text-violet-400" />
              <span className="text-xs text-gray-500">analyze</span>
            </div>

            {/* Stats */}
            <div className="flex-1 w-full">
              <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Instant Feedback</div>
              <div className="p-4 bg-violet-50 rounded-xl border border-violet-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Difficulty:</span>
                  <span className="font-medium text-gray-900">0.33 (Hard)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discrimination:</span>
                  <span className="font-medium text-green-600">0.67 (Good)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weak Distractor:</span>
                  <span className="font-medium text-amber-600">D (0%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <Zap className="text-violet-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Instant Results</h3>
              <p className="text-sm text-gray-600">Get psychometric estimates in seconds, not months.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <Target className="text-violet-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Catch Problems Early</h3>
              <p className="text-sm text-gray-600">Fix bad items before learners ever see them.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <DollarSign className="text-violet-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">~$0.005/item</h3>
              <p className="text-sm text-gray-600">100x cheaper than traditional calibration.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResearchSection() {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Research Questions</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            OpenSimStudent is a research platform. We're investigating whether synthetic calibration can predict real human performance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">1</div>
              <h3 className="font-semibold text-gray-900">Correlation with Human Data</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Do synthetic difficulty estimates correlate with actual human difficulty? Prior work achieved r=0.72.
            </p>
            <div className="text-xs text-gray-500">Target: Pearson r &gt; 0.70</div>
          </div>

          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">2</div>
              <h3 className="font-semibold text-gray-900">Persona Design</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Which persona configurations best predict human response patterns? Ability-based vs misconception-based?
            </p>
            <div className="text-xs text-gray-500">Comparing multiple designs</div>
          </div>

          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">3</div>
              <h3 className="font-semibold text-gray-900">Sample Size</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              How many synthetic responses yield stable parameters? Can 15 personas match 250 humans?
            </p>
            <div className="text-xs text-gray-500">Target: 95% CI width &lt; 0.10</div>
          </div>

          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">4</div>
              <h3 className="font-semibold text-gray-900">Problem Detection</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Can synthetic calibration identify problematic items (bad distractors, ambiguous stems)?
            </p>
            <div className="text-xs text-gray-500">Target: Sensitivity &gt; 0.80</div>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-2xl bg-violet-50 border border-violet-200">
          <h3 className="font-semibold text-gray-900 mb-2">Prior Work</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <a href="https://arxiv.org/abs/2405.11591" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">Generative Students (2024)</a>: Achieved r=0.72 correlation between LLM-simulated and human responses</li>
            <li>• <a href="https://arxiv.org/abs/2307.08232" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">Can LLMs Simulate Students? (2023)</a>: Explored challenges with ability distribution simulation</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 px-6 bg-gradient-to-b from-violet-600 to-violet-700">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Try It Yourself</h2>
        <p className="text-lg text-violet-100 mb-8">
          Load items from our database, configure personas, run simulations, and analyze results—all in your browser.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-violet-700 font-semibold rounded-xl hover:bg-violet-50 transition-all shadow-lg"
          >
            Open Dashboard
            <ArrowRight size={18} />
          </Link>
          <a
            href="https://github.com/JDerekLomas/synthetic-students"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-violet-500 text-white font-semibold rounded-xl hover:bg-violet-400 transition-all border border-violet-400"
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
    <footer className="py-8 px-6 bg-gray-900 text-gray-400">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <span className="font-semibold text-white">OpenSimStudent</span>
        </div>
        <div className="text-sm">
          Open source research platform · MIT License · <a href="https://github.com/JDerekLomas/synthetic-students" className="text-violet-400 hover:underline">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Users size={24} className="text-violet-600" />
            <span className="font-semibold text-gray-900">OpenSimStudent</span>
          </Link>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/JDerekLomas/synthetic-students"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Github size={20} />
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
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
      <CTASection />
      <Footer />
    </main>
  );
}
