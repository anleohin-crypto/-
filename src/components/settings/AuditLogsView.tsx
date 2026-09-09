import React, { useState } from 'react';
import { History, Shield, Search, Trash2, ArrowUpDown, Filter, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterAction !== 'ALL' && !log.action.includes(filterAction)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchUser = log.user.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      const matchEntity = log.entityType.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q) || false;
      if (!matchUser && !matchAction && !matchEntity && !matchDetails) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">יומן ביקורת ואבטחת מידע (Audit Log)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 font-mono">
              {auditLogs.length} פעולות מתועדות
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            תיעוד מלא ובלתי מחיק של אישורי היעדרויות, שינויי סטטוסים, יצירת משתמשים ועדכוני קיבולת
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי משתמש, פעולה או ישות..."
            className="text-xs border border-slate-200 rounded-lg pr-3 pl-3 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5">מועד (תאריך ושעה)</th>
                <th className="p-3.5">משתמש מבצע</th>
                <th className="p-3.5">פעולה</th>
                <th className="p-3.5">סוג ישות</th>
                <th className="p-3.5">פרטי שינוי</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 font-mono text-slate-500 text-2xs">
                    {new Date(log.timestamp).toLocaleString('he-IL')}
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">
                    {log.user}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-600 text-2xs">
                    {log.entityType} ({log.entityId.substring(0, 10)})
                  </td>
                  <td className="p-3.5 text-slate-600">
                    {log.details || (log.oldValue ? `מ-"${log.oldValue}" ל-"${log.newValue}"` : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
