import React, { useState } from 'react';
import { X, Calendar, Check, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getHebrewMonthName } from '../../services/capacityEngine';
import { Employee } from '../../types';

interface MonthlyCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export const MonthlyCapacityModal: React.FC<MonthlyCapacityModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const { monthlyCapacities, setMonthlyCapacity, addToast } = useApp();

  const months = [
    '2026-01',
    '2026-02',
    '2026-03',
    '2026-04',
    '2026-05',
    '2026-06',
    '2026-07',
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
    '2026-12',
  ];

  // Local state of hours per month
  const [hoursMap, setHoursMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (employee) {
      months.forEach((m) => {
        const found = monthlyCapacities.find(
          (mc) => mc.employeeId === employee.id && mc.month === m
        );
        map[m] = found ? found.grossHours : 180;
      });
    }
    return map;
  });

  if (!isOpen || !employee) return null;

  const handleSave = () => {
    Object.entries(hoursMap).forEach(([month, hours]) => {
      setMonthlyCapacity(employee.id, month, hours);
    });
    addToast(`קיבולת חודשית עבור ${employee.name} נשמרה בהצלחה`);
    onClose();
  };

  return (
    <div
      id="monthly-capacity-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="monthly-capacity-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-right border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">הגדרת קיבולת חודשית (Gross Capacity)</h3>
              <p className="text-xs text-slate-500">עבור העובד/ת: {employee.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-slate-600 bg-blue-50 p-3 rounded-xl border border-blue-200">
            הגדר שעות עבודה ברוטו לכל חודש בשנה (למשל: ספטמבר 180 שעות, אוקטובר 200 שעות, נובמבר 171 שעות).
            היעדרויות והקצאות קבועות ינוכו אוטומטית לקבלת קיבולת נטו.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {months.map((m) => (
              <div key={m} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {getHebrewMonthName(m).split(' ')[0]}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={hoursMap[m] || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setHoursMap((prev) => ({ ...prev, [m]: val }));
                    }}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg p-1.5 text-slate-900 text-center"
                  />
                  <span className="text-[10px] text-slate-400">ש׳</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>שמור קיבולת</span>
          </button>
        </div>
      </div>
    </div>
  );
};
