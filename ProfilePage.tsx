import React, { useState } from 'react';
import { User, JobRecord } from './types';
import { 
  UserCircleIcon, 
  CreditCardIcon, 
  ClockIcon, 
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface Props {
  user: User;
}

// Mock Data for History (Since we don't have a backend DB yet)
const MOCK_HISTORY: JobRecord[] = [
  {
    id: 'JOB-1024',
    fileName: 'Tutorial_Intro.mp4',
    date: '2025-05-10 14:30',
    status: 'COMPLETED',
    durationSec: 185,
    totalCost: 45,
    targetLang: 'English',
    downloadUrl: '#',
    tokenBreakdown: [
      { service: 'STT', cost: 10, details: '3m 05s Transcription' },
      { service: 'TRANSLATION', cost: 5, details: 'Gemini Flash Translation' },
      { service: 'TTS', cost: 30, details: 'Neural TTS Generation' }
    ]
  },
  {
    id: 'JOB-1023',
    fileName: 'Meeting_Recording.mp3',
    date: '2025-05-09 09:15',
    status: 'COMPLETED',
    durationSec: 600,
    totalCost: 120,
    targetLang: 'Spanish',
    downloadUrl: '#',
    tokenBreakdown: [
      { service: 'STT', cost: 40, details: '10m Audio Transcription' },
      { service: 'TRANSLATION', cost: 20, details: 'Translation to Spanish' },
      { service: 'TTS', cost: 60, details: 'Standard Voice Generation' }
    ]
  },
  {
    id: 'JOB-1022',
    fileName: 'Failed_Upload.mov',
    date: '2025-05-08 18:00',
    status: 'FAILED',
    durationSec: 0,
    totalCost: 0,
    targetLang: 'German',
    tokenBreakdown: []
  }
];

export default function ProfilePage({ user }: Props) {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedJob(expandedJob === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'FAILED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-slate-200 py-10 px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 1. Header & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Info Card */}
          <div className="md:col-span-2 bg-gradient-to-r from-dark-surface to-slate-800 border border-dark-border rounded-2xl p-6 flex items-center gap-6 shadow-xl">
             <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full rounded-full" /> : user.name.charAt(0).toUpperCase()}
             </div>
             <div>
               <h1 className="text-2xl font-bold text-white">{user.name}</h1>
               <p className="text-slate-400 text-sm mb-2">{user.email}</p>
               <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-brand-500/20 text-brand-400 border border-brand-500/30">
                 {user.plan} PLAN
               </span>
             </div>
          </div>

          {/* Credits Card */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <CreditCardIcon className="w-24 h-24 text-brand-500" />
            </div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">موجودی اعتبار (Credits)</p>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-bold text-white">{user.credits.toLocaleString()}</span>
               <span className="text-sm text-slate-500">توکن</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 mt-4 rounded-full overflow-hidden">
               {/* Just a visual progress bar assuming 10000 is max for example */}
               <div className="h-full bg-green-500 w-[60%]"></div>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-right">تمدید بعدی: ۱۴۰۳/۰۴/۰۱</p>
          </div>
        </div>

        {/* 2. Job History */}
        <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden shadow-xl">
           <div className="p-6 border-b border-dark-border flex justify-between items-center">
             <h2 className="text-lg font-bold text-white flex items-center gap-2">
               <ClockIcon className="w-5 h-5 text-brand-500" /> تاریخچه پردازش‌ها
             </h2>
             <span className="text-xs text-slate-500">نمایش ۱۰ مورد اخیر</span>
           </div>

           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                 <tr>
                   <th className="px-6 py-4">نام فایل / شناسه</th>
                   <th className="px-6 py-4">تاریخ</th>
                   <th className="px-6 py-4">مدت زمان</th>
                   <th className="px-6 py-4">هزینه (توکن)</th>
                   <th className="px-6 py-4">وضعیت</th>
                   <th className="px-6 py-4 text-right">عملیات</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-dark-border">
                 {MOCK_HISTORY.map((job) => (
                   <React.Fragment key={job.id}>
                     <tr className="hover:bg-slate-800/30 transition-colors">
                       <td className="px-6 py-4">
                         <div className="font-medium text-white">{job.fileName}</div>
                         <div className="text-xs text-slate-500 font-mono">{job.id}</div>
                       </td>
                       <td className="px-6 py-4 text-slate-400">{job.date}</td>
                       <td className="px-6 py-4 text-slate-300">
                         {job.durationSec > 0 ? `${Math.floor(job.durationSec / 60)}m ${job.durationSec % 60}s` : '-'}
                       </td>
                       <td className="px-6 py-4 font-bold text-brand-400">
                         {job.totalCost > 0 ? job.totalCost : '-'}
                       </td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded-md text-xs font-bold border ${getStatusColor(job.status)}`}>
                           {job.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                         <button 
                           onClick={() => toggleExpand(job.id)}
                           className="text-slate-400 hover:text-white transition p-1"
                           title="مشاهده جزئیات"
                         >
                           {expandedJob === job.id ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                         </button>
                         {job.status === 'COMPLETED' && (
                            <button className="text-brand-400 hover:text-brand-300 transition p-1 ml-2" title="دانلود">
                              <ArrowDownTrayIcon className="w-5 h-5"/>
                            </button>
                         )}
                       </td>
                     </tr>
                     
                     {/* Expanded Detail Row */}
                     {expandedJob === job.id && (
                       <tr className="bg-slate-800/20 animate-in fade-in duration-200">
                         <td colSpan={6} className="px-6 py-4">
                           <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                               <DocumentTextIcon className="w-4 h-4" /> ریز مصرف توکن
                             </h4>
                             {job.tokenBreakdown.length > 0 ? (
                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  {job.tokenBreakdown.map((item, idx) => (
                                    <div key={idx} className="bg-dark-surface p-3 rounded border border-dark-border flex justify-between items-center">
                                      <div>
                                        <div className="text-xs font-bold text-slate-300">{item.service}</div>
                                        <div className="text-[10px] text-slate-500">{item.details}</div>
                                      </div>
                                      <div className="text-sm font-mono text-red-400">-{item.cost}</div>
                                    </div>
                                  ))}
                                  <div className="sm:col-span-3 border-t border-dark-border mt-2 pt-2 flex justify-end gap-2 items-center">
                                     <span className="text-sm text-slate-400">مجموع کسر شده:</span>
                                     <span className="text-lg font-bold text-white">{job.totalCost} Credits</span>
                                  </div>
                               </div>
                             ) : (
                               <p className="text-sm text-slate-500 italic">جزئیاتی برای نمایش وجود ندارد.</p>
                             )}
                           </div>
                         </td>
                       </tr>
                     )}
                   </React.Fragment>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
}