import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  Briefcase,
  Layers,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Employee, FixedAllocation } from '../../types';

export const EmployeesView: React.FC = () => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    fixedAllocations,
    addFixedAllocation,
    deleteFixedAllocation,
    clients,
    teamMetrics,
  } = useApp();

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('מערכות מידע');
  const [jobPercentage, setJobPercentage] = useState(100);
  const [defaultMonthlyHours, setDefaultMonthlyHours] = useState(180);
  const [hourlyCost, setHourlyCost] = useState(120);
  const [hourlyBillableRate, setHourlyBillableRate] = useState(250);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Fixed allocation modal state
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [fixedEmpId, setFixedEmpId] = useState('');
  const [fixedName, setFixedName] = useState('');
  const [fixedClientId, setFixedClientId] = useState('');
  const [fixedHours, setFixedHours] = useState(10);
  const [fixedIsBillable, setFixedIsBillable] = useState(false);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setName('');
    setRole('');
    setDepartment('מערכות מידע');
    setJobPercentage(100);
    setDefaultMonthlyHours(180);
    setHourlyCost(120);
    setHourlyBillableRate(250);
    setIsActive(true);
    setFormError(null);
    setIsEmployeeModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setRole(emp.role);
    setDepartment(emp.department);
    setJobPercentage(emp.jobPercentage);
    setDefaultMonthlyHours(emp.defaultMonthlyHours);
    setHourlyCost(emp.hourlyCost || 120);
    setHourlyBillableRate(emp.hourlyBillableRate || 250);
    setIsActive(emp.isActive);
    setFormError(null);
    setIsEmployeeModalOpen(true);
  };

  const handleSubmitEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('נא להזין שם עובד');
      return;
    }
    if (jobPercentage <= 0 || jobPercentage > 200) {
      setFormError('אחוז משרה חייב להיות בין 1% ל-200%');
      return;
    }

    if (editingEmployee) {
      updateEmployee({
        ...editingEmployee,
        name,
        role,
        department,
        jobPercentage,
        defaultMonthlyHours,
        hourlyCost,
        hourlyBillableRate,
        isActive,
      });
    } else {
      addEmployee({
        name,
        role,
        department,
        jobPercentage,
        defaultMonthlyHours,
        hourlyCost,
        hourlyBillableRate,
        isActive,
      });
    }

    setIsEmployeeModalOpen(false);
  };

  const handleAddFixedAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedEmpId || !fixedName || fixedHours <= 0) return;
    addFixedAllocation({
      employeeId: fixedEmpId,
      name: fixedName,
      monthlyHours: fixedHours,
      isBillable: fixedIsBillable,
      clientId: fixedClientId || undefined,
    });
    setIsFixedModalOpen(false);
    setFixedName('');
    setFixedHours(10);
  };

  const getClientName = (id?: string) => (id ? clients.find((c) => c.id === id)?.name : 'פעילות פנימית');

  return (
    <div id="employees-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">ניהול עובדים ומשאבי צוות</h2>
          <p className="text-xs text-slate-500">
            הגדרת צוות, אחוזי משרה, עלויות, קיבולת בסיס והקצאות קבועות
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFixedEmpId(employees[0]?.id || '');
              setIsFixedModalOpen(true);
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            <span>הקצאה קבועה חודשית</span>
          </button>

          <button
            id="btn-add-employee"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>עובד חדש</span>
          </button>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {employees.map((emp) => {
          const empMetric = teamMetrics.employeeMetrics.find((m) => m.employeeId === emp.id);
          const empFixed = fixedAllocations.filter((f) => f.employeeId === emp.id);
          const totalFixedHours = empFixed.reduce((a, b) => a + b.monthlyHours, 0);

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-blue-300 transition-all ${
                !emp.isActive ? 'opacity-60 bg-slate-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-base">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">{emp.name}</h3>
                    <p className="text-xs text-slate-500">{emp.role}</p>
                    <span className="text-[10px] text-slate-400">{emp.department}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(emp)}
                    title="ערוך פרטי עובד"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`האם למחוק את העובד ${emp.name}?`)) {
                        deleteEmployee(emp.id);
                      }
                    }}
                    title="מחק עובד"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Badges & Metrics */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">אחוז משרה:</span>
                  <span className="font-bold text-slate-800 font-mono">{emp.jobPercentage}%</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">קיבולת בסיס:</span>
                  <span className="font-bold text-slate-800 font-mono">{emp.defaultMonthlyHours} ש׳</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">עלות לשעה:</span>
                  <span className="font-bold text-slate-800 font-mono">₪{emp.hourlyCost || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">תעריף Billable:</span>
                  <span className="font-bold text-emerald-700 font-mono">₪{emp.hourlyBillableRate || 0}</span>
                </div>
              </div>

              {/* Status & Workload this month */}
              {empMetric && (
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">עומס החודש:</span>
                    <span className="font-bold text-slate-800">
                      {empMetric.totalAllocatedHours} מתוך {empMetric.netCapacity} ש׳
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        empMetric.status === 'over'
                          ? 'bg-rose-600'
                          : empMetric.status === 'high'
                          ? 'bg-blue-600'
                          : empMetric.status === 'normal'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, empMetric.utilizationPercentage)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                    <span>ניצולת: {empMetric.utilizationPercentage}%</span>
                    <span>הקצאה קבועה: {totalFixedHours} ש׳</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed Allocations Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h4 className="font-bold text-sm text-slate-900">
              הקצאות קבועות חודשיות בצוות (Fixed Allocations)
            </h4>
          </div>
          <button
            onClick={() => {
              setFixedEmpId(employees[0]?.id || '');
              setIsFixedModalOpen(true);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            + הוסף הקצאה קבועה
          </button>
        </div>

        <p className="text-xs text-slate-500">
          פעילויות קבועות מנוכות אוטומטית מקיבולת העובד בכל חודש (כגון: ישיבות הנהלה, ניהול צוות, תמיכה שוטפת).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2 font-semibold">עובד</th>
                <th className="pb-2 font-semibold">תיאור הפעילות</th>
                <th className="pb-2 font-semibold">שעות בחודש</th>
                <th className="pb-2 font-semibold">שיוך ללקוח</th>
                <th className="pb-2 font-semibold">סיווג</th>
                <th className="pb-2 font-semibold text-center">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fixedAllocations.map((fa) => {
                const emp = employees.find((e) => e.id === fa.employeeId);
                return (
                  <tr key={fa.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-900">{emp?.name || fa.employeeId}</td>
                    <td className="py-2.5 text-slate-700">{fa.name}</td>
                    <td className="py-2.5 font-mono font-bold text-indigo-700">{fa.monthlyHours} שעות</td>
                    <td className="py-2.5 text-slate-600">{getClientName(fa.clientId)}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          fa.isBillable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {fa.isBillable ? 'Billable' : 'Non-Billable'}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => deleteFixedAllocation(fa.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="מחק הקצאה"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Modal */}
      {isEmployeeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsEmployeeModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-right border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900">
                {editingEmployee ? 'עריכת עובד' : 'הוספת עובד חדש'}
              </h3>
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEmployee} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="bg-rose-50 text-rose-800 p-2.5 rounded-lg border border-rose-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">שם מלא</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">תפקיד</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="מתכנת Fullstack / מנהל פרויקטים"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">אחוז משרה (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={jobPercentage}
                    onChange={(e) => setJobPercentage(parseInt(e.target.value, 10) || 100)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-center font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">שעות בסיס לחודש</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={defaultMonthlyHours}
                    onChange={(e) => setDefaultMonthlyHours(parseInt(e.target.value, 10) || 180)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-center font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">עלות שעה לחברה (₪)</label>
                  <input
                    type="number"
                    min="0"
                    value={hourlyCost}
                    onChange={(e) => setHourlyCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">תעריף לחיוב לקוח (₪)</label>
                  <input
                    type="number"
                    min="0"
                    value={hourlyBillableRate}
                    onChange={(e) => setHourlyBillableRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-center font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="chk-is-active" className="font-semibold text-slate-700">
                  עובד פעיל במערכת
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  שמור עובד
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Allocation Modal */}
      {isFixedModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsFixedModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-right border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900">הוספת הקצאה קבועה חודשית</h3>
              <button
                onClick={() => setIsFixedModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFixedAllocation} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">עובד</label>
                <select
                  value={fixedEmpId}
                  onChange={(e) => setFixedEmpId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">שם הפעילות</label>
                <input
                  type="text"
                  required
                  value={fixedName}
                  onChange={(e) => setFixedName(e.target.value)}
                  placeholder="לדוגמה: ישיבות סנכרון צוות שבועיות"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">שעות חודשיות</label>
                  <input
                    type="number"
                    min="1"
                    value={fixedHours}
                    onChange={(e) => setFixedHours(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">סיווג שעות</label>
                  <select
                    value={fixedIsBillable ? 'yes' : 'no'}
                    onChange={(e) => setFixedIsBillable(e.target.value === 'yes')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                  >
                    <option value="no">Non-Billable (פנימי)</option>
                    <option value="yes">Billable (לחיוב)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">לקוח משויך (אופציונלי)</label>
                <select
                  value={fixedClientId}
                  onChange={(e) => setFixedClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                >
                  <option value="">פנימי / ללא לקוח</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsFixedModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  הוסף הקצאה
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
