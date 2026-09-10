import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Play,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Users,
  Briefcase,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getHebrewMonthName, computeTeamCapacity } from '../../services/capacityEngine';
import { Employee, Task, Absence } from '../../types';

export const WhatIfView: React.FC = () => {
  const {
    teamMetrics,
    selectedMonth,
    employees,
    tasks,
    taskAllocations,
    fixedAllocations,
    absences,
    monthlyCapacities,
    settings,
    addTask,
    addEmployee,
    addAbsence,
    addToast,
  } = useApp();

  // Simulation Parameters State
  const [simExtraProjectHours, setSimExtraProjectHours] = useState<number>(0);
  const [simNewEmployeePct, setSimNewEmployeePct] = useState<number>(0); // 0, 50, 100%
  const [simEmployeeAbsenceId, setSimEmployeeAbsenceId] = useState<string>('');
  const [simAbsenceDays, setSimAbsenceDays] = useState<number>(0);

  // Compute simulated capacity
  const simulatedEmployees = [...employees];
  if (simNewEmployeePct > 0) {
    simulatedEmployees.push({
      id: 'sim_new_emp',
      name: `עובד חדש בסימולציה (${simNewEmployeePct}%)`,
      role: 'איש צוות נוסף',
      department: 'מערכות מידע',
      jobPercentage: simNewEmployeePct,
      defaultMonthlyHours: Math.round((180 * simNewEmployeePct) / 100),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const simulatedAbsences = [...absences];
  if (simEmployeeAbsenceId && simAbsenceDays > 0) {
    simulatedAbsences.push({
      id: 'sim_absence',
      employeeId: simEmployeeAbsenceId,
      type: 'חופשה',
      startDate: `${selectedMonth}-01`,
      endDate: `${selectedMonth}-14`,
      hours: simAbsenceDays * (settings.workingHoursPerDay || 9),
      notes: 'סימולציית היעדרות',
      createdAt: new Date().toISOString(),
    });
  }

  const simulatedTasks = [...tasks];
  const simulatedTaskAllocations = [...taskAllocations];
  if (simExtraProjectHours > 0) {
    const simTaskId = 'sim_extra_task';
    simulatedTasks.push({
      id: simTaskId,
      taskNumber: 'SIM-999',
      name: `פרויקט חדש בסימולציה (${simExtraProjectHours} שעות)`,
      clientId: 'c1',
      assigneeId: employees[0]?.id || 'e1',
      priority: 'גבוהה',
      plannedStartDate: `${selectedMonth}-01`,
      plannedEndDate: `${selectedMonth}-28`,
      deadline: `${selectedMonth}-28`,
      estimatedHours: simExtraProjectHours,
      actualHours: 0,
      remainingHours: simExtraProjectHours,
      completionPercentage: 0,
      status: 'מתוכנן',
      isBillable: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    simulatedTaskAllocations.push({
      id: 'sim_alloc',
      taskId: simTaskId,
      employeeId: employees[0]?.id || 'e1',
      month: selectedMonth,
      allocatedHours: simExtraProjectHours,
      createdAt: new Date().toISOString(),
    });
  }

  // Calculate simulated metrics
  const simMetrics = computeTeamCapacity(
    selectedMonth,
    simulatedEmployees,
    simulatedTasks,
    simulatedTaskAllocations,
    fixedAllocations,
    simulatedAbsences,
    monthlyCapacities,
    settings
  );

  const resetSimulation = () => {
    setSimExtraProjectHours(0);
    setSimNewEmployeePct(0);
    setSimEmployeeAbsenceId('');
    setSimAbsenceDays(0);
    addToast('הסימולציה אופסה לבסיס');
  };

  const handleApplyScenarioToRealData = () => {
    if (
      window.confirm(
        'האם להחיל את תרחיש הסימולציה הזה בפועל לתוך בסיס הנתונים האמיתי של המערכת?'
      )
    ) {
      if (simNewEmployeePct > 0) {
        addEmployee({
          name: `עובד חדש (${simNewEmployeePct}%)`,
          role: 'מתכנת נוסף',
          department: 'מערכות מידע',
          jobPercentage: simNewEmployeePct,
          defaultMonthlyHours: Math.round((180 * simNewEmployeePct) / 100),
          isActive: true,
        });
      }
      if (simExtraProjectHours > 0) {
        addTask(
          {
            name: `פרויקט חדש שהתקבל (${simExtraProjectHours} שעות)`,
            clientId: 'c1',
            assigneeId: employees[0]?.id || 'e1',
            priority: 'גבוהה',
            plannedStartDate: `${selectedMonth}-01`,
            plannedEndDate: `${selectedMonth}-28`,
            deadline: `${selectedMonth}-28`,
            estimatedHours: simExtraProjectHours,
            actualHours: 0,
            remainingHours: simExtraProjectHours,
            completionPercentage: 0,
            status: 'מתוכנן',
            isBillable: true,
          },
          [{ month: selectedMonth, hours: simExtraProjectHours }]
        );
      }
      if (simEmployeeAbsenceId && simAbsenceDays > 0) {
        addAbsence({
          employeeId: simEmployeeAbsenceId,
          type: 'חופשה',
          startDate: `${selectedMonth}-01`,
          endDate: `${selectedMonth}-14`,
          hours: simAbsenceDays * (settings.workingHoursPerDay || 9),
          notes: 'היעדרות מסימולציה שהוחלה',
        });
      }
      resetSimulation();
      addToast('תרחיש הסימולציה הוחל בהצלחה על נתוני האמת!');
    }
  };

  const isSimActive =
    simExtraProjectHours > 0 || simNewEmployeePct > 0 || (simEmployeeAbsenceId && simAbsenceDays > 0);

  return (
    <div id="whatif-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">סימולציית תכנון וקיבולת (What-If Planning)</h2>
          <p className="text-xs text-slate-500">
            בדיקת השפעת תרחישים עתידיים על ניצולת הצוות, עומסי יתר וכיסוי הצבר לחודש {getHebrewMonthName(selectedMonth)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSimActive && (
            <button
              onClick={resetSimulation}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>אפס סימולציה</span>
            </button>
          )}

          {isSimActive && (
            <button
              onClick={handleApplyScenarioToRealData}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>החל תרחיש זה על המערכת</span>
            </button>
          )}
        </div>
      </div>

      {/* Simulation Controls Form */}
      <div className="bg-gradient-to-l from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md space-y-4">
        <h4 className="text-sm font-bold text-blue-200 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          הגדרת פרמטרים לסימולציה:
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Scenario 1: New Project / Scope Increase */}
          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 space-y-2">
            <span className="font-semibold text-slate-200 block">
              1. קליטת פרויקט חדש / תוספת עבודה:
            </span>
            <div className="flex items-center justify-between text-blue-300 font-bold">
              <span>תוספת שעות החודש:</span>
              <span className="font-mono text-base">{simExtraProjectHours} ש׳</span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              step="10"
              value={simExtraProjectHours}
              onChange={(e) => setSimExtraProjectHours(parseInt(e.target.value, 10))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 שעות</span>
              <span>150 שעות</span>
              <span>300 שעות</span>
            </div>
          </div>

          {/* Scenario 2: Employee Absence */}
          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 space-y-2">
            <span className="font-semibold text-slate-200 block">
              2. היעדרות עובד (מחלה/מילואים/חופשה):
            </span>
            <select
              value={simEmployeeAbsenceId}
              onChange={(e) => setSimEmployeeAbsenceId(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-1.5 text-xs"
            >
              <option value="">ללא היעדרות בסימולציה</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            {simEmployeeAbsenceId && (
              <>
                <div className="flex items-center justify-between text-amber-300 font-bold mt-1">
                  <span>משך ההיעדרות:</span>
                  <span className="font-mono">{simAbsenceDays} ימי עבודה</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={simAbsenceDays}
                  onChange={(e) => setSimAbsenceDays(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </>
            )}
          </div>

          {/* Scenario 3: Headcount Increase */}
          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/10 space-y-2">
            <span className="font-semibold text-slate-200 block">
              3. גיוס עובד חדש לצוות:
            </span>
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span>תוספת כוח אדם:</span>
              <span className="font-mono">
                {simNewEmployeePct === 0
                  ? 'ללא גיוס'
                  : simNewEmployeePct === 50
                  ? 'חצי משרה (50%)'
                  : 'משרה מלאה (100%)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[0, 50, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setSimNewEmployeePct(pct)}
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                    simNewEmployeePct === pct
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {pct === 0 ? 'ללא' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison: Current vs Simulated */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-base text-slate-900">
            השוואת תוצאות: מצב נוכחי מול מצב בסימולציה
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            חודש {getHebrewMonthName(selectedMonth)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Metric 1: Net Capacity */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-xs text-slate-500 block">קיבולת נטו כוללת</span>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] block">נוכחי:</span>
                <span className="font-bold text-sm text-slate-700 font-mono">
                  {teamMetrics.netCapacity} ש׳
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-blue-600 text-[10px] block">בסימולציה:</span>
                <span className="font-bold text-base text-blue-700 font-mono">
                  {simMetrics.netCapacity} ש׳
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2: Total Allocated */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-xs text-slate-500 block">שעות משובצות</span>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] block">נוכחי:</span>
                <span className="font-bold text-sm text-slate-700 font-mono">
                  {teamMetrics.totalAllocatedHours} ש׳
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-indigo-600 text-[10px] block">בסימולציה:</span>
                <span className="font-bold text-base text-indigo-700 font-mono">
                  {simMetrics.totalAllocatedHours} ש׳
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Utilization Rate */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-xs text-slate-500 block">אחוז ניצולת צוות</span>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] block">נוכחי:</span>
                <span className="font-bold text-sm text-slate-700 font-mono">
                  {teamMetrics.utilizationPercentage}%
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-blue-600 text-[10px] block">בסימולציה:</span>
                <span
                  className={`font-bold text-base font-mono ${
                    simMetrics.utilizationPercentage > 100
                      ? 'text-rose-600'
                      : simMetrics.utilizationPercentage >= 75
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {simMetrics.utilizationPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Metric 4: Over Allocation */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-xs text-slate-500 block">חריגה / עומס יתר</span>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] block">נוכחי:</span>
                <span className="font-bold text-sm text-slate-700 font-mono">
                  {teamMetrics.overAllocationHours} ש׳
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-rose-600 text-[10px] block">בסימולציה:</span>
                <span className="font-bold text-base text-rose-700 font-mono">
                  {simMetrics.overAllocationHours} ש׳
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Simulated Employees Breakdown */}
        <div className="pt-2">
          <h4 className="font-bold text-xs text-slate-800 mb-2">
            פירוט עומסי עובדים בסימולציה:
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2">עובד</th>
                  <th className="pb-2">קיבולת נטו</th>
                  <th className="pb-2">סה״כ משובץ</th>
                  <th className="pb-2">פנוי</th>
                  <th className="pb-2">חריגה</th>
                  <th className="pb-2">ניצולת צפויה</th>
                  <th className="pb-2">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {simMetrics.employeeMetrics.map((em) => (
                  <tr key={em.employeeId} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-900">{em.employeeName}</td>
                    <td className="py-2.5 font-mono">{em.netCapacity} ש׳</td>
                    <td className="py-2.5 font-mono font-bold text-slate-800">
                      {em.totalAllocatedHours} ש׳
                    </td>
                    <td className="py-2.5 font-mono text-amber-600">{em.freeCapacity} ש׳</td>
                    <td className="py-2.5 font-mono text-rose-600">
                      {em.overAllocationHours > 0 ? `+${em.overAllocationHours}ש׳` : '-'}
                    </td>
                    <td className="py-2.5 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          em.status === 'over'
                            ? 'bg-rose-100 text-rose-700'
                            : em.status === 'under'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {em.utilizationPercentage}%
                      </span>
                    </td>
                    <td className="py-2.5">
                      {em.status === 'over' && (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertOctagon className="w-3.5 h-3.5" /> עומס יתר
                        </span>
                      )}
                      {em.status === 'under' && (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> חוסר עבודה
                        </span>
                      )}
                      {(em.status === 'normal' || em.status === 'high') && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> מאוזן
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
