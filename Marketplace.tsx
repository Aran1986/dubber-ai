
import React, { useState } from 'react';
import { Voice, VoiceCategory, Language } from './types';
import { 
  ShoppingBagIcon, MagnifyingGlassIcon, StarIcon, 
  ArrowUpTrayIcon, CurrencyDollarIcon, HeartIcon,
  PlayCircleIcon, MicrophoneIcon, HandThumbUpIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const MOCK_MARKET_VOICES: Voice[] = [
  { id: 'mv1', name: 'Brad Pitt Style', category: 'Celebrity', isFree: false, price: 120, supportedLanguages: ['en', 'fa', 'es'], languageRatings: { en: { score: 95, count: 230 }, fa: { score: 80, count: 12 } } },
  { id: 'mv2', name: 'Professional News Anchor', category: 'Professional', isFree: false, price: 45, supportedLanguages: ['en', 'fr', 'de'], languageRatings: { en: { score: 98, count: 890 } } },
  { id: 'mv3', name: 'Anime Girl (Japanese)', category: 'Professional', isFree: false, price: 60, supportedLanguages: ['ja', 'en'], languageRatings: { ja: { score: 96, count: 1500 } } },
  { id: 'mv4', name: 'Persian Storyteller', category: 'Professional', isFree: false, price: 30, supportedLanguages: ['fa'], languageRatings: { fa: { score: 94, count: 45 } } },
  { id: 'mv5', name: 'Robo-Guide', category: 'Generic', isFree: true, supportedLanguages: ['en'], languageRatings: { en: { score: 70, count: 12 } } },
];

export default function Marketplace() {
  const [tab, setTab] = useState<'browse' | 'sell' | 'earnings'>('browse');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<VoiceCategory | 'All'>('All');
  const [sellingVoiceName, setSellingVoiceName] = useState('');
  const [sellingPrice, setSellingPrice] = useState(50);
  const [isRecording, setIsRecording] = useState(false);

  const renderRating = (voice: Voice) => {
    const rating = voice.languageRatings['en'] || Object.values(voice.languageRatings)[0] || { score: 0, count: 0 };
    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {[20, 40, 60, 80, 100].map(s => (
                    s <= rating.score ? <StarIconSolid key={s} className="w-3 h-3 text-yellow-500" /> : <StarIcon key={s} className="w-3 h-3 text-slate-600" />
                ))}
            </div>
            <span className="text-[10px] text-slate-500">({rating.count})</span>
        </div>
    );
  };

  const handleRate = (id: string) => {
    alert(`Rating system active! Voice ${id} received 5 stars.`);
  };

  return (
    <div className="min-h-screen bg-dark-bg py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <ShoppingBagIcon className="w-8 h-8 text-brand-500" /> Global Voice Market
                </h1>
                <p className="text-slate-400 mt-2">Discover premium voices or sell your own clones</p>
            </div>
            <div className="flex bg-dark-surface p-1 rounded-xl border border-dark-border shadow-xl">
                <button onClick={() => setTab('browse')} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${tab === 'browse' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Browse</button>
                <button onClick={() => setTab('sell')} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${tab === 'sell' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Sell Voice</button>
                <button onClick={() => setTab('earnings')} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${tab === 'earnings' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Earnings</button>
            </div>
        </div>

        {tab === 'browse' && (
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row gap-4 items-center max-w-4xl mx-auto">
                    <div className="relative flex-1 w-full">
                        <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-3.5 text-slate-500" />
                        <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search voice styles, characters..." 
                            className="w-full bg-dark-surface border border-dark-border rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto">
                        {['All', 'Celebrity', 'Professional', 'Generic', 'Free'].map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setCatFilter(cat as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shrink-0
                                    ${catFilter === cat ? 'bg-brand-500 border-brand-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {MOCK_MARKET_VOICES.filter(v => {
                        const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
                        const matchesCat = catFilter === 'All' || v.category === catFilter || (catFilter === 'Free' && v.isFree);
                        return matchesSearch && matchesCat;
                    }).map(v => (
                        <div key={v.id} className="bg-dark-surface border border-dark-border rounded-2xl p-6 hover:border-brand-500 transition-all group relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500/20 to-transparent"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl font-bold text-brand-500 group-hover:scale-110 transition-transform shadow-inner">
                                    {v.name.charAt(0)}
                                </div>
                                <div className="text-right">
                                    <div className="text-brand-400 font-bold text-lg">{v.isFree ? 'FREE' : `${v.price}T`}</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tokens</div>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">{v.name}</h3>
                            <p className="text-xs text-slate-500 mb-4">{v.category}</p>
                            
                            <div className="flex items-center justify-between mt-6 border-t border-slate-700 pt-4">
                                <div className="flex flex-col gap-1">
                                    {renderRating(v)}
                                    <button 
                                        onClick={() => handleRate(v.id)}
                                        className="text-[9px] text-brand-400 hover:text-brand-300 font-bold uppercase flex items-center gap-1"
                                    >
                                        <HandThumbUpIcon className="w-3 h-3" /> Submit Rating
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-brand-400 transition" title="Preview">
                                        <PlayCircleIcon className="w-6 h-6" />
                                    </button>
                                    <button className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-lg shadow-brand-500/20">Buy</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {tab === 'sell' && (
            <div className="max-w-2xl mx-auto bg-dark-surface border border-dark-border rounded-3xl p-10 shadow-2xl animate-in slide-in-from-bottom-6 duration-500">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <MicrophoneIcon className="w-10 h-10 text-brand-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Monetize Your Voice</h2>
                    <p className="text-slate-400 mt-2">Submit high-quality audio to join the marketplace.</p>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Voice Display Name</label>
                        <input 
                            value={sellingVoiceName}
                            onChange={(e) => setSellingVoiceName(e.target.value)}
                            placeholder="e.g. Warm Narrative Voice (Male)" 
                            className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Price per min (Tokens)</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" min="10" max="500" step="10" 
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(Number(e.target.value))}
                                className="flex-1 accent-brand-500"
                            />
                            <span className="text-xl font-bold text-brand-400 w-20 text-center">{sellingPrice}T</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 border-2 border-dashed border-slate-700 rounded-2xl text-center hover:border-brand-500 transition-all cursor-pointer bg-dark-bg/50">
                            <ArrowUpTrayIcon className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                            <p className="text-[11px] text-slate-400 font-bold uppercase">Upload File</p>
                        </div>
                        <div 
                            onClick={() => setIsRecording(!isRecording)}
                            className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer bg-dark-bg/50
                                ${isRecording ? 'border-red-500 animate-pulse' : 'border-slate-700 hover:border-brand-500'}
                            `}
                        >
                            <MicrophoneIcon className={`w-10 h-10 mx-auto mb-2 ${isRecording ? 'text-red-500' : 'text-slate-600'}`} />
                            <p className="text-[11px] text-slate-400 font-bold uppercase">{isRecording ? 'Stop Recording' : 'Record Now'}</p>
                        </div>
                    </div>
                    
                    <button className="w-full bg-brand-600 py-4 rounded-xl font-bold text-white shadow-xl hover:bg-brand-500 transition transform active:scale-95 shadow-brand-500/20">Publish to Market</button>
                </div>
            </div>
        )}

        {tab === 'earnings' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in zoom-in-95 duration-300">
                <div className="bg-dark-surface p-8 rounded-3xl border border-dark-border text-center shadow-xl">
                    <CurrencyDollarIcon className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">Total Payout</p>
                    <div className="text-4xl font-bold text-white mt-2">0 <span className="text-xs text-slate-500">Tokens</span></div>
                </div>
                <div className="bg-dark-surface p-8 rounded-3xl border border-dark-border text-center shadow-xl">
                    <ShoppingBagIcon className="w-12 h-12 mx-auto text-brand-500 mb-4" />
                    <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">Sales Count</p>
                    <div className="text-4xl font-bold text-white mt-2">0 <span className="text-xs text-slate-500">Orders</span></div>
                </div>
                <div className="bg-dark-surface p-8 rounded-3xl border border-dark-border text-center shadow-xl">
                    <HeartIcon className="w-12 h-12 mx-auto text-red-500 mb-4" />
                    <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">Reputation</p>
                    <div className="text-4xl font-bold text-white mt-2">New <span className="text-xs text-slate-500">/ 5</span></div>
                </div>
                <div className="md:col-span-3 bg-dark-surface rounded-3xl border border-dark-border p-12 text-center text-slate-500 italic">
                    No transactions recorded yet. Start selling to see your stats here!
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
