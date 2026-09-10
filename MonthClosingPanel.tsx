import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MonthClosingPanel: React.FC = () => {
  const { settings, updateSettings, addToast } = useApp();
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const closed = settings.closedMonths || [];
  const isClosed = closed.includes(month);
  const toggle = () => {
    const next = isClosed ? closed.filter(m=>m!==month) : [...new Set([...closed,month])].sort();
    updateSettings({ closedMonths: next });
    addToast(isClosed ? `חודש ${month} נפתח מחדש לשינויים` : `חודש ${month} נסגר לשינויים`);
  };
  return <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
    <div><div className="font-bold text-sm flex items-center gap-2"><Lock className="w-4 h-4 text-slate-600"/>נעילת חודשים היסטוריים</div><div className="text-[11px] text-slate-500">חודש סגור מוגן משינויים במשימות חדשות/קיימות עד לפתיחה יזומה.</div></div>
    <div className="flex items-center gap-2"><input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="border rounded-lg p-2 text-xs"/><button onClick={toggle} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${isClosed?'bg-emerald-50 text-emerald-700':'bg-slate-900 text-white'}`}>{isClosed?<><Unlock className="w-4 h-4"/>פתח חודש</>:<><Lock className="w-4 h-4"/>סגור חודש</>}</button></div>
  </div>;
};
