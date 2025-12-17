import React from 'react';
import { PlayIcon, MicrophoneIcon, SparklesIcon, ArrowRightIcon, VideoCameraIcon, GlobeAltIcon } from "@heroicons/react/24/outline";

interface Props {
  onNavigate: (page: string) => void;
}

export default function LandingPage({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-dark-bg text-slate-200">
      {/* Header handled by App.tsx, but kept visually here for Hero section flow */}

      {/* Hero */}
      <section className="pt-20 pb-24 px-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brand-500/20 rounded-full blur-[100px] -z-10"></div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold leading-tight mb-6 text-white">
              Dub Any Video.
              <br />
              <span className="text-brand-500">Any Language. Any Voice.</span>
            </h1>
            <p className="text-slate-400 text-lg mb-8 max-w-xl">
              Generate subtitles, translate speech, clone voices, preserve emotion
              and perfectly sync lips — all with one AI-powered platform.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => onNavigate('dashboard')}
                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
              >
                Try it Free <ArrowRightIcon className="w-4 h-4" />
              </button>
              <button className="border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition">
                <PlayIcon className="w-4 h-4" /> Watch Demo
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-brand-500/10 rounded-3xl blur-3xl" />
            <div className="relative rounded-3xl shadow-2xl bg-dark-surface border border-dark-border p-2">
              <div className="aspect-video bg-dark-bg rounded-xl flex items-center justify-center text-slate-600 border border-dark-border">
                <div className="text-center">
                   <VideoCameraIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                   Video Preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-dark-surface/50 border-y border-dark-border px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-white">All-in-One AI Dubbing</h2>
          <p className="text-center text-slate-400 mb-16">
            Modular, credit-based and built for creators & businesses
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<GlobeAltIcon className="w-6 h-6" />}
              title="Subtitles & Translation"
              text="Accurate speech-to-text and multilingual translation with perfect timing."
            />
            <FeatureCard
              icon={<MicrophoneIcon className="w-6 h-6" />}
              title="Voice Cloning"
              text="Keep the original voice or replace it with any custom voice you upload."
            />
            <FeatureCard
              icon={<SparklesIcon className="w-6 h-6" />}
              title="Emotion & Lip Sync"
              text="Preserve acting emotions and sync lips naturally to the new language."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 bg-dark-bg">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <Step number="1" title="Upload Video" text="Any format, any length." />
            <Step number="2" title="Choose Language" text="Translate to any language." />
            <Step number="3" title="Select Voice" text="Original, cloned or custom." />
            <Step number="4" title="Download" text="Dubbed video or subtitles." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-600 text-white px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Start Dubbing Smarter Today</h2>
          <p className="text-brand-100 mb-8 text-lg">
            Try the platform for free. Upgrade only when you need more credits.
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => onNavigate('pricing')}
              className="bg-brand-700 hover:bg-brand-800 text-white px-8 py-3 rounded-lg font-semibold transition"
            >
              View Pricing
            </button>
            <button 
              onClick={() => onNavigate('dashboard')}
              className="bg-white text-brand-600 hover:bg-slate-100 px-8 py-3 rounded-lg font-bold transition shadow-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-dark-border px-6 bg-dark-bg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">© 2025 AI Dubbing Platform</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-300">Privacy</a>
            <a href="#" className="hover:text-slate-300">Terms</a>
            <a href="#" className="hover:text-slate-300">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, text }: {icon: React.ReactNode, title: string, text: string}) {
  return (
    <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border hover:border-brand-500/50 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2 text-white">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
    </div>
  );
}

function Step({ number, title, text }: {number: string, title: string, text: string}) {
  return (
    <div className="relative group">
      <div className="w-12 h-12 mx-auto rounded-full bg-dark-surface border border-brand-500/30 text-brand-500 flex items-center justify-center font-bold mb-4 shadow-lg group-hover:bg-brand-500 group-hover:text-white transition-all">
        {number}
      </div>
      <h4 className="font-semibold mb-2 text-white">{title}</h4>
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}