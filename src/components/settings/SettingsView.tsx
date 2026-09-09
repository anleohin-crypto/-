import React, { useState } from 'react';
import {
  Shield,
  History,
  Save,
  RotateCcw,
  Sliders,
  Clock,
  CalendarCheck2,
  CheckCircle2,
  Lock,
  User,
  AlertCircle,
  Building2,
  CalendarRange,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StorageService } from '../../services/storage';
import { UserRole } from '../../types';
import { WorkHoursAndStandardSettings } from './WorkHoursAndStandardSettings';
import { ShortenedDaysManager } from './ShortenedDaysManager';
import { MonthlyStandardsManager } from './MonthlyStandardsManager';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, addToast, resetDatabase } = useApp();

  const [activeTab, setActiveTab] = useState<
    'work_hours' | 'monthly_standards' | 'shortened_days' | 'thresholds' | 'security_audit'
  >('work_hours');

  // Capacity & threshold state
  const [normalMin, setNormalMin] = useState(settings.normalUtilizationMin || 75);
  const [normalMax, setNormalMax] = useState(settings.normalUtilizationMax || 90);
  const [overThreshold, setOverThreshold] = useState(settings.overAllocationThreshold || 100);
  const [deadlineDays, setDeadlineDays] = useState(settings.upcomingDeadlineDays || 7);
  const [activeRole, setActiveRole] = useState<UserRole>(settings.activeUserRole || 'Team Manager');

  const [auditLogs, setAuditLogs] = useState(() => StorageService.getAuditLogs());

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      normalUtilizationMin: normalMin,
      underAllocationThreshold: normalMin,
      normalUtilizationMax: normalMax,
      highUtilizationThreshold: normalMax,
      overAllocationThreshold: overThreshold,
      upcomingDeadlineDays: deadlineDays,
      activeUserRole: activeRole,
    });
    addToast('פרמטרי הניצולת והעומס עודכנו בהצלחה');
  };

  const handleClearAudit = () => {
    if (window.confirm('האם למחוק את היסטוריית פעולות המשתמשים (Audit Trail)?')) {
      StorageService.clearAuditLogs();
      setAuditLogs([]);
      addToast('יומן הפעולות נוקה');
    }
  };

  const permissionsMatrix = [
    { module: 'צפייה בדשבורד וקיבולת', admin: true, manager: true, employee: true, viewer: true },
    { module: 'הוספת ועריכת משימות', admin: true, manager: true, employee: true, viewer: false },
    { module: 'מחיקת משימות ופרויקטים', admin: true, manager: true, employee: false, viewer: false },
    { module: 'הגדרת קיבולת חודשית ותקן משרה', admin: true, manager: true, employee: false, viewer: false },
    { module: 'ניהול עובדים וימי עבודה', admin: true, manager: false, employee: false, viewer: false },
    { module: 'ייבוא/ייצוא אקסל וגיבוי', admin: true, manager: true, employee: false, viewer: false },
    { module: 'שינוי הגדרות מערכת', admin: true, manager: false, employee: false, viewer: false },
  ];

  return (
    <div id="settings-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">הגדרות מערכת ותקני עבודה</h2>
          <p className="text-xs text-slate-500">
            הגדרת ימי ושעות עבודה, ימים מקוצרים, תקן שעות חודשי ל-100% משרה, פרמטרי עומס ובקרת הרשאות
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.confirm('האם לאפס את כל בסיס הנתונים לנתוני הדגמה נקיים?')) {
                resetDatabase();
              }
            }}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200"
          >
            <RotateCcw className="w-4 h-4" />
            <span>איפוס מלא לנתוני הדגמה</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('work_hours')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'work_hours'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>ימי ושעות עבודה</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly_standards')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'monthly_standards'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>תקן שעות חודשי (100% משרה)</span>
          {Object.keys(settings.monthlyStandards || {}).length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'monthly_standards'
                  ? 'bg-blue-700 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {Object.keys(settings.monthlyStandards || {}).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('shortened_days')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'shortened_days'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          <span>ימים מקוצרים וערבי חג</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'shortened_days'
                ? 'bg-blue-700 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {settings.shortenedDays?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('thresholds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'thresholds'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>פרמטרי עומס והתראות</span>
        </button>

        <button
          onClick={() => setActiveTab('security_audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'security_audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>הרשאות ויומן מעקב (Audit)</span>
        </button>
      </div>

      {/* Tab 1: Work Hours & Days */}
      {activeTab === 'work_hours' && (
        <WorkHoursAndStandardSettings
          settings={settings}
          onChange={(updated) => {
            updateSettings(updated);
            addToast('הגדרות ימי עבודה ותקן משרה נשמרו בהצלחה');
          }}
          onNavigateToMonthlyStandards={() => setActiveTab('monthly_standards')}
        />
      )}

      {/* Tab 2: Monthly Standards for 100% position per month */}
      {activeTab === 'monthly_standards' && (
        <MonthlyStandardsManager
          settings={settings}
          onChange={(updated) => {
            updateSettings(updated);
          }}
          onToast={addToast}
        />
      )}

      {/* Tab 2: Shortened Days Calendar */}
      {activeTab === 'shortened_days' && (
        <ShortenedDaysManager
          settings={settings}
          onChange={(updated) => {
            updateSettings(updated);
          }}
          onToast={addToast}
        />
      )}

      {/* Tab 3: Thresholds & Capacity Alerts */}
      {activeTab === 'thresholds' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">ספי ניצולת ועומס עבודה</h3>
              <p className="text-xs text-slate-500">
                קביעת גבולות הצבעים וההתראות עבור אחוזי ניצולת הצוות
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  מינימום ניצולת תקינה (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="95"
                  value={normalMin}
                  onChange={(e) => setNormalMin(parseInt(e.target.value, 10) || 75)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-center"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  מתחת לזה = חוסר עבודה (כחול)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  מקסימום ניצולת תקינה (%)
                </label>
                <input
                  type="number"
                  min="80"
                  max="100"
                  value={normalMax}
                  onChange={(e) => setNormalMax(parseInt(e.target.value, 10) || 90)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-center"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">יעד אופטימלי לצוות</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  סף חריגה ועומס יתר (%)
                </label>
                <input
                  type="number"
                  min="95"
                  max="130"
                  value={overThreshold}
                  onChange={(e) => setOverThreshold(parseInt(e.target.value, 10) || 100)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-center"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">מעל זה = עומס יתר (אדום)</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  התראת דדליין מתקרב (בימים)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(parseInt(e.target.value, 10) || 7)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-center"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">ימים לפני הדדליין</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                מצב תפקיד משתמש נוכחי (לצורכי בדיקה)
              </label>
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              >
                <option value="Admin">Admin (מנהל מערכת ראשי - גישה מלאה)</option>
                <option value="Team Manager">Team Manager (מנהל צוות / PMO)</option>
                <option value="Employee">Employee (עובד צוות)</option>
                <option value="Viewer">Viewer (צופה בלבד - Read Only)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>שמור פרמטרי עומס</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Permissions & Audit Trail */}
      {activeTab === 'security_audit' && (
        <div className="space-y-6">
          {/* Permissions Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Shield className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  מטריצת הרשאות ובקרה (RBAC Architecture)
                </h3>
                <p className="text-[11px] text-slate-500">חלוקת הרשאות לפי 4 רמות תפקיד</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 font-semibold">מודול מערכת</th>
                    <th className="pb-2 font-semibold text-center">Admin</th>
                    <th className="pb-2 font-semibold text-center">Manager</th>
                    <th className="pb-2 font-semibold text-center">Employee</th>
                    <th className="pb-2 font-semibold text-center">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissionsMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-800">{row.module}</td>
                      <td className="py-2.5 text-center">
                        <span className="text-emerald-600 font-bold">✓</span>
                      </td>
                      <td className="py-2.5 text-center">
                        {row.manager ? (
                          <span className="text-emerald-600 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        {row.employee ? (
                          <span className="text-emerald-600 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        {row.viewer ? (
                          <span className="text-emerald-600 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-700" />
                <div>
                  <h4 className="font-bold text-base text-slate-900">
                    יומן מעקב ופעולות מערכת (Audit Trail)
                  </h4>
                  <p className="text-xs text-slate-500">
                    מעקב מלא אחר שינויים, עדכוני תקנים, מחיקות וייבוא נתונים
                  </p>
                </div>
              </div>

              <button
                onClick={handleClearAudit}
                className="text-xs text-slate-500 hover:text-rose-600"
              >
                נקה יומן מעקב
              </button>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 sticky top-0 bg-white">
                    <th className="pb-2 font-semibold">זמן ביצוע</th>
                    <th className="pb-2 font-semibold">משתמש</th>
                    <th className="pb-2 font-semibold">פעולה</th>
                    <th className="pb-2 font-semibold">ישות</th>
                    <th className="pb-2 font-semibold">פרטי השינוי</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2 font-mono text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString('he-IL')}
                      </td>
                      <td className="py-2 font-medium text-slate-800">{log.user}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action.includes('CREATE') || log.action.includes('ADD')
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action.includes('UPDATE')
                              ? 'bg-blue-100 text-blue-800'
                              : log.action.includes('DELETE')
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 text-slate-600">{log.entity}</td>
                      <td className="py-2 text-slate-600 truncate max-w-xs" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}

                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        אין רשומות ביומן המעקב עד כה.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
