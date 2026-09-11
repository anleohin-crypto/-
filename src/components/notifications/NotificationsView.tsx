import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Trash2,
  CheckCheck,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationItem, NotificationSeverity } from '../../types';

export const NotificationsView: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    clearAllNotifications,
    restoreDismissedNotifications,
    setCurrentTab,
  } = useApp();

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const severityOf = (n: NotificationItem): NotificationSeverity => {
    if (n.severity) return n.severity;
    if (n.type === 'danger') return 'critical';
    if (n.type === 'warning') return 'warning';
    return 'info';
  };

  const filteredNotifications = notifications.filter((n) => {
    if (n.dismissed) return false;
    if (severityFilter !== 'all' && severityOf(n) !== severityFilter) return false;
    if (unreadOnly && n.isRead) return false;
    return true;
  });

  const getSeverityIcon = (sev: NotificationSeverity) => {
    switch (sev) {
      case 'critical': return <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      default: return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getSeverityBadge = (sev: NotificationSeverity) => {
    switch (sev) {
      case 'critical': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const openNotification = (notif: NotificationItem) => {
    markNotificationRead(notif.id);
    if (notif.linkTo) {
      setCurrentTab(notif.linkTo as any);
      return;
    }
    if (notif.targetType === 'task') setCurrentTab('tasks');
    else if (notif.targetType === 'employee') setCurrentTab('employees');
    else if (notif.targetType === 'absence') setCurrentTab('absences');
    else if (notif.targetType === 'capacity') setCurrentTab('capacity');
  };

  return (
    <div id="notifications-view" className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600"><Bell className="w-5 h-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">מרכז התראות וסיכונים</h2>
            <p className="text-xs text-slate-500">התראות אוטומטיות על דדליינים, עומסי יתר, שעות סרק ומשימות מעוכבות</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAllNotificationsRead} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            <CheckCheck className="w-4 h-4 text-blue-600" /><span>סמן הכל כנקרא</span>
          </button>
          <button onClick={clearAllNotifications} className="flex items-center gap-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            <Trash2 className="w-4 h-4" /><span>נקה התראות</span>
          </button>
          <button onClick={restoreDismissedNotifications} className="flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors" title="שחזור התראות שנוקו (Undo)">
            <span>בטל ניקוי</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" /><span className="font-semibold text-slate-700">סינון:</span>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700">
            <option value="all">כל רמות החומרה</option><option value="critical">קריטי בלבד</option><option value="warning">אזהרות בלבד</option><option value="info">מידע בלבד</option>
          </select>
        </div>
        <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span>הצג רק התראות שלא נקראו</span>
        </label>
      </div>

      <div className="space-y-2.5">
        {filteredNotifications.map((notif) => {
          const severity = severityOf(notif);
          return (
            <div key={notif.id} onClick={() => openNotification(notif)} className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${notif.isRead ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-blue-50/40 border-blue-200 hover:border-blue-400 shadow-xs'}`}>
              <div className="flex items-start gap-3">
                {getSeverityIcon(severity)}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-sm text-slate-900">{notif.title}</h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getSeverityBadge(severity)}`}>{severity === 'critical' ? 'קריטי' : severity === 'warning' ? 'אזהרה' : 'מידע'}</span>
                    {!notif.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">{new Date(notif.createdAt).toLocaleString('he-IL')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 pt-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="הסר התראה"
                  aria-label="הסר התראה"
                ><Trash2 className="w-4 h-4" /></button>
                {(notif.linkTo || notif.targetType) && <div className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"><span>צפה עכשיו</span><ArrowUpRight className="w-4 h-4" /></div>}
              </div>
            </div>
          );
        })}
        {filteredNotifications.length === 0 && (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" /><h4 className="font-bold text-slate-800 text-sm">אין התראות כרגע</h4><p className="text-xs text-slate-500">כל המשימות והקיבולות נמצאות בטווח התקין.</p>
          </div>
        )}
      </div>
    </div>
  );
};
