import React, { useState } from 'react';
import { Clock, X, Check, RotateCcw, Sparkles, Calendar, AlertCircle } from 'lucide-react';
import { AppSettings } from '../../types';
import { getHebrewMonthName, getMonthScheduleSummary } from '../../services/capacityEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  monthStr: string;
  settings: AppSettings;
  onSave: (month: string, hours: number | null) => void;
}

export const MonthlyStandardQuickModal: React.FC<Props> = ({
  isOpen,
  onClose,
  monthStr,
  settings,
  onSave,
}) => {
  if (!isOpen) return null;

  const schedule = getMonthScheduleSummary(monthStr, settings);
  const currentCustom = settings.monthlyStandards?.[monthStr];
  const isCurrentlyCustom = typeof currentCustom === 'number' && currentCustom > 0;

  const [hoursInput, setHoursInput] = useState<string>(
    isCurrentlyCustom ? String(currentCustom) : String(schedule.defaultFullTimeHours)
  );

  const numHours = parseFloat(hoursInput);
  const isValid = !isNaN(numHours) && numHours > 0 && numHours <= 350;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave(monthStr, numHours);
    onClose();
  };

  const handleResetToDefault = () => {
    onSave(monthStr, null);
    onClose();
  };

  const monthTitle = getHebrewMonthName(monthStr);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                תקן שעות חודשי ל-100% משרה
              </h3>
              <p className="text-xs text-slate-500">{monthTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
          {/* Month schedule context */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>ימי עבודה בלוח השנה:</span>
              <span className="font-bold text-slate-900 font-mono">{schedule.workingDays} ימים</span>
            </div>
            {schedule.shortenedDaysInMonth.length > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>ימים מקוצרים / ערבי חג:</span>
                <span className="font-bold font-mono">
                  {schedule.shortenedDaysInMonth.length} ימים (קיזוז {schedule.shortenedReductionHours} שעות)
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-200/60">
              <span>תקן ברירת מחדל מחושב:</span>
              <span className="font-bold text-blue-700 font-mono">
                {schedule.defaultFullTimeHours} שעות
              </span>
            </div>
          </div>

          {/* Standard Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              תקן שעות ל-100% משרה בחודש זה (שעות ברוטו):
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="20"
                max="350"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 pl-14 font-mono font-bold text-lg text-slate-900 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="למשל 182"
                required
                autoFocus
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                שעות
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              ערך זה ישמש כבסיס לחישוב קיבולת הברוטו של כל עובדי הצוות לפי אחוז המשרה שלהם.
            </p>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              בחירה מהירה:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setHoursInput('182')}
                className="py-1.5 px-2 text-[11px] font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                182 שעות (סטנדרט)
              </button>
              <button
                type="button"
                onClick={() => setHoursInput('186')}
                className="py-1.5 px-2 text-[11px] font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                186 שעות
              </button>
              <button
                type="button"
                onClick={() => setHoursInput(String(schedule.workingDays * (settings.defaultDailyHours || 9)))}
                className="py-1.5 px-2 text-[11px] font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                ימי עבודה × 9 ({schedule.workingDays * (settings.defaultDailyHours || 9)})
              </button>
            </div>
          </div>

          {/* Fractional position preview */}
          {isValid && (
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 text-[11px] text-blue-900">
              <span className="font-bold block mb-1">השפעה לפי חלקיות משרה:</span>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="bg-white/80 p-1 rounded">
                  <div className="text-slate-500 text-[10px]">100% משרה</div>
                  <div className="font-bold font-mono">{numHours}ש׳</div>
                </div>
                <div className="bg-white/80 p-1 rounded">
                  <div className="text-slate-500 text-[10px]">80% משרה</div>
                  <div className="font-bold font-mono">{Math.round(numHours * 0.8)}ש׳</div>
                </div>
                <div className="bg-white/80 p-1 rounded">
                  <div className="text-slate-500 text-[10px]">50% משרה</div>
                  <div className="font-bold font-mono">{Math.round(numHours * 0.5)}ש׳</div>
                </div>
                <div className="bg-white/80 p-1 rounded">
                  <div className="text-slate-500 text-[10px]">40% משרה</div>
                  <div className="font-bold font-mono">{Math.round(numHours * 0.4)}ש׳</div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
            {isCurrentlyCustom ? (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-medium transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>איפוס לברירת מחדל</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={!isValid}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>שמור תקן חודשי</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
