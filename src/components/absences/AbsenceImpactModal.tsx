import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  UserCheck,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Send,
  Users,
  Briefcase,
  AlertOctagon,
} from 'lucide-react';
import { AbsenceRequest } from '../../types';
import { useApp } from '../../context/AppContext';
import { analyzeAbsenceImpact } from '../../services/absenceImpactEngine';

interface AbsenceImpactModalProps {
  request: AbsenceRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (requestId: string, comment?: string) => void;
  onReject?: (requestId: string, comment?: string) => void;
  isViewOnly?: boolean;
}

export const AbsenceImpactModal: React.FC<AbsenceImpactModalProps> = ({
  request,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isViewOnly = false,
}) => {
  const { employees, tasks, taskAllocations, absences, settings } = useApp();
  const [managerComment, setManagerComment] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'colleagues'>('overview');

  const employee = useMemo(() => {
    if (!request) return null;
    return employees.find((e) => e.id === request.employeeId) || null;
  }, [request, employees]);

  const impact = useMemo(() => {
    if (!request || !employee) return null;
    return analyzeAbsenceImpact({
      request,
      employee,
      allEmployees: employees,
      tasks,
      taskAllocations,
      existingAbsences: absences,
      settings,
    });
  }, [request, employee, employees, tasks, taskAllocations, absences, settings]);

  if (!isOpen || !request || !employee || !impact) return null;

  const getRiskBadge = () => {
    switch (impact.riskLevel) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertOctagon className="w-4 h-4 text-red-600" />
            סיכון קריטי: השפעה מהותית על דדליינים וקיבולת
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            סיכון גבוה: קיימות משימות פעילות או עומס חריג
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock className="w-4 h-4 text-yellow-600" />
            סיכון בינוני: ניצולת גבוהה אך ללא חריגה קריטית
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            סיכון נמוך: הקיבולת מספקת ללא התנגשויות ידועות
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-right" dir="rtl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  ניתוח השפעת היעדרות בזמן אמת
                </h2>
                {getRiskBadge()}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                בקשת {request.absenceType} עבור <span className="font-semibold text-slate-800">{request.employeeName}</span> ({request.startDate} עד {request.endDate})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-4 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            סקירת השפעה וסיכום מנהלים
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-2.5 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>משימות חופפות ודדליינים</span>
            {impact.conflictingTasksCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-mono">
                {impact.conflictingTasksCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('colleagues')}
            className={`pb-2.5 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'colleagues'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>זמינות חברי צוות חלופיים</span>
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-mono">
              {impact.availableColleagues.filter((c) => c.isViableCandidate).length} זמינים
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
          {activeTab === 'overview' && (
            <>
              {/* Executive Summary Callout */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 text-sm text-slate-800 space-y-2">
                <div className="font-semibold text-blue-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-700" />
                  סיכום תמונת מצב למנהל:
                </div>
                <p className="text-slate-700 leading-relaxed font-sans">
                  {impact.managerSummary}
                </p>
                {request.reason && (
                  <p className="text-xs text-slate-600 pt-1 border-t border-blue-100">
                    <span className="font-medium text-slate-800">סיבת הבקשה שהוזנה:</span> {request.reason}
                  </p>
                )}
              </div>

              {/* Key Impact KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">ימי עבודה מושפעים</div>
                  <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                    {impact.affectedWorkDays} <span className="text-xs font-sans font-normal text-slate-400">ימים</span>
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">לא כולל שישי/שבת וחגים</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">שעות עבודה שיופחתו</div>
                  <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                    -{impact.hoursDeducted} <span className="text-xs font-sans font-normal text-slate-400">שעות</span>
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">מתוך תקן החודש הנוכחי</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">Capacity לפני / אחרי</div>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1 flex items-center gap-1.5">
                    <span className="text-slate-500 text-base">{impact.capacityBefore}h</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-blue-700">{impact.capacityAfter}h</span>
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">נטו שעות זמינות</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-xs text-slate-500 font-medium">ניצולת צפויה לאחר אישור</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${
                    impact.utilizationAfter > 105 ? 'text-rose-600' : impact.utilizationAfter > 90 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {Math.min(999, impact.utilizationAfter)}%
                  </div>
                  <div className="text-2xs text-slate-400 mt-0.5">
                    {impact.uncoveredHours > 0 ? `חוסר כיסוי של ${impact.uncoveredHours} שעות` : 'קיבולת נותרת תקינה'}
                  </div>
                </div>
              </div>

              {/* Billable / Non-Billable & Deadlines Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-slate-500" />
                    השפעה על שעות משימה
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">שעות משימות חופפות:</span>
                      <span className="font-mono font-bold text-slate-900">{impact.conflictingTaskHours} שעות</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">מתוכן שעות לחיוב (Billable):</span>
                      <span className="font-mono font-semibold text-emerald-700">{impact.billableImpactHours} שעות</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">מתוכן שעות פנימיות (Non-Billable):</span>
                      <span className="font-mono font-semibold text-slate-700">{impact.nonBillableImpactHours} שעות</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">יתרת שעות פנויות (Idle):</span>
                      <span className="font-mono font-semibold text-blue-600">{impact.idleImpactHours} שעות</span>
                    </div>
                  </div>
                </div>

                {/* Managerial Recommendations */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    המלצות לפעולה למנהל
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {impact.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800">
                  משימות פעילות החופפות למועדי ההיעדרות ({impact.conflictingTasksCount})
                </h4>
                {impact.deadlinesCount > 0 && (
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    {impact.deadlinesCount} דדליינים בטווח ההיעדרות או בסמוך לו
                  </span>
                )}
              </div>

              {impact.criticalTasks.length === 0 && impact.conflictingTasksCount === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-medium text-slate-800">אין משימות מתוזמנות החופפות לימי ההיעדרות</p>
                  <p className="text-xs text-slate-400 mt-1">ההיעדרות אינה צפויה ליצור עיכוב במשימות קיימות של העובד.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* List of conflicting tasks */}
                  {tasks
                    .filter((t) => t.assigneeId === employee.id && t.status !== 'הושלם' && t.status !== 'בוטל')
                    .map((t) => {
                      const isCritical = t.priority === 'קריטית' || t.priority === 'גבוהה';
                      const isNearDeadline = t.deadline >= request.startDate && t.deadline <= request.endDate;
                      return (
                        <div
                          key={t.id}
                          className={`p-3.5 rounded-xl border bg-white flex items-center justify-between transition-all ${
                            isNearDeadline
                              ? 'border-rose-300 bg-rose-50/30'
                              : isCritical
                              ? 'border-amber-200'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-400 font-semibold">{t.taskNumber}</span>
                              <span className="font-semibold text-slate-900 text-sm">{t.name}</span>
                              <span className={`text-2xs px-2 py-0.5 rounded-full font-medium ${
                                t.priority === 'קריטית'
                                  ? 'bg-rose-100 text-rose-800'
                                  : t.priority === 'גבוהה'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {t.priority}
                              </span>
                              {t.isBillable ? (
                                <span className="text-2xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-mono">Billable</span>
                              ) : (
                                <span className="text-2xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">Non-Billable</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-4">
                              <span>דדליין: <strong className={isNearDeadline ? 'text-rose-600' : 'text-slate-700'}>{t.deadline}</strong></span>
                              <span>שעות נותרות: <strong>{t.remainingHours} שעות</strong></span>
                              <span>סטטוס: <strong>{t.status}</strong></span>
                            </div>
                          </div>

                          <div className="text-left font-mono text-xs">
                            {isNearDeadline && (
                              <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-200 text-2xs font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                דדליין במועד ההיעדרות!
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'colleagues' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    זמינות חברי צוות חלופיים לגיבוי
                  </h4>
                  <p className="text-xs text-slate-500">
                    רשימת עובדים פעילים בצוות, ממוינת לפי שעות קיבולת פנויה בחודש זה
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    מועמד מומלץ
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    קיבולת מוגבלת
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {impact.availableColleagues.map((col) => (
                  <div
                    key={col.employeeId}
                    className={`p-3.5 rounded-xl border bg-white flex items-center justify-between ${
                      col.isViableCandidate
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        col.isViableCandidate ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {col.employeeName.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{col.employeeName}</span>
                          <span className="text-xs text-slate-500">{col.role}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {col.reason}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-left">
                      <div>
                        <div className="text-xs text-slate-400">קיבולת פנויה</div>
                        <div className={`text-base font-bold font-mono ${col.freeCapacity > 20 ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {col.freeCapacity}h
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">ניצולת נוכחית</div>
                        <div className="text-base font-bold font-mono text-slate-700">
                          {col.utilization}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Approval / Rejection Box */}
          {!isViewOnly && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 mt-4">
              <label className="block text-xs font-semibold text-slate-700">
                הערת מנהל (תופיע לעובד ותתועד ביומן הביקורת):
              </label>
              <textarea
                value={managerComment}
                onChange={(e) => setManagerComment(e.target.value)}
                placeholder="למשל: אושר בהתאם לסיכום עם יוסי על גיבוי משימה X..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            סגור חלון
          </button>

          {!isViewOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onReject) onReject(request.id, managerComment);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                דחה בקשה
              </button>

              <button
                onClick={() => {
                  if (onApprove) onApprove(request.id, managerComment);
                  onClose();
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                אשר היעדרות ועדכן Capacity
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
