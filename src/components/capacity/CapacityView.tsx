import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Layers,
  DollarSign,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  FileSpreadsheet,
  Edit2,
  ChevronDown,
  ChevronUp,
  Info,
  Sliders,
  Building,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getHebrewMonthName, getMonthScheduleSummary } from '../../services/capacityEngine';
import { ExcelService } from '../../services/excelService';
import { MonthlyCapacityModal } from './MonthlyCapacityModal';
import { MonthlyStandardQuickModal } from './MonthlyStandardQuickModal';
import { Employee, Task } from '../../types';
import { computeDailyCapacityRisks } from '../../services/dailyCapacityService';

export const CapacityView: React.FC = () => {
  const {
    teamMetrics,
    selectedMonth,
    setSelectedMonth,
    employees,
    clients,
    tasks,
    absences,
    setCurrentTab,
    openDrilldown,
    settings,
    updateSettings,
    addToast,
  } = useApp();

  const [selectedEmpForCapacity, setSelectedEmpForCapacity] = useState<Employee | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [isQuickStandardModalOpen, setIsQuickStandardModalOpen] = useState(false);
  const dailyRisks = computeDailyCapacityRisks(selectedMonth, employees, tasks, absences);

  const handleSaveMonthStandard = (month: string, hours: number | null) => {
    const updated = { ...(settings.monthlyStandards || {}) };
    if (hours === null) {
      delete updated[month];
      addToast(`תקן חודש ${month} אופס לחישוב ברירת מחדל`);
    } else {
      updated[month] = hours;
      addToast(`תקן חודשי ל-100% משרה (${getHebrewMonthName(month)}) עודכן ל-${hours} שעות`);
    }
    updateSettings({ monthlyStandards: updated });
  };

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.name || id;

  const handleExportCapacityExcel = () => {
    ExcelService.exportCapacityToExcel(teamMetrics, getHebrewMonthName(selectedMonth));
  };

  return (
    <div id="capacity-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">תכנון וקיבולת צוות (Capacity Planning)</h2>
          <p className="text-xs text-slate-500">
            תמונת מצב עומסים וקיבולת לכל עובד לחודש {getHebrewMonthName(selectedMonth)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Month Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs font-semibold">
            {['2026-09', '2026-10', '2026-11', '2026-12'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedMonth === m
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {getHebrewMonthName(m).split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Export Excel Button */}
          <button
            id="btn-export-capacity-excel"
            onClick={handleExportCapacityExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ייצא דוח קיבולת לאקסל</span>
          </button>
        </div>
      </div>

      {/* Legend & Metric Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-700">מקרא סטטוס ניצולת:</span>
          <span className="flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-100 px-2 py-0.5 rounded">
            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
            עומס יתר (&gt;100%)
          </span>
          <span className="flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-100 px-2 py-0.5 rounded">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            ניצולת מלאה (90%-100%)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            תקין (75%-90%)
          </span>
          <span className="flex items-center gap-1.5 text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded">
            <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
            חוסר עבודה (&lt;75%)
          </span>
        </div>

        <div className="text-slate-500 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>נוסחה: קיבולת נטו = ברוטו פחות היעדרויות</span>
        </div>
      </div>

      {/* Monthly Standard Hours & Schedule Banner */}
      {(() => {
        const schedule = getMonthScheduleSummary(selectedMonth, settings);
        return (
          <div
            className={`border rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
              schedule.isCustom
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Clock
                className={`w-4 h-4 shrink-0 ${
                  schedule.isCustom ? 'text-amber-600' : 'text-indigo-600'
                }`}
              />
              <span className="font-bold">
                תקן שעות חודשי ({getHebrewMonthName(selectedMonth).split(' ')[0]}):
              </span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded shadow-2xs border ${
                  schedule.isCustom
                    ? 'bg-amber-100/90 text-amber-900 border-amber-300'
                    : 'bg-white text-indigo-900 border-indigo-200'
                }`}
              >
                {schedule.fullTimeGrossHours} שעות ל-100% משרה
              </span>
              {schedule.isCustom && (
                <span className="bg-amber-200/90 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  מותאם אישית לחודש זה
                </span>
              )}
              <span className={schedule.isCustom ? 'text-amber-800' : 'text-indigo-800/80'}>
                ({schedule.workingDays} ימי עבודה • ברירת מחדל: {schedule.defaultFullTimeHours} שעות
                {schedule.shortenedDaysInMonth.length > 0 &&
                  ` • ${schedule.shortenedDaysInMonth.length} ימים מקוצרים`}
                )
              </span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIsQuickStandardModalOpen(true)}
                className="bg-white hover:bg-slate-50 text-slate-800 font-bold px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs text-[11px] flex items-center gap-1 transition-colors"
              >
                <Edit2 className="w-3 h-3 text-blue-600" />
                <span>הזן תקן לחודש זה</span>
              </button>

              {schedule.isCustom && (
                <button
                  type="button"
                  onClick={() => handleSaveMonthStandard(selectedMonth, null)}
                  title="איפוס חודש זה לברירת המחדל המחושבת"
                  className="text-amber-800 hover:text-rose-700 font-semibold text-[11px] flex items-center gap-0.5 px-2 py-1 rounded hover:bg-amber-100/60 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>איפוס</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCurrentTab('settings')}
                className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold underline flex items-center gap-1 mr-1"
              >
                <span>טבלת כל החודשים</span>
                <span>←</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Main Team Capacity Table (Section 19: Team Capacity View) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="p-3.5">עובד</th>
                <th className="p-3.5">ברוטו</th>
                <th className="p-3.5">היעדרויות</th>
                <th className="p-3.5">נטו זמין</th>
                <th className="p-3.5">הקצאה קבועה</th>
                <th className="p-3.5">משימות</th>
                <th className="p-3.5">סה״כ משובץ</th>
                <th className="p-3.5">Billable</th>
                <th className="p-3.5">שעות פנויות</th>
                <th className="p-3.5">עומס יתר</th>
                <th className="p-3.5">ניצולת %</th>
                <th className="p-3.5">סטטוס</th>
                <th className="p-3.5 text-center">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamMetrics.employeeMetrics.map((em) => {
                const empObj = employees.find((e) => e.id === em.employeeId);
                const isExpanded = expandedEmployeeId === em.employeeId;

                return (
                  <React.Fragment key={em.employeeId}>
                    <tr
                      className={`hover:bg-slate-50/80 transition-colors ${
                        em.status === 'over' ? 'bg-rose-50/30' : em.status === 'under' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedEmployeeId(isExpanded ? null : em.employeeId)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title="הצג פירוט משימות"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{em.employeeName}</span>
                            <div className="text-[11px] text-slate-400">
                              {empObj?.role.split(' ')[0]} | {empObj?.jobPercentage}% משרה
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-600">{em.grossCapacity} ש׳</td>

                      <td className="p-3.5 font-mono">
                        {em.absenceHours > 0 ? (
                          <span className="text-rose-600 font-semibold">-{em.absenceHours} ש׳</span>
                        ) : (
                          <span className="text-slate-400">0 ש׳</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-blue-700">{em.netCapacity} ש׳</td>

                      <td className="p-3.5 font-mono text-slate-600">
                        {em.fixedAllocationHours > 0 ? `${em.fixedAllocationHours} ש׳` : '-'}
                      </td>

                      <td className="p-3.5 font-mono text-slate-600">{em.taskAllocatedHours} ש׳</td>

                      <td className="p-3.5 font-mono font-bold text-slate-900">{em.totalAllocatedHours} ש׳</td>

                      <td className="p-3.5 font-mono text-emerald-700 font-semibold">
                        {em.billableHours} ש׳
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({em.billableUtilizationPercentage}%)
                        </span>
                      </td>

                      <td className="p-3.5 font-mono">
                        {em.freeCapacity > 0 ? (
                          <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {em.freeCapacity} ש׳
                          </span>
                        ) : (
                          <span className="text-slate-400">0 ש׳</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono">
                        {em.overAllocationHours > 0 ? (
                          <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                            +{em.overAllocationHours} ש׳
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono font-bold">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs ${
                            em.status === 'over'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : em.status === 'high'
                              ? 'bg-blue-600 text-white'
                              : em.status === 'normal'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {em.utilizationPercentage}%
                        </span>
                      </td>

                      <td className="p-3.5">
                        {em.status === 'over' && (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertOctagon className="w-3.5 h-3.5 shrink-0" /> עומס יתר
                          </span>
                        )}
                        {em.status === 'under' && (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> חסרות {em.freeCapacity}ש׳
                          </span>
                        )}
                        {(em.status === 'normal' || em.status === 'high') && (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> תקין
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedEmpForCapacity(empObj || null)}
                          title="הגדר קיבולת חודשית מותאמת"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>

                    {/* Expandable row: Breakdown of tasks contributing to this month */}
                    {isExpanded && (
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={13} className="p-4">
                          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="font-bold text-slate-800 text-xs">
                                פירוט משימות והקצאות של {em.employeeName} לחודש {getHebrewMonthName(selectedMonth)}:
                              </span>
                              <span className="text-xs text-slate-500">
                                {em.contributingTasks.length} משימות משובצות
                              </span>
                            </div>

                            {em.contributingTasks.length === 0 ? (
                              <div className="text-xs text-slate-400 py-2">
                                אין משימות מוקצות לחודש זה (שעות העבודה מוקצות לפעילות קבועה או פנויות).
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {em.contributingTasks.map((t) => (
                                  <div
                                    key={t.id}
                                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-blue-600">{t.taskNumber}</span>
                                        <span className="font-semibold text-slate-800">{t.name}</span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-0.5">
                                        לקוח: {getClientName(t.clientId)} | סטטוס: {t.status}
                                      </div>
                                    </div>
                                    <div className="text-left font-mono">
                                      <div className="font-bold text-slate-700">{t.remainingHours} שעות</div>
                                      <div className="text-[10px] text-slate-400">דדליין: {t.deadline}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Total Summary Footer Row */}
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                <td className="p-3.5">סה״כ צוות ({teamMetrics.employeeMetrics.length} עובדים)</td>
                <td className="p-3.5 font-mono">{teamMetrics.grossCapacity} ש׳</td>
                <td className="p-3.5 font-mono text-rose-600">-{teamMetrics.absenceHours} ש׳</td>
                <td className="p-3.5 font-mono text-blue-700">{teamMetrics.netCapacity} ש׳</td>
                <td className="p-3.5 font-mono">{teamMetrics.fixedHours} ש׳</td>
                <td className="p-3.5 font-mono">{teamMetrics.taskHours} ש׳</td>
                <td className="p-3.5 font-mono">{teamMetrics.totalAllocatedHours} ש׳</td>
                <td className="p-3.5 font-mono text-emerald-700">{teamMetrics.billableHours} ש׳</td>
                <td className="p-3.5 font-mono text-amber-700">{teamMetrics.freeHours} ש׳</td>
                <td className="p-3.5 font-mono text-rose-700">{teamMetrics.overAllocationHours} ש׳</td>
                <td className="p-3.5 font-mono text-blue-700">{teamMetrics.utilizationPercentage}%</td>
                <td colSpan={2} className="p-3.5 text-xs font-normal text-slate-500">
                  {teamMetrics.utilizationPercentage > 100 ? 'חריגת קיבולת' : 'תקין'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Day-level planning exceptions for recurring tasks */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between"><div><h3 className="font-bold text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-600"/>חריגי קיבולת יומית</h3><p className="text-[11px] text-slate-500">בדיקה לפי המועדים המדויקים של משימות שוטפות והיעדרויות.</p></div><span className={`text-xs font-bold px-2 py-1 rounded ${dailyRisks.length?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'}`}>{dailyRisks.length ? `${dailyRisks.length} חריגים` : 'אין חריגים'}</span></div>
        {dailyRisks.length > 0 && <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-3">תאריך</th><th className="p-3">עובד</th><th className="p-3">זמין</th><th className="p-3">משובץ</th><th className="p-3">חריגה</th><th className="p-3">משימות</th><th className="p-3">סיבה</th></tr></thead><tbody className="divide-y">{dailyRisks.map(r=><tr key={`${r.employeeId}-${r.date}`} className="bg-rose-50/30"><td className="p-3 font-mono">{r.date}</td><td className="p-3 font-bold">{r.employeeName}</td><td className="p-3">{r.availableHours} ש׳</td><td className="p-3">{r.scheduledHours} ש׳</td><td className="p-3 text-rose-700 font-bold">{r.overHours} ש׳</td><td className="p-3">{r.tasks.map(t=>`${t.taskNumber} (${t.hours}ש׳)`).join(', ')}</td><td className="p-3 text-rose-700">{r.reason}</td></tr>)}</tbody></table></div>}
      </div>

      {/* Monthly Capacity Override Modal */}
      <MonthlyCapacityModal
        isOpen={!!selectedEmpForCapacity}
        onClose={() => setSelectedEmpForCapacity(null)}
        employee={selectedEmpForCapacity}
      />

      {/* Monthly Standard Hours Quick Edit Modal */}
      <MonthlyStandardQuickModal
        isOpen={isQuickStandardModalOpen}
        onClose={() => setIsQuickStandardModalOpen(false)}
        monthStr={selectedMonth}
        settings={settings}
        onSave={handleSaveMonthStandard}
      />
    </div>
  );
};
