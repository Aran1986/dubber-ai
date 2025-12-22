
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { JobState, Voice, Language } from './types';
import { VideoPipeline } from './services/pipeline';
import { DBService } from './services/db';
import { 
  CloudArrowUpIcon, LanguageIcon, CpuChipIcon, VideoCameraIcon, 
  CheckCircleIcon, PlayCircleIcon, 
  PlayIcon, MusicalNoteIcon, 
  ClockIcon, ArrowDownTrayIcon,
  DocumentTextIcon, ChatBubbleBottomCenterTextIcon,
  ClockIcon as ClockIconOutline,
  ChevronRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', tier: 'free' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', tier: 'free' },
];

const DEFAULT_VOICES: Voice[] = [
  { id: 'Puck', name: 'Puck (Default)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 85, count: 1200 } } },
  { id: 'Charon', name: 'Charon (Deep)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 82, count: 800 } } },
  { id: 'Kore', name: 'Kore (Female)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 90, count: 1500 } } },
  { id: 'Fenrir', name: 'Fenrir (Macho)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 78, count: 600 } } },
  { id: 'Zephyr', name: 'Zephyr (Warm)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { fa: { score: 88, count: 200 } } },
  { id: 'Aoede', name: 'Aoede (Clear)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 92, count: 400 } } },
  { id: 'Helios', name: 'Helios (Bright)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 85, count: 300 } } },
  { id: 'Cassiopeia', name: 'Cassiopeia (Soft)', category: 'Free', isFree: true, supportedLanguages: LANGUAGES.map(l => l.code), languageRatings: { en: { score: 89, count: 500 } } },
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
  const [history, setHistory] = useState<JobState[]>([]);
  const [activeResultTab, setActiveResultTab] = useState<'video' | 'transcript' | 'translation'>('video');
  
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
        <div className="lg:col-span-3">
           <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl h-full flex flex-col min-h-[500px]">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><ClockIcon className="w-5 h-5 text-brand-500" /> Recent Activity</h2>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                 {history.map(p => (
                    <div key={p.id} onClick={() => setJob(p)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${job.id === p.id ? 'bg-brand-500/10 border-brand-500 shadow-lg' : 'border-slate-800 bg-dark-bg/40 hover:border-slate-700'}`}>
                        <div className="text-[9px] text-slate-500 mb-1 font-mono tracking-tighter">#{p.id.split('-')[1]}</div>
                        <div className="text-xs font-bold text-white mb-2 truncate">{p.originalFile ? (p.originalFile as any).name : 'Media Task'}</div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${p.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-brand-500/20 text-brand-400'}`}>{p.status}</span>
                          <span className="text-[9px] text-slate-600">{formatTime((p.endTime || 0) - (p.startTime || 0))}</span>
                        </div>
                    </div>
                 ))}
              </div>
              <button onClick={() => setJob(INITIAL_STATE)} className="mt-6 w-full py-4 bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/30 rounded-2xl text-xs font-black text-brand-400 uppercase transition-all">Create New Task</button>
           </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-9 space-y-6">
           
           {/* Progress Dashboard */}
           <div className="bg-dark-surface border border-dark-border rounded-3xl p-8 shadow-2xl relative">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Studio Pipeline</h2>
                        <div className="flex items-center gap-6 mt-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><MusicalNoteIcon className="w-4 h-4" /> Media Length: <span className="text-brand-400">{job.mediaDuration.toFixed(1)}s</span></div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><ClockIconOutline className="w-4 h-4" /> Time Elapsed: <span className="text-white">{formatTime(elapsedTime)}</span></div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-black text-brand-500 drop-shadow-[0_0_15px_rgba(14,165,233,0.4)]">{Math.round(job.progress)}%</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Global Progress</div>
                    </div>
                </div>

                <div className="mb-14">
                    <div className="w-full h-5 bg-slate-900 rounded-full p-1 border border-slate-800 shadow-inner">
                        <div className="h-full bg-gradient-to-r from-brand-600 to-indigo-600 rounded-full transition-all duration-1000 relative" style={{ width: `${job.progress}%` }}>
                           <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%)] bg-[length:20px_20px] animate-[progress-bar-stripes_1s_linear_infinite]"></div>
                        </div>
                    </div>
                </div>

                <div className="relative mb-14 px-8">
                   <div className="absolute top-7 left-14 right-14 h-[3px] bg-white/40 rounded-full -z-0 shadow-inner"></div>
                   <div className="absolute top-7 left-14 h-[3px] bg-brand-500 transition-all duration-1000 -z-0 shadow-[0_0_15px_rgba(14,165,233,0.6)]" style={{ width: `${Math.max(0, (STEPS.findIndex(s => s.id === job.status)) * (100 / (STEPS.length - 1)))}%` }}></div>

                   <div className="flex items-center w-full justify-between relative z-10">
                      {STEPS.map((s, idx) => (
                        <div key={s.id} className="flex flex-col items-center gap-4">
                          <button 
                            disabled={s.mandatory || job.status !== 'IDLE'} 
                            onClick={() => handleStepClick(s.id)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center border-[4px] bg-dark-surface transition-all duration-500 relative
                                ${isActive(idx) ? 'border-brand-500 scale-125 shadow-2xl text-brand-500 opacity-100' : 
                                  isDone(idx) ? 'border-brand-500 bg-brand-500 text-white shadow-brand-500/20 opacity-100' : 
                                  isStepSelected(s.id) ? 'border-slate-500 text-slate-400 opacity-80' : 'border-slate-800 text-slate-700 opacity-60'}
                            `}
                          >
                            <s.icon className="w-6 h-6" />
                          </button>
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive(idx) ? 'text-brand-400' : isDone(idx) ? 'text-slate-300' : 'text-slate-600'}`}>{s.label}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-900/40 rounded-[2rem] border border-slate-800 shadow-inner">
                    <div className="flex flex-col justify-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest pl-1">Media Payload</label>
                        <div className="relative group border-2 border-dashed border-slate-800 rounded-2xl p-5 text-center hover:border-brand-500/50 transition-all cursor-pointer bg-dark-bg/40">
                          <input type="file" onChange={(e) => {
                             if(e.target.files?.[0]) {
                               const file = e.target.files[0];
                               if(durationRef.current) {
                                  durationRef.current.src = URL.createObjectURL(file);
                                  durationRef.current.onloadedmetadata = () => {
                                    setJob(prev => ({...prev, originalFile: file, mediaDuration: durationRef.current!.duration}));
                                  };
                               }
                             }
                          }} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <CloudArrowUpIcon className="w-8 h-8 mx-auto text-slate-700 group-hover:text-brand-500 mb-2 transition-colors" />
                          <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tight">{job.originalFile ? (job.originalFile as any).name : 'Drop Media Here'}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest pl-1">Select Voice Actor</label>
                            <select 
                                value={job.selectedVoice?.id || 'Puck'} 
                                onChange={(e) => {
                                    const v = DEFAULT_VOICES.find(x => x.id === e.target.value);
                                    if(v) setJob(prev => ({...prev, selectedVoice: v}));
                                }}
                                className="w-full bg-dark-bg border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none"
                            >
                                {DEFAULT_VOICES.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={() => { if(job.originalFile) { pipelineRef.current = new VideoPipeline(updateJobState); pipelineRef.current.run(job.originalFile, { targetLang: job.targetLang, voiceId: job.selectedVoice?.id || 'Puck', selectedSteps: job.selectedSteps, mediaDuration: job.mediaDuration }); } }} 
                            disabled={!job.originalFile || job.status !== 'IDLE'} 
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-5 rounded-2xl shadow-2xl transition active:scale-[0.97] disabled:opacity-30 flex items-center justify-center gap-4 text-xl tracking-tighter"
                        >
                            <PlayIcon className="w-7 h-7" /> INITIATE DEPLOYMENT
                        </button>
                    </div>
                </div>

                <div className="mt-8 bg-black/60 rounded-2xl border border-slate-800 p-6 shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-600 uppercase">Deployment Telemetry</span>
                    <span className="text-[9px] text-brand-500/60 font-mono animate-pulse">SYSTEM_ACTIVE</span>
                  </div>
                  <div className="h-44 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-2">
                      {job.logs.map((log, i) => (
                        <div key={i} className="flex gap-4 border-l-2 border-brand-500/20 pl-4 py-1 animate-in slide-in-from-left-4">
                          <span className="text-brand-500 font-bold opacity-60">[{log.time}]</span>
                          <span className="text-slate-400 leading-relaxed">{log.message}</span>
                        </div>
                      ))}
                      {job.logs.length === 0 && <div className="text-slate-800 italic">Waiting for process initiation...</div>}
                  </div>
                </div>
           </div>

           {/* Results Explorer */}
           {(job.transcript || job.translation || job.finalVideo || job.dubbedAudio) && (
             <div className="bg-dark-surface border border-dark-border rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="flex border-b border-dark-border bg-slate-900/50">
                    <button onClick={() => setActiveResultTab('video')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition ${activeResultTab === 'video' ? 'text-brand-500 bg-dark-surface' : 'text-slate-500 hover:text-white'}`}>
                        <PlayCircleIcon className="w-5 h-5" /> Output Monitor
                    </button>
                    <button onClick={() => setActiveResultTab('transcript')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition ${activeResultTab === 'transcript' ? 'text-brand-500 bg-dark-surface' : 'text-slate-500 hover:text-white'}`}>
                        <DocumentTextIcon className="w-5 h-5" /> Transcript
                    </button>
                    <button onClick={() => setActiveResultTab('translation')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition ${activeResultTab === 'translation' ? 'text-brand-500 bg-dark-surface' : 'text-slate-500 hover:text-white'}`}>
                        <ChatBubbleBottomCenterTextIcon className="w-5 h-5" /> Translation
                    </button>
                </div>

                <div className="p-8">
                    {activeResultTab === 'video' && (
                        <div className="space-y-6">
                            {job.finalVideo ? (
                                <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group relative">
                                    <video src={job.finalVideo.videoUrl} controls className="w-full h-full" />
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a href={job.finalVideo.videoUrl} download="dubbed_video.mp4" className="bg-brand-500 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2">
                                            <ArrowDownTrayIcon className="w-5 h-5" /> DOWNLOAD MASTER
                                        </a>
                                    </div>
                                </div>
                            ) : job.dubbedAudio ? (
                                <div className="bg-slate-900/50 p-10 rounded-3xl border border-slate-800 text-center">
                                    <MusicalNoteIcon className="w-16 h-16 text-brand-500 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tighter">Dubbed Track Ready</h3>
                                    <audio src={job.dubbedAudio.audioUrl} controls className="w-full max-w-xl mx-auto mb-6" />
                                    <p className="text-xs text-slate-500 uppercase font-black">Waiting for final muxing to complete...</p>
                                </div>
                            ) : (
                                <div className="aspect-video bg-slate-900/50 rounded-3xl flex items-center justify-center border border-slate-800 animate-pulse">
                                    <div className="text-center">
                                        <SparklesIcon className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Rendering Sequence...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeResultTab === 'transcript' && (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                            {job.transcript?.segments.map((seg, i) => (
                                <div key={i} className="flex gap-6 p-5 bg-dark-bg/40 rounded-2xl border border-slate-800/50 group hover:border-brand-500/30 transition-all">
                                    <div className="text-[10px] font-mono text-brand-500/60 w-16 pt-1">[{seg.start.toFixed(1)}s]</div>
                                    <div className="flex-1 text-sm text-slate-300 leading-relaxed">{seg.text}</div>
                                </div>
                            )) || <div className="text-center py-20 text-slate-700 font-black uppercase tracking-widest italic">Transcript not available yet</div>}
                        </div>
                    )}

                    {activeResultTab === 'translation' && (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                            {job.translation?.segments.map((seg, i) => (
                                <div key={i} className="flex gap-6 p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 group hover:border-indigo-500/30 transition-all">
                                    <div className="text-[10px] font-mono text-indigo-400/60 w-16 pt-1">[{seg.start.toFixed(1)}s]</div>
                                    <div className="flex-1 text-sm text-slate-200 leading-relaxed font-medium" dir={job.targetLang === 'fa' ? 'rtl' : 'ltr'}>{seg.text}</div>
                                </div>
                            )) || <div className="text-center py-20 text-slate-700 font-black uppercase tracking-widest italic">Translation not available yet</div>}
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
