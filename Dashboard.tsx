
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { JobState, Voice, VoiceCategory, LogEntry, Language } from './types';
import { VideoPipeline } from './services/pipeline';
import { ProviderRegistry } from './services/providers';
import { 
  CloudArrowUpIcon, LanguageIcon, CpuChipIcon, VideoCameraIcon, 
  CheckCircleIcon, ExclamationCircleIcon, PlayCircleIcon, 
  ArrowDownTrayIcon, PlayIcon, MagnifyingGlassIcon, 
  MusicalNoteIcon, AdjustmentsHorizontalIcon, SpeakerWaveIcon,
  ChevronDownIcon, XMarkIcon, SparklesIcon
} from '@heroicons/react/24/outline';

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', tier: 'free' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', tier: 'free' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', tier: 'free' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', tier: 'free' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', tier: 'free' },
  { code: 'fr', name: 'French', nativeName: 'Français', tier: 'free' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', tier: 'free' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', tier: 'business' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', tier: 'business' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', tier: 'business' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', tier: 'free' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', tier: 'business' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', tier: 'free' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', tier: 'business' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', tier: 'business' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', tier: 'enterprise' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', tier: 'enterprise' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', tier: 'enterprise' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', tier: 'enterprise' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', tier: 'business' },
  { code: 'he', name: 'Hebrew', nativeName: 'עبری', tier: 'enterprise' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', tier: 'business' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', tier: 'enterprise' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', tier: 'enterprise' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', tier: 'enterprise' },
  { code: 'cs', name: 'Czech', nativeName: 'Čهština', tier: 'enterprise' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', tier: 'enterprise' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', tier: 'enterprise' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', tier: 'enterprise' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', tier: 'enterprise' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', tier: 'enterprise' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatsکی', tier: 'enterprise' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', tier: 'enterprise' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', tier: 'enterprise' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', tier: 'enterprise' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', tier: 'enterprise' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', tier: 'enterprise' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', tier: 'enterprise' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', tier: 'enterprise' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', tier: 'enterprise' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', tier: 'enterprise' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', tier: 'enterprise' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', tier: 'enterprise' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycanca', tier: 'enterprise' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', tier: 'enterprise' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', tier: 'enterprise' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', tier: 'enterprise' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', tier: 'enterprise' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', tier: 'enterprise' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', tier: 'enterprise' },
];

const DEFAULT_VOICES: Voice[] = [
  { id: 'Puck', name: 'Puck (Default)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 85, count: 1200 }, fa: { score: 90, count: 400 } } },
  { id: 'Kore', name: 'Kore (Pro)', category: 'Professional', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 92, count: 500 } } },
  { id: 'Zephyr', name: 'Zephyr (Warm)', category: 'Generic', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { fa: { score: 88, count: 200 } } },
  { id: 'Charon', name: 'Charon (Deep)', category: 'Generic', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 82, count: 150 } } },
  { id: 'Fenrir', name: 'Fenrir (Fast)', category: 'Generic', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 84, count: 320 } } },
  { id: 'morgan', name: 'Morgan Freeman', category: 'Celebrity', isFree: false, price: 50, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 98, count: 1200 }, fa: { score: 75, count: 45 } } },
  { id: 'scarlet', name: 'Scarlett Johansson', category: 'Celebrity', isFree: false, price: 55, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 97, count: 900 } } },
];

const STEPS = [
  { id: 'UPLOADING', label: 'Upload', icon: CloudArrowUpIcon, mandatory: true },
  { id: 'TRANSCRIBING', label: 'Transcribe', icon: CpuChipIcon, mandatory: false },
  { id: 'TRANSLATING', label: 'Translate', icon: LanguageIcon, mandatory: false },
  { id: 'DUBBING', label: 'Dubbing', icon: PlayCircleIcon, mandatory: false },
  { id: 'LIPSYNCING', label: 'Lip Sync', icon: VideoCameraIcon, mandatory: false },
  { id: 'COMPLETED', label: 'Done', icon: CheckCircleIcon, mandatory: true },
];

const INITIAL_STATE: JobState = {
  id: '', status: 'IDLE', progress: 0, stepProgress: 0, logs: [],
  startTime: null, endTime: null, originalFile: null, mediaDuration: 0,
  fileBase64: null, transcript: null, translation: null, dubbedAudio: null, finalVideo: null,
  targetLang: 'en', selectedVoice: DEFAULT_VOICES[0], 
  selectedSteps: ['UPLOADING', 'TRANSCRIBING', 'TRANSLATING', 'DUBBING', 'COMPLETED']
};

export default function Dashboard() {
  const [job, setJob] = useState<JobState>(INITIAL_STATE);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceCatFilter, setVoiceCatFilter] = useState<VoiceCategory | 'All'>('All');
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const pipelineRef = useRef<VideoPipeline | null>(null);
  const durationRef = useRef<HTMLAudioElement>(null);

  const sessionId = useMemo(() => 'SESSION-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'), []);
  useEffect(() => { setJob(prev => ({ ...prev, id: sessionId })); }, [sessionId]);

  useEffect(() => {
    let interval: any;
    if (job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED' && job.startTime) {
      interval = setInterval(() => setElapsedTime(Date.now() - job.startTime!), 1000);
    } else if (job.status === 'COMPLETED' && job.endTime && job.startTime) {
       setElapsedTime(job.endTime - job.startTime);
    }
    return () => clearInterval(interval);
  }, [job.status, job.startTime, job.endTime]);

  const updateJobState = useCallback((update: Partial<JobState>) => {
    setJob(prev => {
      const newState = { ...prev, ...update };
      if (update.logs && Array.isArray(update.logs)) newState.logs = [...prev.logs, ...update.logs];
      return newState;
    });
  }, []);

  const handleStepClick = (stepId: string) => {
    if (job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED') return;
    if (stepId === 'UPLOADING' || stepId === 'COMPLETED') return;
    let newSelected = [...job.selectedSteps];
    const isCurrentlySelected = newSelected.includes(stepId);
    if (isCurrentlySelected) {
        const stepIndex = STEPS.findIndex(s => s.id === stepId);
        const stepsToRemove = STEPS.slice(stepIndex).map(s => s.id);
        newSelected = newSelected.filter(id => !stepsToRemove.includes(id));
        if (!newSelected.includes('COMPLETED')) newSelected.push('COMPLETED');
    } else {
        const stepIndex = STEPS.findIndex(s => s.id === stepId);
        const stepsToAdd = STEPS.slice(0, stepIndex + 1).map(s => s.id);
        stepsToAdd.forEach(id => { if (!newSelected.includes(id)) newSelected.push(id); });
        if (!newSelected.includes('COMPLETED')) newSelected.push('COMPLETED');
    }
    setJob(prev => ({ ...prev, selectedSteps: newSelected }));
  };

  const handlePreviewVoice = async () => {
    if (!job.selectedVoice || isPreviewing) return;
    setIsPreviewing(true);
    try {
        const tts = ProviderRegistry.getTTS();
        const mockTranslation = {
            originalText: "Hello",
            translatedText: job.targetLang === 'fa' ? "سلام، من صدای انتخابی شما هستم." : "Hello, I am your selected voice preview.",
            segments: [{ start: 0, end: 3, text: job.targetLang === 'fa' ? "سلام، من صدای انتخابی شما هستم." : "Hello, I am your selected voice preview." }],
            targetLanguage: job.targetLang
        };
        const result = await tts.synthesize(mockTranslation, job.selectedVoice.id);
        const audio = new Audio(result.audioUrl);
        audio.onended = () => setIsPreviewing(false);
        audio.play();
    } catch (e) {
        alert("Preview error.");
        setIsPreviewing(false);
    }
  };

  const filteredVoicesForModal = useMemo(() => {
    return DEFAULT_VOICES
      .filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(voiceSearch.toLowerCase());
        const matchesCat = voiceCatFilter === 'All' || v.category === voiceCatFilter || (voiceCatFilter === 'Free' && v.isFree);
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [voiceSearch, voiceCatFilter]);

  const isStepSelected = (id: string) => job.selectedSteps.includes(id);

  // Status helpers for rendering
  const isDone = (idx: number) => {
    const currentIdx = STEPS.findIndex(x => x.id === job.status);
    return currentIdx > idx || job.status === 'COMPLETED';
  };
  const isActive = (idx: number) => job.status === STEPS[idx].id;

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 p-4 lg:p-8">
      <audio ref={durationRef} className="hidden" />

      {/* Voice Selection Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-dark-surface border border-dark-border w-full max-w-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-bg/60">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <MusicalNoteIcon className="w-6 h-6 text-brand-500" /> Select New Voice
                        </h3>
                    </div>
                    <button onClick={() => setShowVoiceModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 bg-dark-bg/30">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-3.5 text-slate-500" />
                        <input 
                            autoFocus
                            value={voiceSearch}
                            onChange={(e) => setVoiceSearch(e.target.value)}
                            placeholder="Search voices..." 
                            className="w-full bg-dark-bg border border-dark-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <div className="grid grid-cols-1 gap-2">
                        {filteredVoicesForModal.map(v => (
                            <div 
                                key={v.id}
                                onClick={() => { setJob(prev => ({...prev, selectedVoice: v})); setShowVoiceModal(false); }}
                                className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 hover:bg-brand-500/10 border group ${job.selectedVoice?.id === v.id ? 'bg-brand-500/15 border-brand-500/50 ring-1 ring-brand-500/20 shadow-lg' : 'border-transparent'}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all shadow-inner
                                    ${job.selectedVoice?.id === v.id ? 'bg-brand-500 text-white' : 'bg-slate-800 text-brand-500 group-hover:bg-slate-700'}
                                `}>
                                    {v.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="text-base font-bold text-white group-hover:text-brand-400 transition-colors">{v.name}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-widest font-medium mt-0.5">{v.category}</div>
                                </div>
                                {job.selectedVoice?.id === v.id && <CheckCircleIcon className="w-6 h-6 text-brand-500" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Configuration Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-500"></div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
               <AdjustmentsHorizontalIcon className="w-5 h-5 text-brand-500" /> Dubbing Configuration
            </h2>

            <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-1">Select Voice</label>
                  <div 
                      onClick={() => setShowVoiceModal(true)}
                      className="p-5 bg-dark-bg border border-dark-border rounded-2xl cursor-pointer hover:border-brand-500 transition-all group flex items-center justify-between shadow-inner"
                  >
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl font-bold text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-lg">
                              {job.selectedVoice?.name.charAt(0)}
                          </div>
                          <div>
                              <div className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">{job.selectedVoice?.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <SparklesIcon className="w-4 h-4 text-brand-500" /> {job.selectedVoice?.category}
                              </div>
                          </div>
                      </div>
                      <ChevronDownIcon className="w-6 h-6 text-slate-600 group-hover:text-brand-500 transition-colors" />
                  </div>
                </div>

                <div className="bg-dark-bg/40 p-4 rounded-2xl border border-dark-border">
                    <p className="text-[10px] font-black text-slate-600 uppercase mb-4 ml-1 text-center">Library Filter</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {['All', 'Celebrity', 'Professional', 'Generic', 'Free', 'MyVoices'].map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setVoiceCatFilter(cat as any)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all 
                                    ${voiceCatFilter === cat ? 'bg-brand-500 border-brand-500 text-white shadow-xl shadow-brand-500/30' : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-1">Target Language</label>
                      <select 
                        value={job.targetLang}
                        onChange={(e) => setJob(prev => ({...prev, targetLang: e.target.value}))}
                        className="w-full bg-dark-bg border border-dark-border rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer shadow-inner appearance-none"
                      >
                        {LANGUAGES.map(l => (
                            <option key={l.code} value={l.code}>{l.name} ({l.nativeName})</option>
                        ))}
                      </select>
                   </div>
                   
                   <button 
                    onClick={handlePreviewVoice}
                    disabled={isPreviewing}
                    className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 py-4.5 rounded-2xl border border-slate-700 text-xs font-bold transition-all disabled:opacity-50 shadow-lg active:scale-95 group"
                   >
                      <SpeakerWaveIcon className={`w-6 h-6 text-brand-400 group-hover:text-brand-300 ${isPreviewing ? 'animate-bounce' : ''}`} />
                      {isPreviewing ? 'Synthesizing...' : 'Live Voice Test'}
                   </button>
                </div>
            </div>
          </div>

          <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl">
             <h2 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
               <CloudArrowUpIcon className="w-5 h-5 text-brand-500" /> Media Source
             </h2>
             <div className="relative group border-2 border-dashed border-slate-700 rounded-2xl p-10 text-center hover:border-brand-500 transition-all cursor-pointer bg-dark-bg/50">
                <input type="file" onChange={(e) => {
                  if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      const url = URL.createObjectURL(file);
                      if (durationRef.current) {
                          durationRef.current.src = url;
                          durationRef.current.onloadedmetadata = () => {
                              updateJobState({ originalFile: file, mediaDuration: durationRef.current?.duration || 0, logs: [{time: new Date().toLocaleTimeString(), message: "Media source verified."}] });
                          };
                      }
                  }
                }} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="flex flex-col items-center">
                    <CloudArrowUpIcon className="w-10 h-10 text-slate-600 mb-3 group-hover:text-brand-500 transition-colors" />
                    <div className="text-sm text-slate-400 font-medium">
                        {job.originalFile ? <span className="text-brand-400 font-bold">{job.originalFile.name}</span> : 'Select Video or Audio File'}
                    </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right: Monitoring & Progress (THE FIXED PIPELINE) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-dark-surface border border-dark-border rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-12 flex items-center gap-3">
                <CpuChipIcon className="w-6 h-6 text-brand-500" /> Processing Pipeline
            </h2>

            {/* PIPELINE UI (REBUILT WITH VISIBLE CONNECTING LINES IN BOTH ROWS) */}
            <div className="relative flex flex-col gap-12 mb-12" dir="ltr">
               
               {/* 1. ICONS ROW (Connected with horizontal lines) */}
               <div className="flex items-center w-full px-4">
                  {STEPS.map((s, idx) => (
                    <React.Fragment key={s.id}>
                        {/* Step Circle */}
                        <button 
                            onClick={() => handleStepClick(s.id)}
                            disabled={s.mandatory || (job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED')}
                            className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center border-4 bg-dark-surface transition-all duration-500 z-10
                                ${isActive(idx) ? 'border-brand-500 scale-125 shadow-[0_0_25px_rgba(14,165,233,0.7)] text-brand-500 ring-4 ring-brand-500/20' : 
                                  isDone(idx) ? 'border-brand-500 bg-brand-500 text-white' : 
                                  isStepSelected(s.id) ? 'border-brand-400 text-brand-400' : 'border-slate-800 text-slate-800 opacity-60'}
                            `}
                        >
                            <s.icon className="w-6 h-6" />
                        </button>

                        {/* Connection Line to Next Step (VISIBLE IN FIRST ROW) */}
                        {idx < STEPS.length - 1 && (
                            <div className={`flex-1 h-1.5 transition-colors duration-500 ${isDone(idx) ? 'bg-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]' : 'bg-slate-700'}`}></div>
                        )}
                    </React.Fragment>
                  ))}
               </div>
               
               {/* 2. LABELS ROW */}
               <div className="flex justify-between w-full px-1">
                  {STEPS.map((s, idx) => (
                    <span key={s.id} className={`text-[10px] font-black uppercase tracking-widest text-center w-20 whitespace-nowrap overflow-visible ${isActive(idx) ? 'text-brand-400' : isStepSelected(s.id) ? 'text-slate-400' : 'text-slate-800'}`}>
                        {s.label}
                    </span>
                  ))}
               </div>

               {/* 3. PROGRESS ROW (Numbers linked by lines) */}
               <div className="flex items-center w-full px-4 mt-2">
                  {STEPS.map((s, idx) => {
                    const isProcessing = job.status !== 'IDLE' && job.status !== 'COMPLETED';
                    const isLast = idx === STEPS.length - 1;
                    return (
                        <React.Fragment key={`prog-${s.id}`}>
                            {/* Progress Circle */}
                            <div className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center border-2 bg-dark-bg text-[10px] font-black transition-all shadow-inner z-10
                                ${isActive(idx) ? 'border-brand-500 text-brand-400 shadow-[0_0_15px_rgba(14,165,233,0.3)] ring-2 ring-brand-500/10' : isDone(idx) ? 'border-slate-800 text-slate-400' : 'border-slate-900 text-slate-800'}
                                ${isLast && isProcessing ? 'animate-pulse text-brand-400 border-brand-500' : ''}
                                ${!isStepSelected(s.id) ? 'opacity-20 border-slate-900' : ''}
                            `}>
                                {isStepSelected(s.id) ? (
                                    isLast ? (
                                        (elapsedTime > 0 || isProcessing) ? `${Math.floor(elapsedTime / 1000)}s` : '0s'
                                    ) : (
                                        isDone(idx) ? '100%' : (isActive(idx) ? `${Math.floor(job.stepProgress)}%` : '0%')
                                    )
                                ) : (
                                    '--'
                                )}
                            </div>

                            {/* Connection Line to Next Step */}
                            {idx < STEPS.length - 1 && (
                                <div className={`flex-1 h-1 transition-colors duration-500 ${isDone(idx) ? 'bg-slate-700' : 'bg-slate-900'}`}></div>
                            )}
                        </React.Fragment>
                    );
                  })}
               </div>
            </div>

            <button 
              onClick={() => {
                  if (job.originalFile) {
                    setJob(prev => ({...prev, logs: [], startTime: Date.now()}));
                    pipelineRef.current = new VideoPipeline(updateJobState);
                    pipelineRef.current.run(job.originalFile, {
                        targetLang: job.targetLang,
                        voiceId: job.selectedVoice?.id || 'Puck',
                        selectedSteps: job.selectedSteps,
                        mediaDuration: job.mediaDuration
                    });
                  }
              }}
              disabled={!job.originalFile || (job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED')}
              className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 py-6 rounded-3xl font-black text-xl text-white shadow-2xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-4 mt-8"
            >
              <PlayIcon className="w-9 h-9" /> DEPLOY PROCESSING TASK
            </button>

            <div className="mt-12 bg-black/50 rounded-3xl p-8 h-64 overflow-y-auto font-mono text-[11px] border border-dark-border custom-scrollbar shadow-inner">
                {job.logs.map((log, i) => (
                    <div key={i} className="mb-3 text-slate-400 flex items-start animate-in slide-in-from-left-2 duration-300">
                        <span className="text-brand-500 font-bold mr-5 shrink-0">[{log.time}]</span>
                        <span className="text-slate-300 tracking-tight">{log.message}</span>
                    </div>
                ))}
            </div>
          </div>
          
          {/* Results Area */}
          {(job.dubbedAudio || job.finalVideo) && (
             <div className="bg-gradient-to-br from-brand-900/30 to-indigo-900/30 border border-brand-500/20 rounded-[2.5rem] p-10 animate-in slide-in-from-bottom-10 duration-1000 shadow-2xl">
                <h3 className="text-2xl font-black text-white flex items-center gap-4 mb-10 text-center uppercase">
                    <CheckCircleIcon className="w-10 h-10 text-green-400 inline-block" /> Processing Complete
                </h3>
                <div className="flex flex-col xl:flex-row gap-10">
                    {job.finalVideo && (
                        <div className="flex-1 aspect-video bg-black rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                            <video src={job.finalVideo.videoUrl} className="w-full h-full" controls />
                        </div>
                    )}
                    {job.dubbedAudio && (
                        <div className="flex-1 flex flex-col justify-center space-y-8">
                            <div className="bg-dark-bg/60 p-6 rounded-2xl border border-dark-border shadow-inner">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Master Audio Stream</p>
                                <audio src={job.dubbedAudio.audioUrl} controls className="w-full" />
                            </div>
                            <button className="flex items-center justify-center gap-4 bg-white text-brand-900 font-black py-6 rounded-2xl hover:bg-slate-200 transition-all shadow-xl active:scale-95 group">
                                <ArrowDownTrayIcon className="w-7 h-7 group-hover:translate-y-0.5 transition-transform" /> DOWNLOAD MASTER FILE
                            </button>
                        </div>
                    )}
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
