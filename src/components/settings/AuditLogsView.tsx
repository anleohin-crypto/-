import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Filter, History, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('ALL');
  const [action, setAction] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const entities = useMemo(() => [...new Set(auditLogs.map(l => l.entityType))].sort(), [auditLogs]);
  const actions = useMemo(() => [...new Set(auditLogs.map(l => l.action))].sort(), [auditLogs]);
  const filtered = useMemo(() => auditLogs.filter(log => {
    if (entity !== 'ALL' && log.entityType !== entity) return false;
    if (action !== 'ALL' && log.action !== action) return false;
    const d = log.timestamp.slice(0,10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [log.user, log.action, log.entityType, log.entityId, log.entityLabel, log.fieldName, log.details, log.oldValue, log.newValue, ...(log.changes || []).flatMap(c => [c.fieldName,c.fieldLabel,String(c.oldValue??''),String(c.newValue??'')])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [auditLogs, entity, action, fromDate, toDate, search]);

  return <div className="space-y-5 text-right" dir="rtl">
    <div className="bg-white p-5 rounded-2xl border border-slate-200">
      <div className="flex items-center gap-3"><History className="w-6 h-6 text-blue-600"/><h1 className="text-xl font-bold">יומן ביקורת מפורט</h1><span className="px-2 py-0.5 rounded-full text-xs bg-slate-100">{auditLogs.length} פעולות</span></div>
      <p className="text-xs text-slate-500 mt-1">מי שינה, מה השתנה, הערך לפני/אחרי, מקור הפעולה והקשר עסקי.</p>
    </div>

    <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
      <div className="relative md:col-span-1"><Search className="w-4 h-4 absolute right-2 top-2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="חיפוש חופשי..." className="w-full border rounded-lg py-1.5 pr-8 pl-2"/></div>
      <select value={entity} onChange={e=>setEntity(e.target.value)} className="border rounded-lg p-1.5"><option value="ALL">כל הישויות</option>{entities.map(x=><option key={x}>{x}</option>)}</select>
      <select value={action} onChange={e=>setAction(e.target.value)} className="border rounded-lg p-1.5"><option value="ALL">כל הפעולות</option>{actions.map(x=><option key={x}>{x}</option>)}</select>
      <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="border rounded-lg p-1.5" title="מתאריך"/>
      <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="border rounded-lg p-1.5" title="עד תאריך"/>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-3">מועד</th><th className="p-3">משתמש</th><th className="p-3">פעולה</th><th className="p-3">ישות</th><th className="p-3">תקציר שינוי</th><th className="p-3">מקור</th><th className="p-3"></th></tr></thead>
      <tbody className="divide-y">{filtered.map(log => {
        const hasDetails = Boolean(log.details || log.changes?.length || log.oldValue !== null || log.newValue !== null);
        return <React.Fragment key={log.id}><tr className="hover:bg-slate-50"><td className="p-3 font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleString('he-IL')}</td><td className="p-3 font-semibold">{log.user}</td><td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800">{log.action}</span></td><td className="p-3"><div className="font-semibold">{log.entityLabel || log.entityType}</div><div className="text-[10px] text-slate-400 font-mono">{log.entityType} · {log.entityId}</div></td><td className="p-3 max-w-md">{log.details || (log.oldValue !== null || log.newValue !== null ? `${log.fieldName}: ${String(log.oldValue ?? '—')} → ${String(log.newValue ?? '—')}` : '—')}</td><td className="p-3">{log.source || 'ui'}</td><td className="p-3">{hasDetails && <button onClick={()=>setExpanded(expanded===log.id?null:log.id)} className="p-1 rounded hover:bg-slate-100">{expanded===log.id?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button>}</td></tr>
        {expanded===log.id && <tr className="bg-slate-50/70"><td colSpan={7} className="p-4"><div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><div><div className="font-bold mb-1">פרטים מלאים</div><div className="text-slate-600">{log.details || 'ללא תיאור נוסף'}</div><div className="mt-2 text-[10px] font-mono">Field: {log.fieldName} | ID: {log.entityId}</div></div><div><div className="font-bold mb-1">שינויים בשדות</div>{log.changes?.length ? <div className="space-y-1">{log.changes.map((c,i)=><div key={i} className="bg-white border rounded p-2"><strong>{c.fieldLabel || c.fieldName}</strong>: <span className="text-rose-700">{String(c.oldValue ?? '—')}</span> → <span className="text-emerald-700">{String(c.newValue ?? '—')}</span></div>)}</div> : <div className="bg-white border rounded p-2">{String(log.oldValue ?? '—')} → {String(log.newValue ?? '—')}</div>}</div></div></td></tr>}</React.Fragment>;
      })}</tbody></table></div>
      {filtered.length===0 && <div className="p-10 text-center text-sm text-slate-500">לא נמצאו פעולות בהתאם לסינון.</div>}
    </div>
  </div>;
};
