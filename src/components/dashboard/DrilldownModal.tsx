import React from 'react';
import { X, AlertTriangle, Clock, CheckCircle2, User, Building, AlertOctagon, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';

interface DrilldownModalProps {
  onSelectTask?: (task: Task) => void;
}

export const DrilldownModal: React.FC<DrilldownModalProps> = ({ onSelectTask }) => {
  const { drilldown, closeDrilldown, teamMetrics, employees, clients, tasks, setCurrentTab } = useApp();

  if (!drilldown.isOpen) return null;

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.name || id;
  const getEmployeeName = (id: string) => employees.find((e) => e.id === id)?.name || id;

  return (
    <div
      id="drilldown-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closeDrilldown}
    >
      <div
        id="drilldown-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-right border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              {drilldown.type === 'over_allocation' && <AlertOctagon className="w-5 h-5 text-rose-600" />}
              {drilldown.type === 'free_hours' && <Clock className="w-5 h-5 text-amber-600" />}
              {drilldown.type === 'overdue' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
              {drilldown.type === 'at_risk' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {drilldown.type === 'billable' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {drilldown.type === 'all_open' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">{drilldown.title}</h3>
              <p className="text-xs text-slate-500">תחקור נתונים תפעולי (Drill Down) לחודש {teamMetrics.month}</p>
            </div>
          </div>
          <button
            id="btn-close-drilldown"
            onClick={closeDrilldown}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Over Allocation Drilldown */}
          {drilldown.type === 'over_allocation' && (
            <div>
              <div className="text-xs text-slate-600 mb-3 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-900">
                להלן העובדים עם עומס יתר מעל 100% והמשימות שיוצרות את החריגה החודש:
              </div>
              <div className="space-y-4">
                {teamMetrics.employeeMetrics
                  .filter((em) => em.status === 'over')
                  .map((em) => (
                    <div key={em.employeeId} className="border border-rose-200 rounded-xl p-4 bg-rose-50/40">
                      <div className="flex items-center justify-between border-b border-rose-200 pb-2 mb-3">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <User className="w-4 h-4 text-rose-600" />
                          <span>{em.employeeName}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-600 text-white font-semibold">
                            {em.utilizationPercentage}% ניצולת
                          </span>
                        </div>
                        <div className="text-xs font-bold text-rose-700">
                          חריגה של {em.overAllocationHours} שעות (משובץ {em.totalAllocatedHours} מתוך {em.netCapacity} זמינות)
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-700 mb-2">המשימות התורמות לעומס:</div>
                      <div className="space-y-1.5">
                        {em.contributingTasks.length === 0 ? (
                          <div className="text-xs text-slate-500">אין משימות ספציפיות (העומס נובע מהקצאה קבועה)</div>
                        ) : (
                          em.contributingTasks.map((t) => (
                            <div
                              key={t.id}
                              className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-blue-400 transition-colors cursor-pointer"
                              onClick={() => {
                                closeDrilldown();
                                setCurrentTab('tasks');
                                if (onSelectTask) onSelectTask(t);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-600">{t.taskNumber}</span>
                                <span className="font-medium text-slate-800">{t.name}</span>
                                <span className="text-slate-400">({getClientName(t.clientId)})</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-600 font-semibold">{t.remainingHours} שעות נותרו</span>
                                <span className="text-slate-400 text-[11px]">דדליין: {t.deadline}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}

                {teamMetrics.employeeMetrics.filter((em) => em.status === 'over').length === 0 && (
                  <div className="text-center py-8 text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                    כל הכבוד! אין עובדים בעומס יתר בחודש זה.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Free Capacity / Idle Drilldown */}
          {drilldown.type === 'free_hours' && (
            <div>
              <div className="text-xs text-slate-600 mb-3 bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900">
                סה״כ {teamMetrics.freeHours} שעות פנויות בצוות. להלן פירוט הקיבולת הפנויה לפי עובדים:
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {teamMetrics.employeeMetrics.map((em) => (
                  <div key={em.employeeId} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                        {em.employeeName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{em.employeeName}</div>
                        <div className="text-xs text-slate-500">
                          קיבולת נטו: {em.netCapacity} שעות | שובצו: {em.totalAllocatedHours} שעות
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-sm ${em.freeCapacity > 40 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {em.freeCapacity} שעות פנויות
                      </div>
                      <div className="text-xs text-slate-400">{em.utilizationPercentage}% ניצולת</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Tasks Drilldown */}
          {drilldown.type === 'overdue' && (
            <div>
              <div className="text-xs text-rose-800 mb-3 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                רשימת המשימות הפתוחות שהדדליין שלהן עבר ({teamMetrics.overdueTasksCount} משימות):
              </div>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.status !== 'הושלם' && t.status !== 'בוטל' && t.deadline < new Date().toISOString().substring(0, 10))
                  .map((t) => (
                    <div
                      key={t.id}
                      className="border border-rose-200 rounded-xl p-3 bg-white hover:border-rose-400 transition-all flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        closeDrilldown();
                        setCurrentTab('tasks');
                        if (onSelectTask) onSelectTask(t);
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-rose-600">{t.taskNumber}</span>
                          <span className="font-semibold text-sm text-slate-900">{t.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {t.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>אחראי: {getEmployeeName(t.assigneeId)}</span>
                          <span>לקוח: {getClientName(t.clientId)}</span>
                          {t.delayReason && <span className="text-amber-700 font-medium">סיבה: {t.delayReason}</span>}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-rose-600">דדליין: {t.deadline}</div>
                        <div className="text-xs text-slate-500">{t.remainingHours} שעות נותרו</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* At Risk Tasks Drilldown */}
          {drilldown.type === 'at_risk' && (
            <div>
              <div className="text-xs text-amber-900 mb-3 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                משימות בסיכון (מעוכבות או שהדדליין שלהן קרוב מאד ביחס לשעות שנותרו):
              </div>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.status === 'מעוכב' || (t.status !== 'הושלם' && t.status !== 'בוטל' && t.deadline < new Date().toISOString().substring(0, 10)))
                  .map((t) => (
                    <div
                      key={t.id}
                      className="border border-amber-200 rounded-xl p-3 bg-white hover:border-amber-400 transition-all flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        closeDrilldown();
                        setCurrentTab('tasks');
                        if (onSelectTask) onSelectTask(t);
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-700">{t.taskNumber}</span>
                          <span className="font-semibold text-sm text-slate-900">{t.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {t.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span>אחראי: {getEmployeeName(t.assigneeId)}</span>
                          <span>לקוח: {getClientName(t.clientId)}</span>
                          {t.delayReason && <span className="text-red-600 font-semibold">סיבת עיכוב: {t.delayReason}</span>}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-amber-700">דדליין: {t.deadline}</div>
                        <div className="text-xs text-slate-500">{t.remainingHours} שעות נותרו</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Open Tasks List */}
          {drilldown.type === 'all_open' && (
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status !== 'הושלם' && t.status !== 'בוטל')
                .map((t) => (
                  <div
                    key={t.id}
                    className="border border-slate-200 rounded-xl p-3 bg-white hover:border-blue-400 transition-all flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      closeDrilldown();
                      setCurrentTab('tasks');
                      if (onSelectTask) onSelectTask(t);
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-600">{t.taskNumber}</span>
                        <span className="font-semibold text-sm text-slate-900">{t.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {getEmployeeName(t.assigneeId)} | {getClientName(t.clientId)}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-800">{t.remainingHours} שעות</div>
                      <div className="text-xs text-slate-400">דדליין: {t.deadline}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => {
              closeDrilldown();
              setCurrentTab('tasks');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            מעבר למסך המשימות המלא ←
          </button>
          <button
            onClick={closeDrilldown}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
