
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { JobState, Voice, VoiceCategory, LogEntry, Language, Segment } from './types';
import { VideoPipeline } from './services/pipeline';
import { ProviderRegistry } from './services/providers';
import { DBService } from './services/db';
import { 
  CloudArrowUpIcon, LanguageIcon, CpuChipIcon, VideoCameraIcon, 
  CheckCircleIcon, ExclamationCircleIcon, PlayCircleIcon, 
  ArrowDownTrayIcon, PlayIcon, MagnifyingGlassIcon, 
  MusicalNoteIcon, AdjustmentsHorizontalIcon, SpeakerWaveIcon,
  ChevronDownIcon, XMarkIcon, SparklesIcon, ClockIcon, TrashIcon,
  DocumentTextIcon, ChatBubbleBottomCenterTextIcon,
  ClockIcon as ClockIconOutline
} from '@heroicons/react/24/outline';

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', tier: 'free' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', tier: 'free' },
];

const DEFAULT_VOICES: Voice[] = [
  { id: 'Puck', name: 'Puck (Default)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 85, count: 1200 } } },
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
  const [history, setHistory] = useState<JobState[]>([]);
  
  const pipelineRef = useRef<VideoPipeline | null>(null);
  const durationRef = useRef<HTMLAudioElement>(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    const data = await DBService.getAllProjects();
    setHistory(data.sort((a, b) => (b.startTime || 0) - (a.startTime || 0)));
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
    if (newSelected.includes(stepId)) {
        newSelected = newSelected.filter(id => id !== stepId);
    } else {
        newSelected.push(stepId);
    }
    setJob(prev => ({ ...prev, selectedSteps: newSelected }));
  };

  const isStepSelected = (id: string) => job.selectedSteps.includes(id);
  const isDone = (idx: number) => {
    const currentIdx = STEPS.findIndex(x => x.id === job.status);
    return currentIdx > idx || job.status === 'COMPLETED';
  };
  const isActive = (idx: number) => job.status === STEPS[idx].id;

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 p-4 lg:p-8 font-sans">
      <audio ref={durationRef} className="hidden" />

      {/* Voice Modal (Omitted for brevity, kept from previous) */}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar History */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl h-full flex flex-col min-h-[400px]">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><ClockIcon className="w-5 h-5 text-brand-500" /> Recent Activity</h2>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                 {history.map(p => (
                    <div key={p.id} onClick={() => setJob(p)} className={`p-3 rounded-xl border cursor-pointer transition-all ${job.id === p.id ? 'bg-brand-500/10 border-brand-500' : 'border-slate-800 bg-dark-bg/40 hover:border-slate-600'}`}>
                        <div className="text-[10px] text-slate-500 mb-1">#{p.id.split('-')[1]}</div>
                        <div className="text-xs font-bold text-white mb-1 truncate">{p.originalFile ? (p.originalFile as any).name : 'Media'}</div>
                        <span className="text-[9px] font-black uppercase tracking-tighter text-brand-400">{p.status}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Config and Main Area */}
        <div className="lg:col-span-9 space-y-6">
           {/* Progress Dashboard */}
           <div className="bg-dark-surface border border-dark-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-white">Studio Pipeline</h2>
                        <p className="text-xs text-slate-500">Credit Cost: {Math.ceil(job.mediaDuration)} Tokens</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-brand-500">{(elapsedTime / 1000).toFixed(1)}s</div>
                        <div className="text-[10px] font-bold text-slate-600 uppercase">Elapsed Time</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-10">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                        <span>Overall Progress</span>
                        <span>{Math.round(job.progress)}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-600 to-indigo-600 transition-all duration-500" style={{ width: `${job.progress}%` }}></div>
                    </div>
                </div>

                {/* Metro Pipeline */}
                <div className="relative flex flex-col gap-10 mb-10 px-4">
                   <div className="absolute top-6 left-10 right-10 h-1 bg-slate-800 -z-0"></div>
                   <div className="flex items-center w-full justify-between relative z-10">
                      {STEPS.map((s, idx) => (
                        <button key={s.id} onClick={() => handleStepClick(s.id)} disabled={s.mandatory || job.status !== 'IDLE'} className={`w-12 h-12 rounded-full flex items-center justify-center border-4 bg-dark-surface transition-all duration-500 ${isActive(idx) ? 'border-brand-500 scale-125 shadow-lg text-brand-500' : isDone(idx) ? 'border-brand-500 bg-brand-500 text-white' : isStepSelected(s.id) ? 'border-brand-400/40 text-brand-400/40' : 'border-slate-800 text-slate-800'}`}>
                            <s.icon className="w-5 h-5" />
                        </button>
                      ))}
                   </div>
                   <div className="flex justify-between w-full mt-[-10px] text-[8px] font-black uppercase tracking-tighter text-slate-500">
                      {STEPS.map(s => <span key={s.id} className="w-12 text-center">{s.label}</span>)}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-dark-bg/60 p-4 rounded-2xl border border-dark-border">
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Media Source</p>
                        <input type="file" onChange={(e) => e.target.files?.[0] && setJob(prev => ({...prev, originalFile: e.target.files![0]}))} className="text-xs text-slate-400" />
                    </div>
                    <button onClick={() => { if(job.originalFile) { pipelineRef.current = new VideoPipeline(updateJobState); pipelineRef.current.run(job.originalFile, { targetLang: job.targetLang, voiceId: job.selectedVoice?.id || 'Puck', selectedSteps: job.selectedSteps, mediaDuration: job.mediaDuration }); } }} disabled={!job.originalFile || job.status !== 'IDLE'} className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-2xl shadow-xl transition active:scale-95 disabled:opacity-40">START PROCESSING</button>
                </div>

                <div className="mt-6 bg-black/40 rounded-xl p-4 h-32 overflow-y-auto font-mono text-[9px] border border-dark-border custom-scrollbar">
                    {job.logs.map((log, i) => <div key={i} className="mb-1 text-slate-400"><span className="text-brand-500 mr-2">[{log.time}]</span> {log.message}</div>)}
                </div>
           </div>

           {/* Transcript and Translation View (Modular Segments) */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {job.transcript && (
                    <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><DocumentTextIcon className="w-4 h-4 text-brand-500" /> STT Results</h3>
                        <div className="bg-dark-bg/60 rounded-xl border border-dark-border h-64 overflow-y-auto custom-scrollbar p-3 space-y-2" dir="auto">
                            {job.transcript.segments.map((s, i) => (
                                <div key={i} className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                                    <div className="text-[9px] text-slate-500 mb-1">{s.speaker} • {s.start.toFixed(1)}s - {s.end.toFixed(1)}s</div>
                                    <p className="text-xs text-slate-300">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {job.translation && (
                    <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><LanguageIcon className="w-4 h-4 text-brand-500" /> Translation</h3>
                        <div className="bg-dark-bg/60 rounded-xl border border-dark-border h-64 overflow-y-auto custom-scrollbar p-3 space-y-2 text-brand-400" dir="auto">
                            {job.translation.segments.map((s, i) => (
                                <div key={i} className="p-3 bg-brand-500/5 rounded-lg border border-brand-500/10">
                                    <div className="text-[9px] text-slate-500 mb-1">{s.speaker} • {s.start.toFixed(1)}s - {s.end.toFixed(1)}s</div>
                                    <p className="text-xs text-white">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
           </div>

           {/* Final Output */}
           {job.finalVideo && (
                <div className="bg-gradient-to-br from-brand-900/20 to-indigo-900/20 border border-brand-500/20 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-4">
                    <div className="flex flex-col xl:flex-row gap-8 items-center">
                        <div className="flex-1 w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative">
                            <video src={job.finalVideo.videoUrl} className="w-full h-full" controls />
                            <div className="absolute top-4 right-4 bg-brand-500 text-white text-[9px] font-black px-3 py-1 rounded-full">REAL RENDERED MP4</div>
                        </div>
                        <div className="w-full xl:w-64 space-y-4 text-center">
                            <a href={job.finalVideo.videoUrl} download="dubbed_video.mp4" className="w-full flex items-center justify-center gap-2 bg-white text-brand-900 font-black py-4 rounded-2xl shadow-xl hover:bg-slate-100 transition active:scale-95 uppercase text-xs">
                                <ArrowDownTrayIcon className="w-5 h-5" /> Download MP4
                            </a>
                            <p className="text-[9px] text-slate-500">The file above contains combined audio and video. You can use it anywhere.</p>
                        </div>
                    </div>
                </div>
           )}
        </div>
      </main>
    </div>
  );
}
