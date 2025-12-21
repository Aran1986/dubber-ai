
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

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 p-4 lg:p-8 font-sans">
      <audio ref={durationRef} className="hidden" />

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar History */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl h-full flex flex-col min-h-[400px]">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><ClockIcon className="w-5 h-5 text-brand-500" /> Recent Projects</h2>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                 {history.map(p => (
                    <div key={p.id} onClick={() => setJob(p)} className={`p-3 rounded-xl border cursor-pointer transition-all ${job.id === p.id ? 'bg-brand-500/10 border-brand-500 shadow-[0_0_15px_rgba(14,165,233,0.1)]' : 'border-slate-800 bg-dark-bg/40 hover:border-slate-600'}`}>
                        <div className="text-[9px] text-slate-500 mb-1">#{p.id.split('-')[1]}</div>
                        <div className="text-xs font-bold text-white mb-1 truncate">{p.originalFile ? (p.originalFile as any).name : 'Media Job'}</div>
                        <span className={`text-[9px] font-black uppercase tracking-tighter ${p.status === 'COMPLETED' ? 'text-green-400' : 'text-brand-400'}`}>{p.status}</span>
                    </div>
                 ))}
                 {history.length === 0 && <div className="text-center py-10 text-slate-600 text-xs italic">No previous tasks</div>}
              </div>
              <button onClick={() => setJob(INITIAL_STATE)} className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors border border-slate-700">New Task</button>
           </div>
        </div>

        {/* Main Workspace */}
        <div className="lg:col-span-9 space-y-6">
           
           {/* Progress Dashboard */}
           <div className="bg-dark-surface border border-dark-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Studio Pipeline</h2>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Estimated Cost: <span className="text-brand-400">{Math.ceil(job.mediaDuration)} Credits</span></p>
                          <p className="text-xs text-slate-500 font-bold uppercase">Elapsed: <span className="text-white">{formatTime(elapsedTime)}</span></p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-brand-500 drop-shadow-[0_0_10px_rgba(14,165,233,0.3)]">{Math.round(job.progress)}%</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Progress</div>
                    </div>
                </div>

                {/* Main Progress Bar */}
                <div className="mb-12">
                    <div className="w-full h-4 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                        <div className="h-full bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 transition-all duration-700 relative" style={{ width: `${job.progress}%` }}>
                           <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-bar-stripes_1s_linear_infinite]"></div>
                        </div>
                    </div>
                </div>

                {/* Metro Pipeline with Connecting Lines */}
                <div className="relative mb-12 px-6">
                   {/* Background Connector Line */}
                   <div className="absolute top-6 left-12 right-12 h-1.5 bg-slate-800 rounded-full overflow-hidden -z-0">
                      <div className="h-full bg-brand-500 transition-all duration-700" style={{ width: `${(STEPS.findIndex(s => s.id === job.status) + 1) * (100 / STEPS.length)}%` }}></div>
                   </div>

                   <div className="flex items-center w-full justify-between relative z-10">
                      {STEPS.map((s, idx) => (
                        <div key={s.id} className="flex flex-col items-center gap-3">
                          <button 
                            onClick={() => handleStepClick(s.id)} 
                            disabled={s.mandatory || job.status !== 'IDLE'} 
                            className={`w-14 h-14 rounded-full flex items-center justify-center border-[4px] bg-dark-surface transition-all duration-500 relative
                                ${isActive(idx) ? 'border-brand-500 scale-125 shadow-[0_0_20px_rgba(14,165,233,0.5)] text-brand-500' : 
                                  isDone(idx) ? 'border-brand-500 bg-brand-500 text-white' : 
                                  isStepSelected(s.id) ? 'border-slate-600 text-slate-400' : 'border-slate-800 text-slate-800'}
                            `}
                          >
                            <s.icon className="w-6 h-6" />
                            {isDone(idx) && <CheckCircleIcon className="w-4 h-4 absolute -bottom-1 -right-1 text-white bg-green-500 rounded-full" />}
                          </button>
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive(idx) ? 'text-brand-400' : 'text-slate-500'}`}>{s.label}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-800/30 rounded-3xl border border-slate-700/50">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Input Media</label>
                        <div className="relative group border-2 border-dashed border-slate-700 rounded-2xl p-4 text-center hover:border-brand-500 transition-all cursor-pointer bg-dark-bg/50">
                          <input type="file" onChange={(e) => {
                             if(e.target.files?.[0]) {
                               const file = e.target.files[0];
                               const url = URL.createObjectURL(file);
                               if(durationRef.current) {
                                  durationRef.current.src = url;
                                  durationRef.current.onloadedmetadata = () => {
                                    setJob(prev => ({...prev, originalFile: file, mediaDuration: durationRef.current!.duration}));
                                  };
                               }
                             }
                          }} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <CloudArrowUpIcon className="w-6 h-6 mx-auto text-slate-600 group-hover:text-brand-500 mb-1" />
                          <p className="text-[10px] font-bold text-slate-500 truncate">{job.originalFile ? (job.originalFile as any).name : 'Select File'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col justify-end">
                      <button 
                        onClick={() => { if(job.originalFile) { pipelineRef.current = new VideoPipeline(updateJobState); pipelineRef.current.run(job.originalFile, { targetLang: job.targetLang, voiceId: job.selectedVoice?.id || 'Puck', selectedSteps: job.selectedSteps, mediaDuration: job.mediaDuration }); } }} 
                        disabled={!job.originalFile || job.status !== 'IDLE'} 
                        className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-5 rounded-2xl shadow-xl transition active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-3 text-lg"
                      >
                        <PlayIcon className="w-6 h-6" /> START DEPLOYMENT
                      </button>
                    </div>
                </div>

                {/* Improved Logs with Estimation */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Activity Logs</span>
                    <span className="text-[9px] text-slate-600 italic">Streaming live events...</span>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-5 h-40 overflow-y-auto font-mono text-[10px] border border-dark-border custom-scrollbar space-y-2">
                      {job.logs.map((log, i) => (
                        <div key={i} className="flex gap-4 animate-in slide-in-from-left-2">
                          <span className="text-brand-500 font-bold shrink-0">[{log.time}]</span>
                          <span className="text-slate-300">{log.message}</span>
                        </div>
                      ))}
                      {job.logs.length === 0 && <div className="text-slate-700 italic">Waiting for process initiation...</div>}
                  </div>
                </div>
           </div>

           {/* Content Results: Continuous Text View */}
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {job.transcript && (
                    <div className="bg-dark-surface border border-dark-border rounded-3xl p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><DocumentTextIcon className="w-5 h-5 text-brand-500" /> Original Narrative</h3>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-bold">SOURCE</span>
                        </div>
                        <div className="bg-dark-bg/60 rounded-2xl border border-dark-border h-80 overflow-y-auto custom-scrollbar p-6 leading-relaxed text-slate-300 text-sm" dir="auto">
                            {job.transcript.segments.map((s, i) => (
                                <span key={i} className="group relative inline hover:bg-brand-500/10 rounded px-1 transition-colors cursor-help">
                                    {s.text}{' '}
                                    <span className="absolute -top-6 left-0 bg-brand-600 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                      {s.start.toFixed(1)}s - {s.end.toFixed(1)}s
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {job.translation && (
                    <div className="bg-dark-surface border border-dark-border rounded-3xl p-8 shadow-xl border-l-brand-500/40">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><LanguageIcon className="w-5 h-5 text-brand-500" /> Translated Script</h3>
                          <span className="text-[10px] bg-brand-500/20 text-brand-400 px-3 py-1 rounded-full font-bold uppercase">{job.targetLang}</span>
                        </div>
                        <div className="bg-dark-bg/60 rounded-2xl border border-dark-border h-80 overflow-y-auto custom-scrollbar p-6 leading-relaxed text-white text-sm" dir="auto">
                            {job.translation.segments.map((s, i) => (
                                <span key={i} className="group relative inline hover:bg-brand-500/20 rounded px-1 transition-colors cursor-help">
                                    {s.text}{' '}
                                    <span className="absolute -top-6 left-0 bg-brand-600 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                      {s.start.toFixed(1)}s - {s.end.toFixed(1)}s
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
           </div>

           {/* Media Outputs: Dubbed Audio & Final Video */}
           {(job.dubbedAudio || job.finalVideo) && (
                <div className="bg-gradient-to-br from-dark-surface to-slate-900 border border-brand-500/20 rounded-3xl p-8 shadow-2xl space-y-8 animate-in zoom-in-95">
                    
                    {/* Final Video Render */}
                    {job.finalVideo && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <h3 className="text-lg font-black text-white flex items-center gap-2"><VideoCameraIcon className="w-6 h-6 text-brand-500" /> Final Master (Rendered)</h3>
                           <a href={job.finalVideo.videoUrl} download={`dubbed_${job.id}.mp4`} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-black px-4 py-2 rounded-xl transition shadow-lg">
                              <ArrowDownTrayIcon className="w-4 h-4" /> DOWNLOAD MP4
                           </a>
                        </div>
                        <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 shadow-brand-500/10">
                            <video src={job.finalVideo.videoUrl} className="w-full h-full" controls />
                        </div>
                      </div>
                    )}

                    {/* Dubbed Audio Track */}
                    {job.dubbedAudio && (
                      <div className="bg-dark-bg/60 p-6 rounded-3xl border border-dark-border shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                           <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <SpeakerWaveIcon className="w-5 h-5 text-brand-500" /> Isolated Dubbed Track
                           </h4>
                           <a href={job.dubbedAudio.audioUrl} download={`audio_${job.id}.wav`} className="text-brand-400 hover:text-brand-300 text-[9px] font-bold flex items-center gap-1 transition">
                              <ArrowDownTrayIcon className="w-4 h-4" /> DOWNLOAD WAV
                           </a>
                        </div>
                        <audio src={job.dubbedAudio.audioUrl} className="w-full h-12" controls />
                      </div>
                    )}
                </div>
           )}
        </div>
      </main>

      <style>{`
        @keyframes progress-bar-stripes {
          from { background-position: 20px 0; }
          to { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}
