import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Clock,
  Check,
  RotateCcw,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  Sliders,
  ArrowRight,
  TrendingUp,
  Info,
} from 'lucide-react';
import { AppSettings } from '../../types';
import { getHebrewMonthName, getMonthScheduleSummary } from '../../services/capacityEngine';

interface Props {
  settings: AppSettings;
  onChange: (updated: Partial<AppSettings>) => void;
  onToast: (msg: string) => void;
}

const MONTH_NAMES_HE = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

export const MonthlyStandardsManager: React.FC<Props> = ({ settings, onChange, onToast }) => {
  const currentYear = settings.workingYear || 2026;
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Local state for edits before/on change
  const monthlyStandards = settings.monthlyStandards || {};

  const handleMonthHoursChange = (monthStr: string, value: string) => {
    const trimmed = value.trim();
    const updated = { ...monthlyStandards };

    if (trimmed === '') {
      // Remove override, revert to default
      delete updated[monthStr];
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num > 0) {
        updated[monthStr] = num;
      }
    }

    onChange({ monthlyStandards: updated });
  };

  const handleResetMonth = (monthStr: string) => {
    const updated = { ...monthlyStandards };
    delete updated[monthStr];
    onChange({ monthlyStandards: updated });
    onToast(`תקן חודש ${monthStr} אופס לחישוב ברירת מחדל`);
  };

  const handleApplyBulkValue = (hours: number, label: string) => {
    if (window.confirm(`האם להחיל תקן אחיד של ${hours} שעות על כל 12 חודשי שנת ${selectedYear}?`)) {
      const updated = { ...monthlyStandards };
      for (let m = 1; m <= 12; m++) {
        const monthPad = m < 10 ? `0${m}` : `${m}`;
        const key = `${selectedYear}-${monthPad}`;
        updated[key] = hours;
      }
      onChange({ monthlyStandards: updated });
      onToast(`הוחל תקן של ${hours} שעות לכל חודשי ${selectedYear} (${label})`);
    }
  };

  const handleApplyDynamicWorkingDays = () => {
    if (
      window.confirm(
        `האם להחיל את חישוב ימי העבודה בפועל (ימי עבודה × שעות יומיות פחות ימים מקוצרים) כתקן קבוע עבור כל חודשי ${selectedYear}?`
      )
    ) {
      const updated = { ...monthlyStandards };
      const dailyHours = settings.defaultDailyHours || settings.workingHoursPerDay || 9;
      for (let m = 1; m <= 12; m++) {
        const monthPad = m < 10 ? `0${m}` : `${m}`;
        const key = `${selectedYear}-${monthPad}`;
        const schedule = getMonthScheduleSummary(key, { ...settings, monthlyStandards: {} });
        updated[key] = schedule.fullTimeGrossHours;
      }
      onChange({ monthlyStandards: updated });
      onToast(`הוחל תקן שעות מחושב לפי ימי עבודה לכל חודשי ${selectedYear}`);
    }
  };

  const handleClearAllOverrides = () => {
    if (
      window.confirm(
        `האם לאפס את כל התאמות השעות החודשיות של שנת ${selectedYear} ולחזור לחישוב ברירת המחדל?`
      )
    ) {
      const updated = { ...monthlyStandards };
      for (let m = 1; m <= 12; m++) {
        const monthPad = m < 10 ? `0${m}` : `${m}`;
        delete updated[`${selectedYear}-${monthPad}`];
      }
      onChange({ monthlyStandards: updated });
      onToast(`כל תקני חודשי ${selectedYear} אופסו לברירת המחדל`);
    }
  };

  // Build months data for the selected year
  const yearMonthsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthPad = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
      const monthStr = `${selectedYear}-${monthPad}`;
      const schedule = getMonthScheduleSummary(monthStr, settings);
      const customVal = monthlyStandards[monthStr];
      const isCustom = typeof customVal === 'number' && customVal > 0;
      const effectiveHours = isCustom ? customVal : schedule.defaultFullTimeHours;

      return {
        monthNum,
        monthStr,
        monthName: MONTH_NAMES_HE[i],
        workingDays: schedule.workingDays,
        shortenedDays: schedule.shortenedDaysInMonth,
        shortenedReduction: schedule.shortenedReductionHours,
        defaultHours: schedule.defaultFullTimeHours,
        customVal,
        isCustom,
        effectiveHours,
      };
    });
  }, [selectedYear, settings, monthlyStandards]);

  // Year statistics
  const yearStats = useMemo(() => {
    let totalAnnualHours = 0;
    let totalWorkingDays = 0;
    let customMonthsCount = 0;

    yearMonthsData.forEach((m) => {
      totalAnnualHours += m.effectiveHours;
      totalWorkingDays += m.workingDays;
      if (m.isCustom) customMonthsCount++;
    });

    const averageMonthlyHours = Math.round((totalAnnualHours / 12) * 10) / 10;

    return {
      totalAnnualHours,
      totalWorkingDays,
      averageMonthlyHours,
      customMonthsCount,
    };
  }, [yearMonthsData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Year Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">
              תקן שעות חודשי ל-100% משרה לפי חודש
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            הגדרת תקן שעות מותאם אישית לכל אחד מחודשי השנה עבור משרה מלאה (100% משרה).
            שעות הברוטו של כל עובד יחושבו ביחס לתקן זה בהתאם לאחוז משרתו.
          </p>
        </div>

        {/* Year Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
          {[2025, 2026, 2027].map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedYear === yr
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              שנת {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">סך שעות תקן שנתי (100% משרה)</div>
          <div className="text-xl font-bold font-mono text-blue-700 mt-1">
            {yearStats.totalAnnualHours.toLocaleString()}
            <span className="text-xs font-normal text-slate-500 mr-1">שעות</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">שנת {selectedYear}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">ממוצע שעות חודשי</div>
          <div className="text-xl font-bold font-mono text-indigo-700 mt-1">
            {yearStats.averageMonthlyHours}
            <span className="text-xs font-normal text-slate-500 mr-1">שעות/חודש</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">לחודש מלא</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">סך ימי עבודה בשנה</div>
          <div className="text-xl font-bold font-mono text-slate-800 mt-1">
            {yearStats.totalWorkingDays}
            <span className="text-xs font-normal text-slate-500 mr-1">ימים</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {settings.workDaysOfWeek?.length || 5} ימי עבודה בשבוע
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">חודשים בהתאמה אישית</div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1">
            {yearStats.customMonthsCount}
            <span className="text-xs font-normal text-slate-500 mr-1">מתוך 12</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {yearStats.customMonthsCount > 0 ? 'כולל תקנים פרטניים' : 'כולם לפי ברירת מחדל'}
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="font-semibold">פעולות מילוי מהיר לכל 12 החודשים:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleApplyBulkValue(182, 'סטנדרט 42 שעות שבועיות')}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium transition-colors"
          >
            החל 182 שעות על הכל
          </button>
          <button
            type="button"
            onClick={() => handleApplyBulkValue(186, 'תקן 43 שעות')}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium transition-colors"
          >
            החל 186 שעות על הכל
          </button>
          <button
            type="button"
            onClick={handleApplyDynamicWorkingDays}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium transition-colors"
          >
            החל חישוב ימי עבודה בפועל
          </button>
          {yearStats.customMonthsCount > 0 && (
            <button
              type="button"
              onClick={handleClearAllOverrides}
              className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>אפס הכל לברירת מחדל</span>
            </button>
          )}
        </div>
      </div>

      {/* 12 Months Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-bold">חודש</th>
                <th className="py-3 px-3 font-semibold text-center">ימי עבודה בלוח</th>
                <th className="py-3 px-3 font-semibold">ימים מקוצרים וערבי חג</th>
                <th className="py-3 px-3 font-semibold text-center">תקן ברירת מחדל</th>
                <th className="py-3 px-4 font-bold text-center w-52">
                  תקן שעות ל-100% משרה (לעריכה)
                </th>
                <th className="py-3 px-3 font-semibold text-center">סטטוס</th>
                <th className="py-3 px-4 font-semibold text-left">דוגמת חלקי משרה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearMonthsData.map((m) => {
                return (
                  <tr
                    key={m.monthStr}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      m.isCustom ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Month Name & Number */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {m.monthNum}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{m.monthName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{m.monthStr}</div>
                        </div>
                      </div>
                    </td>

                    {/* Working Days */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {m.workingDays} ימים
                      </span>
                    </td>

                    {/* Shortened Days */}
                    <td className="py-3 px-3">
                      {m.shortenedDays.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {m.shortenedDays.map((sd) => (
                            <span
                              key={sd.id}
                              className="text-[10px] bg-amber-100/80 text-amber-900 border border-amber-200 font-medium px-1.5 py-0.5 rounded"
                              title={`${sd.title} (${sd.workingHours} שעות עבודה)`}
                            >
                              {sd.title} ({sd.workingHours}ש׳)
                            </span>
                          ))}
                          {m.shortenedReduction > 0 && (
                            <span className="text-[10px] text-amber-700 font-medium self-center">
                              (קיזוז {m.shortenedReduction}ש׳)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Default Calculated Standard */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                        {m.defaultHours} שעות
                      </span>
                    </td>

                    {/* Input Field for 100% standard hours */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="relative w-28">
                          <input
                            type="number"
                            step="0.5"
                            min="20"
                            max="350"
                            value={m.isCustom ? m.customVal : m.defaultHours}
                            onChange={(e) => handleMonthHoursChange(m.monthStr, e.target.value)}
                            placeholder={String(m.defaultHours)}
                            className={`w-full py-1.5 px-2 text-center font-mono font-bold rounded-lg border text-sm outline-none transition-all ${
                              m.isCustom
                                ? 'border-amber-400 bg-amber-50/80 text-amber-950 ring-2 ring-amber-300/40 focus:ring-amber-500'
                                : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            }`}
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                            ש׳
                          </span>
                        </div>

                        {m.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleResetMonth(m.monthStr)}
                            title="איפוס חודש זה לברירת המחדל"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {m.isCustom ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                          <span>מותאם אישית</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          <span>חישוב אוטומטי</span>
                        </span>
                      )}
                    </td>

                    {/* Fractional Positions preview */}
                    <td className="py-3 px-4 text-left">
                      <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-slate-500">
                        <span title="80% משרה">80%: {Math.round(m.effectiveHours * 0.8)}ש׳</span>
                        <span className="text-slate-300">|</span>
                        <span title="50% משרה">50%: {Math.round(m.effectiveHours * 0.5)}ש׳</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clarification Box */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">כיצד משפיע תקן השעות החודשי על חישוב הקיבולת?</div>
          <p className="text-blue-800 leading-relaxed">
            תקן השעות המוזן לכל חודש מהווה את בסיס הברוטו החודשי לעובד במשרה מלאה (100% משרה).
            עבור עובדים בחלקי משרה (למשל 80% או 50%), המערכת מחשבת אוטומטית את קיבולת הברוטו לפי המכפלה:
            <code className="mx-1 px-1.5 py-0.5 bg-white rounded border border-blue-200 font-mono font-bold">
              קיבולת ברוטו = תקן חודשי × (אחוז משרה / 100)
            </code>
            .
            שעות ההיעדרות והשעות הקבועות של כל עובד מופחתות לאחר מכן מברוטו זה כדי לקבל את קיבולת הנטו.
          </p>
        </div>
      </div>
    </div>
  );
};
