
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { JobState, Voice, Language } from './types';
import { VideoPipeline } from './services/pipeline';
import { DBService } from './services/db';
import { 
  CloudArrowUpIcon, LanguageIcon, CpuChipIcon, VideoCameraIcon, 
  CheckCircleIcon, PlayCircleIcon, 
  PlayIcon, MusicalNoteIcon, 
  ClockIcon, ArrowDownTrayIcon,
  ClockIcon as ClockIconOutline
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
  const [activeTab, setActiveTab] = useState<'monitor' | 'transcript' | 'translation' | 'downloads'>('monitor');
  
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
    }
    return () => clearInterval(interval);
  }, [job.status, job.startTime]);

  const updateJobState = useCallback((update: Partial<JobState>) => {
    setJob(prev => {
      const newState = { ...prev, ...update };
      if (update.logs) newState.logs = [...prev.logs, ...update.logs];
      return newState;
    });
    if (update.status === 'COMPLETED' || update.status === 'FAILED') loadHistory();
  }, []);

  const isStepDone = (idx: number) => {
    const currentIdx = STEPS.findIndex(s => s.id === job.status);
    return currentIdx > idx || job.status === 'COMPLETED';
  };

  const getProgressWidth = () => {
    const idx = STEPS.findIndex(s => s.id === job.status);
    if (idx < 0) return '0%';
    if (job.status === 'COMPLETED') return '100%';
    return `${(idx / (STEPS.length - 1)) * 100}%`;
  };

  return (
    <div className="min-h-screen bg-dark-bg p-4 lg:p-8">
      <audio ref={durationRef} className="hidden" />
      <main className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8">
        
        {/* Sidebar History */}
        <div className="lg:col-span-3">
           <div className="bg-dark-surface border border-dark-border rounded-3xl p-6 shadow-xl h-full flex flex-col">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 font-sans"><ClockIcon className="w-4 h-4 text-brand-500" /> Recent Activity</h2>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                 {history.map(p => (
                    <div key={p.id} onClick={() => setJob(p)} className={`p-4 rounded-2xl border cursor-pointer transition ${job.id === p.id ? 'bg-brand-500/10 border-brand-500' : 'border-slate-800 bg-dark-bg/40 hover:border-slate-700'}`}>
                        <div className="text-[10px] text-slate-500 mb-1">#{p.id.split('-')[1]}</div>
                        <div className="text-xs font-bold text-white mb-2 truncate">Media Task</div>
                        <div className={`text-[9px] font-black uppercase inline-block px-2 py-0.5 rounded-full ${p.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-brand-500/20 text-brand-400'}`}>{p.status}</div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-9 space-y-6">
           <div className="bg-dark-surface border border-dark-border rounded-3xl p-8 shadow-2xl relative">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Studio Pipeline</h2>
                        <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mt-2"><ClockIconOutline className="w-4 h-4" /> Time: <span className="text-white">{(elapsedTime / 1000).toFixed(0)}s</span></div>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-black text-brand-500">{Math.round(job.progress)}%</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Global Confidence</div>
                    </div>
                </div>

                <div className="w-full h-1 bg-slate-900 rounded-full mb-14 overflow-hidden border border-slate-800">
                    <div className="h-full bg-brand-500 transition-all duration-700 shadow-[0_0_10px_#0ea5e9]" style={{ width: `${job.progress}%` }}></div>
                </div>

                {/* Pipeline Tracker */}
                <div className="relative mb-14 mx-auto w-full max-w-5xl px-7">
                   <div className="absolute top-7 left-[28px] right-[28px] h-[3px] bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 transition-all duration-1000 shadow-[0_0_15px_#0ea5e9]" 
                           style={{ width: getProgressWidth() }}></div>
                   </div>

                   <div className="flex items-center w-full justify-between relative z-10">
                      {STEPS.map((s, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-4">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center border-[4px] bg-dark-surface transition-all duration-500
                                ${job.status === s.id ? 'border-brand-500 scale-125 text-brand-500 shadow-2xl' : 
                                  isStepDone(idx) ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-800 text-slate-700'}
                            `}
                          >
                            <s.icon className="w-6 h-6" />
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${job.status === s.id ? 'text-brand-500' : 'text-slate-600'}`}>{s.label}</span>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Controls */}
                <div className="grid md:grid-cols-2 gap-6 p-6 bg-slate-900/40 rounded-3xl border border-slate-800">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block tracking-widest pl-1">Input Payload</label>
                        <div className="relative border-2 border-dashed border-slate-800 rounded-2xl p-5 text-center hover:border-brand-500/50 transition bg-dark-bg/40">
                          <input type="file" onChange={(e) => {
                             if(e.target.files?.[0]) {
                               const file = e.target.files[0];
                               if(durationRef.current) {
                                  durationRef.current.src = URL.createObjectURL(file);
                                  durationRef.current.onloadedmetadata = () => setJob(prev => ({...prev, originalFile: file, mediaDuration: durationRef.current!.duration}));
                               }
                             }
                          }} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <CloudArrowUpIcon className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                          <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tight">{job.originalFile ? (job.originalFile as any).name : 'Select Media File'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <select 
                            value={job.selectedVoice?.id || 'Puck'} 
                            onChange={(e) => {
                                const v = DEFAULT_VOICES.find(x => x.id === e.target.value);
                                if(v) setJob(prev => ({...prev, selectedVoice: v}));
                            }}
                            className="w-full bg-dark-bg border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none"
                        >
                            {DEFAULT_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <button 
                            onClick={() => { if(job.originalFile) { pipelineRef.current = new VideoPipeline(updateJobState); pipelineRef.current.run(job.originalFile, { targetLang: 'en', voiceId: job.selectedVoice?.id || 'Puck', selectedSteps: job.selectedSteps, mediaDuration: job.mediaDuration }); } }} 
                            disabled={!job.originalFile || job.status !== 'IDLE'} 
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-xl shadow-xl transition active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-2 text-lg"
                        >
                            <PlayIcon className="w-5 h-5" /> INITIATE DEPLOYMENT
                        </button>
                    </div>
                </div>

                <div className="mt-8 bg-black/40 rounded-2xl border border-slate-800 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Telemetry Stream</span>
                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
                  </div>
                  <div className="h-44 overflow-y-auto font-mono text-[10px] space-y-2 text-slate-400">
                      {job.logs.map((log, i) => (
                        <div key={i} className="flex gap-4 border-l border-brand-500/20 pl-4 py-0.5">
                          <span className="text-brand-500 opacity-60">[{log.time}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                      {job.logs.length === 0 && <div className="text-slate-800 italic">Engine ready for instructions...</div>}
                  </div>
                </div>
           </div>

           {/* Results View */}
           {(job.transcript || job.translation || job.dubbedAudio || job.finalVideo) && (
             <div className="bg-dark-surface border border-dark-border rounded-3xl overflow-hidden shadow-2xl">
                <div className="flex border-b border-dark-border bg-slate-900/40">
                    {['monitor', 'transcript', 'translation', 'downloads'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition ${activeTab === t ? 'text-brand-500 bg-dark-surface' : 'text-slate-500 hover:text-white'}`}>
                           {t}
                        </button>
                    ))}
                </div>
                <div className="p-8">
                    {activeTab === 'monitor' && (
                        <div className="space-y-6">
                           {job.finalVideo ? (
                               <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative group">
                                   <video src={job.finalVideo.videoUrl} controls className="w-full h-full" />
                                   <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition">
                                       <a href={job.finalVideo.videoUrl} download="dubbed.mp4" className="bg-brand-500 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-xl">
                                          <ArrowDownTrayIcon className="w-4 h-4" /> SAVE MASTER
                                       </a>
                                   </div>
                               </div>
                           ) : job.dubbedAudio ? (
                               <div className="bg-slate-900/50 p-10 rounded-3xl border border-slate-800 text-center">
                                   <MusicalNoteIcon className="w-12 h-12 text-brand-500 mx-auto mb-4 opacity-50" />
                                   <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Dubbed Track Ready</h3>
                                   <audio src={job.dubbedAudio.audioUrl} controls className="w-full max-w-lg mx-auto" />
                               </div>
                           ) : <div className="aspect-video bg-slate-900/20 rounded-3xl flex items-center justify-center italic text-slate-700">Awaiting Render completion...</div>}
                        </div>
                    )}

                    {(activeTab === 'transcript' || activeTab === 'translation') && (
                        <div className="bg-dark-bg/60 p-6 rounded-2xl border border-slate-800 max-h-96 overflow-y-auto leading-loose text-sm text-slate-300" dir={activeTab === 'transcript' ? 'rtl' : 'ltr'}>
                           {activeTab === 'transcript' ? 
                             (job.transcript?.segments.map((s, i) => <span key={i} className="hover:text-brand-400 transition cursor-help mx-1 border-b border-white/5 pb-1" title={`${s.start}s - ${s.end}s`}>{s.text}</span>)) : 
                             (job.translation?.segments.map((s, i) => <span key={i} className="hover:text-brand-400 transition cursor-help mx-1 border-b border-white/5 pb-1" title={`${s.start}s - ${s.end}s`}>{s.text}</span>))
                           }
                           {(!job.transcript?.segments && activeTab === 'transcript') && <p className="italic text-slate-600">No segments recovered from STT engine.</p>}
                           {(!job.translation?.segments && activeTab === 'translation') && <p className="italic text-slate-600">No segments recovered from Translation engine.</p>}
                        </div>
                    )}

                    {activeTab === 'downloads' && (
                        <div className="grid sm:grid-cols-2 gap-4">
                            <ArtifactCard title="Dubbed Audio" icon={<MusicalNoteIcon className="w-5 h-5"/>} ready={!!job.dubbedAudio} onClick={() => { if(job.dubbedAudio) { const a = document.createElement('a'); a.href = job.dubbedAudio.audioUrl; a.download='audio.wav'; a.click(); } }} />
                            <ArtifactCard title="Master Video" icon={<VideoCameraIcon className="w-5 h-5"/>} ready={!!job.finalVideo} onClick={() => { if(job.finalVideo) { const a = document.createElement('a'); a.href = job.finalVideo.videoUrl; a.download='video.mp4'; a.click(); } }} />
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

function ArtifactCard({ title, icon, ready, onClick }: any) {
    return (
        <button disabled={!ready} onClick={onClick} className={`p-6 rounded-2xl border text-left transition flex items-center justify-between ${ready ? 'bg-slate-800 border-slate-700 hover:border-brand-500 shadow-lg' : 'opacity-20 bg-dark-bg border-slate-800'}`}>
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">{icon}</div>
                <span className="text-xs font-bold text-white uppercase tracking-widest">{title}</span>
            </div>
            <ArrowDownTrayIcon className="w-4 h-4 text-slate-500" />
        </button>
    );
}
