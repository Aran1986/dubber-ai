import React from 'react';
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface Props {
  onNavigate: (page: string) => void;
}

const plans = [
  {
    name: "Free",
    price: "$0",
    credits: "100 Credits (one-time)",
    equivalent: ["100 min Subtitles"],
    features: {
      stt: true,
      subtitle: true,
      translation: false,
      tts: false,
      cloning: false,
      emotion: false,
      lipsync: false,
    },
  },
  {
    name: "Starter",
    price: "$15 / mo",
    credits: "1000 Credits",
    equivalent: [
      "1000 min Subtitles",
      "or 400 min Translation",
      "or 200 min Text-to-Speech",
    ],
    features: {
      stt: true,
      subtitle: true,
      translation: true,
      tts: true,
      cloning: false,
      emotion: false,
      lipsync: false,
    },
  },
  {
    name: "Creator",
    price: "$29 / mo",
    credits: "2000 Credits",
    equivalent: [
      "2000 min Subtitles",
      "or 800 min Translation",
      "or 400 min Text-to-Speech",
      "or 250 min Voice Cloning",
    ],
    features: {
      stt: true,
      subtitle: true,
      translation: true,
      tts: true,
      cloning: true,
      emotion: false,
      lipsync: false,
    },
    popular: true,
  },
  {
    name: "Pro",
    price: "$59 / mo",
    credits: "4500 Credits",
    equivalent: [
      "4500 min Subtitles",
      "or 1800 min Translation",
      "or 900 min Text-to-Speech",
      "or 560 min Voice Cloning",
      "or 300 min Emotion-aware Voice",
    ],
    features: {
      stt: true,
      subtitle: true,
      translation: true,
      tts: true,
      cloning: true,
      emotion: true,
      lipsync: false,
    },
  },
  {
    name: "Business",
    price: "$99 / mo",
    credits: "8500 Credits",
    equivalent: [
      "8500 min Subtitles",
      "or 3400 min Translation",
      "or 1700 min Text-to-Speech",
      "or 1060 min Voice Cloning",
      "or 560 min Emotion-aware Voice",
      "or 300 min Lip Sync",
    ],
    features: {
      stt: true,
      subtitle: true,
      translation: true,
      tts: true,
      cloning: true,
      emotion: true,
      lipsync: true,
    },
  },
  {
    name: "Enterprise",
    price: "From $250",
    credits: "25000+ Credits",
    equivalent: [
      "25000+ min Subtitles",
      "or 10000+ min Translation",
      "or 5000+ min Text-to-Speech",
      "or 3100+ min Voice Cloning",
      "or 1600+ min Emotion-aware Voice",
      "or 900+ min Lip Sync",
    ],
    features: {
      stt: true,
      subtitle: true,
      translation: true,
      tts: true,
      cloning: true,
      emotion: true,
      lipsync: true,
      api: true,
      sla: true,
    },
  },
];

const Feature = ({ enabled, label }: {enabled?: boolean, label: string}) => (
  <div className="flex items-center gap-2 text-sm">
    {enabled ? (
      <CheckIcon className="w-4 h-4 text-green-400" />
    ) : (
      <XMarkIcon className="w-4 h-4 text-slate-600" />
    )}
    <span className={enabled ? "text-slate-300" : "text-slate-600"}>{label}</span>
  </div>
);

export default function PricingPage({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-dark-bg py-20 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4 text-white">Pricing Plans</h1>
        <p className="text-center text-slate-400 mb-12">
          Flexible credit-based pricing. Pay only for what you use.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl bg-dark-surface border transition-all duration-300 flex flex-col h-full
                ${plan.popular 
                  ? "border-brand-500 shadow-[0_0_20px_rgba(14,165,233,0.15)]" 
                  : "border-dark-border hover:border-slate-500"}
              `}
            >
              {plan.popular && (
                <span className="absolute top-4 right-4 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  Most Popular
                </span>
              )}

              <div className="p-6 flex flex-col h-full">
                <h2 className="text-2xl font-semibold mb-2 text-white">{plan.name}</h2>
                <p className="text-3xl font-bold mb-1 text-white">{plan.price}</p>
                <p className="text-sm text-slate-400 mb-4">{plan.credits}</p>

                <div className="mb-6 bg-dark-bg/50 p-3 rounded-lg border border-dark-border">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Equivalent to:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    {plan.equivalent.map((eq) => (
                      <li key={eq}>• {eq}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 flex-1 mb-8">
                  <Feature enabled={plan.features.stt} label="Speech-to-Text" />
                  <Feature enabled={plan.features.subtitle} label="Subtitles (SRT/VTT)" />
                  <Feature enabled={plan.features.translation} label="Translation" />
                  <Feature enabled={plan.features.tts} label="Text-to-Speech" />
                  <Feature enabled={plan.features.cloning} label="Voice Cloning" />
                  <Feature enabled={plan.features.emotion} label="Emotion-aware Voice" />
                  <Feature enabled={plan.features.lipsync} label="Lip Sync" />
                  {plan.features.api && <Feature enabled label="API Access" />}
                  {plan.features.sla && <Feature enabled label="SLA & Priority Support" />}
                </div>

                <button 
                  onClick={() => onNavigate('dashboard')}
                  className={`w-full py-3 px-4 rounded-lg font-bold transition-all
                  ${plan.popular 
                    ? "bg-brand-600 hover:bg-brand-500 text-white shadow-lg" 
                    : "bg-slate-700 hover:bg-slate-600 text-white"}
                `}>
                  Get Started
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}