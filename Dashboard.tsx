import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { JobState } from './types';
import { VideoPipeline } from './services/pipeline';
import { 
  CloudArrowUpIcon, 
  LanguageIcon, 
  CpuChipIcon, 
  VideoCameraIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlayCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

// --- Constants ---
const INITIAL_STATE: JobState = {
  id: '',
  status: 'IDLE',
  progress: 0,
  stepProgress: 0,
  logs: [],
  startTime: null,
  endTime: null,
  originalFile: null,
  fileBase64: null,
  transcript: null,
  translation: null,
  dubbedAudio: null,
  finalVideo: null,
  targetLang: 'fa', 
  voiceId: 'Puck', 
  useLipSync: false,
};

const STEPS = [
  { id: 'UPLOADING', label: 'Upload', icon: CloudArrowUpIcon },
  { id: 'TRANSCRIBING', label: 'Transcribe', icon: CpuChipIcon },
  { id: 'TRANSLATING', label: 'Translate', icon: LanguageIcon },
  { id: 'DUBBING', label: 'Dubbing', icon: PlayCircleIcon },
  { id: 'LIPSYNCING', label: 'Lip Sync', icon: VideoCameraIcon },
  { id: 'COMPLETED', label: 'Done', icon: CheckCircleIcon },
];

export default function Dashboard() {
  const [job, setJob] = useState<JobState>(INITIAL_STATE);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pipelineRef = useRef<VideoPipeline | null>(null);
  
  // Refs for Syncing Audio/Video
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Update timer
  useEffect(() => {
    let interval: any;
    if (job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED' && job.startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - job.startTime!);
      }, 1000);
    } else if (job.status === 'COMPLETED' && job.endTime && job.startTime) {
       setElapsedTime(job.endTime - job.startTime);
    }
    return () => clearInterval(interval);
  }, [job.status, job.startTime, job.endTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateJobState = useCallback((update: Partial<JobState>) => {
    setJob(prev => {
      const newState = { ...prev, ...update };
      if (update.logs) {
          if (Array.isArray(update.logs)) {
             newState.logs = [...prev.logs, ...update.logs];
          }
      }
      return newState;
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setJob(prev => ({ ...prev, originalFile: e.target.files![0], logs: ["فایل انتخاب شد. آماده شروع."] }));
    }
  };

  const startProcessing = () => {
    if (!job.originalFile) return;

    setJob(prev => ({...prev, logs: [], startTime: Date.now(), elapsedTime: 0}));
    pipelineRef.current = new VideoPipeline(updateJobState);
    
    pipelineRef.current.run(job.originalFile, {
      targetLang: job.targetLang,
      voiceId: job.voiceId,
      useLipSync: job.useLipSync
    });
  };

  const downloadAudio = () => {
      if (job.dubbedAudio?.audioUrl) {
          const link = document.createElement('a');
          link.href = job.dubbedAudio.audioUrl;
          link.download = `dubbed_audio_${job.id || 'export'}.wav`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  const getStepStatus = (stepId: string) => {
    const stepIndex = STEPS.findIndex(s => s.id === stepId);
    const currentIndex = STEPS.findIndex(s => s.id === job.status);
    
    if (job.status === 'COMPLETED') return 'complete';
    if (job.status === 'FAILED') return 'error';
    if (currentIndex > stepIndex) return 'complete';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  // Sync Logic: When video plays/pauses/seeks, control audio
  const handleVideoPlay = () => audioRef.current?.play().catch(e => console.error("Audio play failed", e));
  const handleVideoPause = () => audioRef.current?.pause();
  const handleVideoSeek = () => {
      if (videoRef.current && audioRef.current) {
          audioRef.current.currentTime = videoRef.current.currentTime;
      }
  };

  // Ensure Video is always muted so we hear the dubbed audio
  useEffect(() => {
      if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.volume = 0;
      }
  }, [job.finalVideo]);


  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 font-sans selection:bg-brand-500 selection:text-white">
      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Configuration & Inputs */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upload Card */}
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CloudArrowUpIcon className="w-5 h-5 text-brand-500" /> Source Media
            </h2>
            
            <div className="relative group">
              <input 
                type="file" 
                onChange={handleFileChange}
                accept="video/*,audio/*"
                disabled={job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED'}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
                ${job.originalFile ? 'border-brand-500 bg-brand-500/10' : 'border-slate-600 hover:border-slate-400 hover:bg-slate-700/50'}
              `}>
                {job.originalFile ? (
                  <div className="text-brand-400 font-medium truncate">{job.originalFile.name}</div>
                ) : (
                  <div className="text-slate-400">
                    <span className="block text-2xl mb-2">📂</span>
                    <span className="text-sm">برای آپلود کلیک کنید یا فایل را بکشید</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Config Card */}
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CpuChipIcon className="w-5 h-5 text-brand-500" /> پیکربندی
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">زبان مقصد</label>
                <select 
                  value={job.targetLang}
                  onChange={(e) => setJob(prev => ({...prev, targetLang: e.target.value}))}
                  disabled={job.status !== 'IDLE'}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="en">انگلیسی (English)</option>
                  <option value="fa">فارسی (Persian)</option>
                  <option value="es">اسپانیایی (Spanish)</option>
                  <option value="fr">فرانسوی (French)</option>
                  <option value="de">آلمانی (German)</option>
                  <option value="ja">ژاپنی (Japanese)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">مدل صدا (Gemini)</label>
                <select 
                   value={job.voiceId}
                   onChange={(e) => setJob(prev => ({...prev, voiceId: e.target.value}))}
                   disabled={job.status !== 'IDLE'}
                   className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="Puck">Puck (Male)</option>
                  <option value="Charon">Charon (Male)</option>
                  <option value="Kore">Kore (Female)</option>
                  <option value="Fenrir">Fenrir (Male)</option>
                  <option value="Zephyr">Zephyr (Female)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2 opacity-50 cursor-not-allowed">
                <input 
                  type="checkbox" 
                  id="lipsync"
                  checked={job.useLipSync}
                  onChange={(e) => setJob(prev => ({...prev, useLipSync: e.target.checked}))}
                  disabled={true}
                  className="w-4 h-4 rounded border-dark-border bg-dark-bg text-brand-500 focus:ring-brand-500 focus:ring-offset-dark-surface"
                />
                <label htmlFor="lipsync" className="text-sm text-slate-300">هماهنگی لب (Lip Sync) - به زودی</label>
              </div>
            </div>

            <button 
              onClick={startProcessing}
              disabled={!job.originalFile || (job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED')}
              className={`w-full mt-6 py-3 px-4 rounded-lg font-bold text-white shadow-lg transition-all duration-200
                ${!job.originalFile || (job.status !== 'IDLE' && job.status !== 'FAILED' && job.status !== 'COMPLETED')
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 hover:scale-[1.02]'}
              `}
            >
              {job.status === 'IDLE' || job.status === 'COMPLETED' || job.status === 'FAILED' ? 'شروع عملیات دوبله' : 'در حال پردازش...'}
            </button>
          </div>
        </div>

        {/* Right Column: Visualization & Results */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Progress Visualizer */}
          <div className="bg-dark-surface border border-dark-border rounded-xl p-8 shadow-xl">
             <div className="flex justify-between items-center mb-8">
               <h2 className="text-lg font-semibold text-white">وضعیت پردازش</h2>
               <span className="text-sm font-mono text-brand-400 bg-brand-500/10 px-2 py-1 rounded">
                 ID: {job.id || 'SESSION-' + Math.floor(Math.random()*1000)}
               </span>
             </div>

             {/* The Mirror Pipeline Container */}
             <div className="relative py-2 flex flex-col justify-center gap-6">
                
                {/* 1. TOP PIPELINE (ICONS) */}
                <div className="relative w-full h-12">
                   {/* Background Line */}
                   <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -translate-y-1/2 z-0"></div>
                   {/* Progress Line */}
                   <div 
                      className="absolute top-1/2 left-0 h-1 bg-brand-500 -translate-y-1/2 z-0 transition-all duration-500 ease-out"
                      style={{ width: `${job.progress}%` }}
                   ></div>

                   <div className="relative z-10 flex justify-between w-full h-full items-center">
                      {STEPS.map((step) => {
                        const status = getStepStatus(step.id);
                        const isActive = status === 'current';
                        const isComplete = status === 'complete';

                        return (
                          <div key={step.id} className="flex flex-col items-center justify-center w-12">
                             {/* Circle */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-dark-bg z-20
                              ${isActive ? 'border-brand-500 text-brand-500 scale-110 shadow-[0_0_15px_rgba(14,165,233,0.5)]' : 
                                isComplete ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-600 text-slate-600'}
                            `}>
                              <step.icon className="w-6 h-6" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                </div>

                {/* 2. AXIS (TEXT LABELS) */}
                <div className="flex justify-between w-full relative z-20">
                   {STEPS.map((step) => {
                        const status = getStepStatus(step.id);
                        const isActive = status === 'current';
                        const isComplete = status === 'complete';
                        return (
                            <div key={step.id} className="w-12 flex justify-center">
                                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 whitespace-nowrap
                                ${isActive ? 'text-white' : isComplete ? 'text-brand-400' : 'text-slate-600'}
                                `}>{step.label}</span>
                            </div>
                        )
                   })}
                </div>

                {/* 3. BOTTOM PIPELINE (PERCENTAGES) - MIRRORED */}
                <div className="relative w-full h-12">
                    {/* Background Line - Added explicitly for visibility */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 -translate-y-1/2 z-0"></div>
                    
                    <div className="relative z-10 flex justify-between w-full h-full items-center">
                      {STEPS.map((step, index) => {
                        const status = getStepStatus(step.id);
                        const isActive = status === 'current';
                        const isComplete = status === 'complete';
                        const isLastStep = index === STEPS.length - 1;

                        // Calculate display value
                        let content = "0%";
                        let borderColor = "border-slate-700";
                        let textColor = "text-slate-600";
                        let bgFill = "0%";

                        if (isLastStep) {
                            // Timer for the last step
                            content = formatTime(elapsedTime);
                            if (isComplete) {
                                borderColor = "border-green-500";
                                textColor = "text-green-400";
                            } else if (job.status !== 'IDLE') {
                                textColor = "text-brand-400";
                            }
                        } else {
                            if (isComplete) {
                                content = "100%";
                                borderColor = "border-brand-500";
                                textColor = "text-brand-400";
                                bgFill = "100%";
                            } else if (isActive) {
                                content = `${Math.floor(job.stepProgress)}%`;
                                borderColor = "border-brand-500";
                                textColor = "text-white";
                                bgFill = `${job.stepProgress}%`;
                            }
                        }

                        return (
                          <div key={`${step.id}-progress`} className="flex flex-col items-center w-12 bg-dark-bg z-20 rounded-full">
                            {/* Circle */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-dark-bg overflow-hidden relative ${borderColor}`}>
                              {/* Radial Fill Background for Active Step */}
                              {!isLastStep && isActive && (
                                <div 
                                    className="absolute bottom-0 left-0 w-full bg-brand-500/20 transition-all duration-300"
                                    style={{ height: bgFill }}
                                ></div>
                              )}
                              
                              <span className={`text-[10px] font-bold z-10 ${textColor}`}>
                                {content}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                </div>

             </div>

             {/* Logs Console */}
             <div className="mt-8 bg-black/40 rounded-lg p-4 h-32 overflow-y-auto font-mono text-xs border border-dark-border text-right" dir="rtl">
               {job.logs.length === 0 && <span className="text-slate-600 italic">سیستم آماده است. منتظر ورودی...</span>}
               {job.logs.map((log, i) => (
                 <div key={i} className="mb-1 text-slate-300 border-r-2 border-slate-700 pr-2">
                   <span className="text-slate-500 select-none ml-2">[{new Date().toLocaleTimeString()}]</span> {log}
                 </div>
               ))}
               {job.status === 'FAILED' && (
                 <div className="text-red-500 mt-2 font-bold flex items-center gap-2">
                   <ExclamationCircleIcon className="w-4 h-4" /> عملیات ناموفق بود. لطفا لاگ‌ها را بررسی کنید.
                 </div>
               )}
             </div>
          </div>

          {/* Results Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Source Text / Transcript */}
            <div className="bg-dark-surface border border-dark-border rounded-xl p-6 h-64 flex flex-col">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">متن اصلی (Transcript)</h3>
              <div className="flex-1 overflow-y-auto bg-dark-bg rounded-lg p-3 text-sm text-slate-300 leading-relaxed border border-dark-border" dir="auto">
                {job.transcript ? (
                  job.transcript.segments.map((seg, i) => (
                    <div key={i} className="mb-2">
                      <span className="text-indigo-400 text-xs font-bold mr-2">{seg.start}s:</span>
                      {seg.text}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 italic">در انتظار متن...</div>
                )}
              </div>
            </div>

            {/* Translated Text */}
            <div className="bg-dark-surface border border-dark-border rounded-xl p-6 h-64 flex flex-col">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">ترجمه ({job.targetLang.toUpperCase()})</h3>
              <div className="flex-1 overflow-y-auto bg-dark-bg rounded-lg p-3 text-sm text-slate-300 leading-relaxed border border-dark-border dir-rtl">
                {job.translation ? (
                  job.translation.segments.map((seg, i) => (
                    <div key={i} className="mb-2">
                      <span className="text-indigo-400 text-xs font-bold mr-2">{seg.start}s:</span>
                      {seg.text}
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 italic">در انتظار ترجمه...</div>
                )}
              </div>
            </div>
          </div>

          {/* Final Video / Audio Player */}
          {(job.dubbedAudio || job.finalVideo) && (
             <div className="bg-gradient-to-r from-brand-900/40 to-indigo-900/40 border border-brand-500/30 rounded-xl p-6 transition-all duration-500 ease-in-out">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <CheckCircleIcon className="w-6 h-6 text-green-400" /> خروجی آماده شد
               </h3>
               <div className="flex gap-4">
                 {job.finalVideo && (
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 mb-2">ویدیو دوبله شده (پیش‌نمایش با صدای جدید)</p>
                      <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                         <video 
                           ref={videoRef}
                           src={job.finalVideo.videoUrl} 
                           className="w-full h-full object-cover opacity-100" 
                           controls
                           onPlay={handleVideoPlay}
                           onPause={handleVideoPause}
                           onSeeked={handleVideoSeek}
                           // Important: Mute original to hear dubbed audio
                           muted={true}
                         />
                      </div>
                    </div>
                 )}
                 {job.dubbedAudio && (
                   <div className="flex-1 flex flex-col justify-center">
                      <p className="text-xs text-slate-400 mb-2">صدای تولید شده</p>
                      
                      {/* Hidden audio element synced with video */}
                      <audio ref={audioRef} src={job.dubbedAudio.audioUrl} className="hidden" preload="auto" />
                      
                      {/* Visible Player for standalone playback */}
                      <audio controls src={job.dubbedAudio.audioUrl} className="w-full mb-4" />

                      <button 
                        onClick={downloadAudio}
                        className="flex items-center justify-center gap-2 bg-white text-brand-900 font-bold py-3 px-4 rounded hover:bg-gray-100 transition w-full shadow-lg"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" /> دانلود فایل صوتی
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