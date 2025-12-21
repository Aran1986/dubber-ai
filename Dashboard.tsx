
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { JobState, Voice, VoiceCategory, LogEntry, Language } from './types';
import { VideoPipeline } from './services/pipeline';
import { ProviderRegistry } from './services/providers';
import { DBService } from './services/db';
import { 
  CloudArrowUpIcon, LanguageIcon, CpuChipIcon, VideoCameraIcon, 
  CheckCircleIcon, ExclamationCircleIcon, PlayCircleIcon, 
  ArrowDownTrayIcon, PlayIcon, MagnifyingGlassIcon, 
  MusicalNoteIcon, AdjustmentsHorizontalIcon, SpeakerWaveIcon,
  ChevronDownIcon, XMarkIcon, SparklesIcon, ClockIcon, TrashIcon,
  DocumentTextIcon, ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', tier: 'free' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', tier: 'free' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', tier: 'free' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', tier: 'free' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', tier: 'free' },
];

const DEFAULT_VOICES: Voice[] = [
  { id: 'Puck', name: 'Puck (Default)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 85, count: 1200 }, fa: { score: 90, count: 400 } } },
  { id: 'Kore', name: 'Kore (Pro)', category: 'Professional', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 92, count: 500 } } },
  { id: 'Zephyr', name: 'Zephyr (Warm)', category: 'Generic', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { fa: { score: 88, count: 200 } } },
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
  const [history, setHistory] = useState<JobState[]>([]);
  
  const pipelineRef = useRef<VideoPipeline | null>(null);
  const durationRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await DBService.getAllProjects();
    setHistory(data.sort((a, b) => (b.startTime || 0) - (a.startTime || 0)));
  };

  const loadProject = async (proj: JobState) => {
    if (job.status !== 'IDLE' && job.status !== 'COMPLETED' && job.status !== 'FAILED') {
        if (!confirm("پردازش فعلی قطع خواهد شد. مایلید پروژه دیگری را بارگذاری کنید؟")) return;
    }
    const file = await DBService.getFile(`${proj.id}_original`);
    setJob({ ...proj, originalFile: file as any });
  };

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("آیا از حذف این پروژه اطمینان دارید؟")) {
        await DBService.deleteProject(id);
        if (job.id === id) setJob(INITIAL_STATE);
        loadHistory();
    }
  };

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
    if (update.status === 'COMPLETED' || update.status === 'FAILED') loadHistory();
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
        const stepsToAdd = STEPS.slice(0, stepIndex + 1).map(s => id => { if (!newSelected.includes(id)) newSelected.push(id); });
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
  const isDone = (idx: number) => {
    const currentIdx = STEPS.findIndex(x => x.id === job.status);
    return currentIdx > idx || job.status === 'COMPLETED';
  };
  const isActive = (idx: number) => job.status === STEPS[idx].id;

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 p-4 lg:p-8">
      <audio ref={durationRef} className="hidden" />

      {/* Voice Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-dark-surface border border-dark-border w-full max-w-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-bg/60">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <MusicalNoteIcon className="w-6 h-6 text-brand-500" /> Select New Voice
                    </h3>
                    <button onClick={() => setShowVoiceModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 bg-dark-bg/30">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-3.5 text-slate-500" />
                        <input autoFocus value={voiceSearch} onChange={(e) => setVoiceSearch(e.target.value)} placeholder="Search voices..." className="w-full bg-dark-bg border border-dark-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <div className="grid grid-cols-1 gap-2">
                        {filteredVoicesForModal.map(v => (
                            <div key={v.id} onClick={() => { setJob(prev => ({...prev, selectedVoice: v})); setShowVoiceModal(false); }} className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 hover:bg-brand-500/10 border group ${job.selectedVoice?.id === v.id ? 'bg-brand-500/15 border-brand-500/50' : 'border-transparent'}`}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${job.selectedVoice?.id === v.id ? 'bg-brand-500 text-white' : 'bg-slate-800 text-brand-500 group-hover:bg-slate-700'}`}>{v.name.charAt(0)}</div>
                                <div className="flex-1">
                                    <div className="text-base font-bold text-white group-hover:text-brand-400">{v.name}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-widest font-medium">{v.category}</div>
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
        
        {/* Sidebar: History */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl h-full flex flex-col min-h-[400px]">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <ClockIcon className="w-5 h-5 text-brand-500" /> Recent Projects
              </h2>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                 {history.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 opacity-20"><CloudArrowUpIcon className="w-6 h-6" /></div>
                        <p className="text-xs text-slate-600">No projects yet</p>
                    </div>
                 ) : history.map(p => (
                    <div key={p.id} onClick={() => loadProject(p)} className={`p-3 rounded-xl border cursor-pointer transition-all group relative ${job.id === p.id ? 'bg-brand-500/10 border-brand-500' : 'border-slate-800 bg-dark-bg/40 hover:border-slate-600'}`}>
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-mono text-slate-500">#{p.id.split('-')[1]}</span>
                            <button onClick={(e) => deleteProject(e, p.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-opacity"><TrashIcon className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="text-xs font-bold text-white mb-1 truncate">
                            {p.originalFile ? (p.originalFile as any).name : 'Untitled Media'}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${p.status === 'COMPLETED' ? 'text-green-500' : p.status === 'FAILED' ? 'text-red-500' : 'text-brand-400'}`}>
                                {p.status}
                            </span>
                            <span className="text-[9px] text-slate-600">{new Date(p.startTime || 0).toLocaleDateString()}</span>
                        </div>
                    </div>
                 ))}
              </div>
              <button onClick={() => setJob(INITIAL_STATE)} className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors border border-slate-700">New Dubbing Task</button>
           </div>
        </div>

        {/* Configuration Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Config</h2>

            <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-1">Select Voice</label>
                  <div onClick={() => setShowVoiceModal(true)} className="p-4 bg-dark-bg border border-dark-border rounded-2xl cursor-pointer hover:border-brand-500 transition-all group flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-bold text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-lg">{job.selectedVoice?.name.charAt(0)}</div>
                          <div>
                              <div className="text-sm font-bold text-white group-hover:text-brand-400">{job.selectedVoice?.name}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1"><SparklesIcon className="w-3 h-3 text-brand-500" /> {job.selectedVoice?.category}</div>
                          </div>
                      </div>
                      <ChevronDownIcon className="w-5 h-5 text-slate-600 group-hover:text-brand-500 transition-colors" />
                  </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-1">Target Language</label>
                   <select value={job.targetLang} onChange={(e) => setJob(prev => ({...prev, targetLang: e.target.value}))} className="w-full bg-dark-bg border border-dark-border rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer shadow-inner appearance-none">
                     {LANGUAGES.map(l => ( <option key={l.code} value={l.code}>{l.name} ({l.nativeName})</option> ))}
                   </select>
                </div>
                <button onClick={handlePreviewVoice} disabled={isPreviewing} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl border border-slate-700 text-xs font-bold transition-all disabled:opacity-50 group">
                   <SpeakerWaveIcon className={`w-5 h-5 text-brand-400 group-hover:text-brand-300 ${isPreviewing ? 'animate-bounce' : ''}`} />
                   {isPreviewing ? 'Synthesizing...' : 'Live Voice Test'}
                </button>
            </div>
          </div>

          <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl">
             <h2 className="text-xs font-bold text-slate-400 uppercase mb-4">Media Source</h2>
             <div className="relative group border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-brand-500 transition-all cursor-pointer bg-dark-bg/50 overflow-hidden">
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
                    <CloudArrowUpIcon className="w-8 h-8 text-slate-600 mb-2 group-hover:text-brand-500" />
                    <div className="text-[10px] text-slate-500 font-medium truncate w-full px-2">
                        {job.originalFile ? <span className="text-brand-400 font-bold">{(job.originalFile as any).name}</span> : 'Drop Media Here'}
                    </div>
                </div>
             </div>
          </div>
        </div>

        {/* Processing Pipeline Area */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-dark-surface border border-dark-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <h2 className="text-lg font-bold text-white mb-10 flex items-center gap-3">
                <CpuChipIcon className="w-6 h-6 text-brand-500" /> Pipeline Control
            </h2>

            <div className="relative flex flex-col gap-10 mb-10" dir="ltr">
               <div className="flex items-center w-full px-2">
                  {STEPS.map((s, idx) => (
                    <React.Fragment key={s.id}>
                        <button onClick={() => handleStepClick(s.id)} disabled={s.mandatory || (job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED')} className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center border-4 bg-dark-surface transition-all duration-500 z-10 ${isActive(idx) ? 'border-brand-500 scale-110 shadow-[0_0_20px_rgba(14,165,233,0.5)] text-brand-500' : isDone(idx) ? 'border-brand-500 bg-brand-500 text-white' : isStepSelected(s.id) ? 'border-brand-400/40 text-brand-400/40' : 'border-slate-800 text-slate-800 opacity-40'}`}>
                            <s.icon className="w-5 h-5" />
                        </button>
                        {idx < STEPS.length - 1 && (
                            <div className={`flex-1 h-1 transition-colors duration-500 ${isDone(idx) ? 'bg-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]' : 'bg-slate-800'}`}></div>
                        )}
                    </React.Fragment>
                  ))}
               </div>
               <div className="flex justify-between w-full px-0 mt-[-10px]">
                  {STEPS.map((s, idx) => ( <span key={s.id} className={`text-[8px] font-black uppercase tracking-tighter text-center w-12 ${isActive(idx) ? 'text-brand-400' : isStepSelected(s.id) ? 'text-slate-500' : 'text-slate-800'}`}>{s.label}</span> ))}
               </div>
            </div>

            <button onClick={() => {
                  if (job.originalFile) {
                    setJob(prev => ({...prev, logs: [], startTime: Date.now()}));
                    pipelineRef.current = new VideoPipeline(updateJobState);
                    pipelineRef.current.run(job.originalFile, {
                        targetLang: job.targetLang,
                        voiceId: job.selectedVoice?.id || 'Puck',
                        selectedSteps: job.selectedSteps,
                        mediaDuration: job.mediaDuration,
                        id: job.id || undefined
                    });
                  }
              }} disabled={!job.originalFile || (job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED')} className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 py-5 rounded-2xl font-black text-lg text-white shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-3">
              <PlayIcon className="w-7 h-7" /> DEPLOY TASK
            </button>

            <div className="mt-8 bg-black/40 rounded-2xl p-6 h-48 overflow-y-auto font-mono text-[10px] border border-dark-border custom-scrollbar">
                {job.logs.map((log, i) => (
                    <div key={i} className="mb-2 text-slate-400 flex items-start animate-in slide-in-from-left-2 duration-300">
                        <span className="text-brand-500 font-bold mr-4 shrink-0">[{log.time}]</span>
                        <span className="text-slate-300">{log.message}</span>
                    </div>
                ))}
            </div>
          </div>
          
          {/* Results Sections: Transcript & Translation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {job.transcript && (
                <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl animate-in fade-in duration-500">
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4 text-brand-500" /> Original Transcript
                    </h3>
                    <div className="bg-dark-bg/60 p-4 rounded-xl border border-dark-border h-48 overflow-y-auto text-xs leading-relaxed custom-scrollbar" dir="auto">
                        {job.transcript.fullText}
                    </div>
                </div>
            )}
            {job.translation && (
                <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl animate-in fade-in duration-500">
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-brand-500" /> Translated Text
                    </h3>
                    <div className="bg-dark-bg/60 p-4 rounded-xl border border-dark-border h-48 overflow-y-auto text-xs leading-relaxed custom-scrollbar text-brand-400" dir="auto">
                        {job.translation.translatedText}
                    </div>
                </div>
            )}
          </div>

          {(job.dubbedAudio || job.finalVideo) && (
             <div className="bg-gradient-to-br from-brand-900/20 to-indigo-900/20 border border-brand-500/20 rounded-3xl p-8 animate-in slide-in-from-bottom-5 duration-700 shadow-2xl">
                <div className="flex flex-col xl:flex-row gap-6">
                    {job.finalVideo && (
                        <div className="flex-1 aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative">
                            <video src={job.finalVideo.videoUrl} className="w-full h-full" controls />
                            <div className="absolute top-4 right-4 bg-brand-500 text-white text-[8px] font-black px-2 py-1 rounded">FINAL RENDER</div>
                        </div>
                    )}
                    {job.dubbedAudio && (
                        <div className="flex-1 flex flex-col justify-center space-y-4">
                            <div className="bg-dark-bg/60 p-4 rounded-xl border border-dark-border shadow-inner">
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">Dubbed Audio Track</p>
                                <audio src={job.dubbedAudio.audioUrl} controls className="w-full h-10" />
                            </div>
                            <button className="flex items-center justify-center gap-3 bg-white text-brand-900 font-black py-4 rounded-xl hover:bg-slate-200 transition-all shadow-xl active:scale-95 text-sm uppercase"><ArrowDownTrayIcon className="w-5 h-5" /> Export Result</button>
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
