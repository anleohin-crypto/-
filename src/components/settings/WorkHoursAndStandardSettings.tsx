import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Info,
  CheckCircle2,
  Calculator,
  Building2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { AppSettings, DaySchedule, MonthlyStandardHoursMode } from '../../types';
import { getMonthScheduleSummary } from '../../services/capacityEngine';

interface Props {
  settings: AppSettings;
  onChange: (updated: Partial<AppSettings>) => void;
  onNavigateToMonthlyStandards?: () => void;
}

const DAYS_META: { day: number; label: string; short: string }[] = [
  { day: 0, label: 'ראשון', short: 'א׳' },
  { day: 1, label: 'שני', short: 'ב׳' },
  { day: 2, label: 'שלישי', short: 'ג׳' },
  { day: 3, label: 'רביעי', short: 'ד׳' },
  { day: 4, label: 'חמישי', short: 'ה׳' },
  { day: 5, label: 'שישי', short: 'ו׳' },
  { day: 6, label: 'שבת', short: 'ש׳' },
];

export const WorkHoursAndStandardSettings: React.FC<Props> = ({
  settings,
  onChange,
  onNavigateToMonthlyStandards,
}) => {
  const [workDaysOfWeek, setWorkDaysOfWeek] = useState<number[]>(
    settings.workDaysOfWeek || [0, 1, 2, 3, 4]
  );
  const [defaultDailyHours, setDefaultDailyHours] = useState<number>(
    settings.defaultDailyHours || settings.workingHoursPerDay || 9
  );
  const [monthlyMode, setMonthlyMode] = useState<MonthlyStandardHoursMode>(
    settings.monthlyStandardHoursMode || 'fixed_standard'
  );
  const [fixedMonthlyStandardHours, setFixedMonthlyStandardHours] = useState<number>(
    settings.fixedMonthlyStandardHours || 182
  );
  const [deductShortenedDays, setDeductShortenedDays] = useState<boolean>(
    settings.deductShortenedDaysFromStandard ?? true
  );

  // Month for live preview
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [previewMonth, setPreviewMonth] = useState<string>(currentMonthStr);

  const toggleDay = (dayNum: number) => {
    let next: number[];
    if (workDaysOfWeek.includes(dayNum)) {
      if (workDaysOfWeek.length <= 1) return; // keep at least 1 day
      next = workDaysOfWeek.filter((d) => d !== dayNum);
    } else {
      next = [...workDaysOfWeek, dayNum].sort((a, b) => a - b);
    }
    setWorkDaysOfWeek(next);
    onChange({ workDaysOfWeek: next, weeklyWorkDays: next.length });
  };

  const handleApplyPreset = (preset: 'sun_thu' | 'sun_fri') => {
    const days = preset === 'sun_thu' ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5];
    setWorkDaysOfWeek(days);
    onChange({ workDaysOfWeek: days, weeklyWorkDays: days.length });
  };

  const handleDailyHoursChange = (val: number) => {
    const hours = Math.max(1, Math.min(16, val));
    setDefaultDailyHours(hours);
    onChange({ defaultDailyHours: hours, workingHoursPerDay: hours });
  };

  const handleModeChange = (mode: MonthlyStandardHoursMode) => {
    setMonthlyMode(mode);
    onChange({ monthlyStandardHoursMode: mode });
  };

  const handleFixedStandardChange = (val: number) => {
    const hours = Math.max(50, Math.min(300, val));
    setFixedMonthlyStandardHours(hours);
    onChange({ fixedMonthlyStandardHours: hours });
  };

  const handleDeductShortenedToggle = (checked: boolean) => {
    setDeductShortenedDays(checked);
    onChange({ deductShortenedDaysFromStandard: checked });
  };

  // Preview simulation
  const previewSummary = useMemo(() => {
    const tempSettings: AppSettings = {
      ...settings,
      workDaysOfWeek,
      defaultDailyHours,
      monthlyStandardHoursMode: monthlyMode,
      fixedMonthlyStandardHours,
      deductShortenedDaysFromStandard: deductShortenedDays,
    };
    return getMonthScheduleSummary(previewMonth, tempSettings);
  }, [
    settings,
    workDaysOfWeek,
    defaultDailyHours,
    monthlyMode,
    fixedMonthlyStandardHours,
    deductShortenedDays,
    previewMonth,
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Working Days of the Week */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">ימי העבודה השבועיים</h3>
              <p className="text-xs text-slate-500">
                קבע אילו ימים בשבוע נחשבים כימי עבודה פעילים עבור הצוות
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              type="button"
              onClick={() => handleApplyPreset('sun_thu')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              סטנדרט ישראלי (א׳-ה׳)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('sun_fri')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              כולל יום שישי (א׳-ו׳)
            </button>
          </div>
        </div>

        {/* Day Selectors Grid */}
        <div className="grid grid-cols-7 gap-2">
          {DAYS_META.map((item) => {
            const isSelected = workDaysOfWeek.includes(item.day);
            return (
              <button
                key={item.day}
                type="button"
                onClick={() => toggleDay(item.day)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/60 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs text-slate-500 mb-0.5">{item.label}</span>
                <span
                  className={`text-lg font-bold font-mono ${
                    isSelected ? 'text-blue-700' : 'text-slate-400'
                  }`}
                >
                  {item.short}
                </span>
                <span
                  className={`text-[10px] mt-1 font-semibold px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-blue-200/80 text-blue-800' : 'bg-slate-200/60 text-slate-500'
                  }`}
                >
                  {isSelected ? 'יום עבודה' : 'מנוחה'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">
          סך הכל ימי עבודה מוגדרים בשבוע: <strong>{workDaysOfWeek.length} ימים</strong>.
        </p>
      </div>

      {/* 2. Daily Standard Hours */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-base text-slate-900">שעות עבודה יומיות</h3>
            <p className="text-xs text-slate-500">
              שעות התקן ליום עבודה סטנדרטי (עבור 100% משרה)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              שעות עבודה יומיות כברירת מחדל
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="4"
                max="14"
                step="0.1"
                value={defaultDailyHours}
                onChange={(e) => handleDailyHoursChange(parseFloat(e.target.value) || 9)}
                className="w-28 bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-center text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600 font-medium">שעות ביום</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[8, 8.4, 8.5, 9].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleDailyHoursChange(val)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    defaultDailyHours === val
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {val} שעות
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              * ברירת המחדל בשוק הישראלי לשבוע עבודה של 5 ימים היא 8.4-9.0 שעות ליום.
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info className="w-4 h-4 text-blue-500" />
              <span>הערה לגבי הגדרות עובד אישיות:</span>
            </div>
            <p>
              שעות אלו מהוות את ברירת המחדל של המערכת. ניתן להגדיר שעות יומיות מותאמות אישית לכל עובד
              בנפרד במסך <strong>ניהול עובדים</strong> בהתאם לחוזה ההעסקה שלו.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Monthly Standard Hours (תקן שעות חודשי ל-100% משרה) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-bold text-base text-slate-900">
              תקן שעות חודשי עבור 100% משרה
            </h3>
            <p className="text-xs text-slate-500">
              קביעת אופן חישוב הקיבולת החודשית ברוטו לעובדים במשרה מלאה וחלקי משרה
            </p>
          </div>
        </div>

        {/* Radio Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: Fixed Monthly Standard */}
          <div
            onClick={() => handleModeChange('fixed_standard')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              monthlyMode === 'fixed_standard'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="monthlyMode"
                    checked={monthlyMode === 'fixed_standard'}
                    onChange={() => handleModeChange('fixed_standard')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-sm text-slate-900">תקן שעות חודשי קבוע</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    מומלץ (תקן ישראלי)
                  </span>
                </div>
                <p className="text-xs text-slate-500 pr-5">
                  תקן שעות קבוע ואחיד בכל חודש (למשל 182 שעות לפי צו הרחבה לשבוע עבודה של 42 שעות,
                  או 186 שעות).
                </p>
              </div>
            </div>

            {monthlyMode === 'fixed_standard' && (
              <div className="mt-4 pt-3 border-t border-indigo-200/60 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  שעות תקן חודשי (ל-100% משרה):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={fixedMonthlyStandardHours}
                    onChange={(e) =>
                      handleFixedStandardChange(parseInt(e.target.value, 10) || 182)
                    }
                    className="w-24 bg-white border border-indigo-300 rounded-lg p-2 font-mono font-bold text-center text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-600">שעות לחודש</span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  {[182, 186, 175, 168].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleFixedStandardChange(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        fixedMonthlyStandardHours === preset
                          ? 'bg-indigo-600 text-white font-bold border-indigo-600'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset} שעות {preset === 182 ? '(חוקי)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Option B: Dynamic Work Days */}
          <div
            onClick={() => handleModeChange('dynamic_working_days')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              monthlyMode === 'dynamic_working_days'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="monthlyMode"
                    checked={monthlyMode === 'dynamic_working_days'}
                    onChange={() => handleModeChange('dynamic_working_days')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-sm text-slate-900">
                    חישוב דינמי לפי ימי עבודה בלוח השנה
                  </span>
                </div>
                <p className="text-xs text-slate-500 pr-5">
                  מכפלה ישירה של מספר ימי העבודה בפועל בחודש בשעות העבודה היומיות (משתנה מחודש
                  לחודש לפי כמות הימים).
                </p>
              </div>
            </div>

            {monthlyMode === 'dynamic_working_days' && (
              <div className="mt-4 pt-3 border-t border-indigo-200/60">
                <p className="text-xs text-slate-600">
                  נוסחת חישוב: <code>ימי עבודה בחודש × שעות עבודה יומיות</code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Shortened Days Deduction Toggle */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-xl border border-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={deductShortenedDays}
              onChange={(e) => handleDeductShortenedToggle(e.target.checked)}
              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <div>
              <span className="block text-xs font-bold text-slate-800">
                קיזוז אוטומטי של ימים מקוצרים (ערבי חג) מהתקן החודשי
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                כאשר מוגדר יום מקוצר (למשל ערב פסח - 4 שעות במקום 9), שעות החסר (5 שעות) יקוזזו
                אוטומטית מתקן הברוטו של החודש, ללא צורך בהזנת היעדרות אישית לכל עובד.
              </span>
            </div>
          </label>
        </div>

        {/* Per-Month Custom Standards Quick Link */}
        <div className="pt-2">
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-indigo-950">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">
                  קביעת תקן שעות שונה ומותאם אישית לכל אחד מחודשי השנה
                </span>
                <span className="text-slate-600 block text-[11px] mt-0.5">
                  באפשרותך להזין לכל חודש (ינואר, פברואר... ספטמבר וכו׳) תקן שעות ייעודי ל-100% משרה, למשל בחודשי החגים או תקופות מיוחדות.
                  {Object.keys(settings.monthlyStandards || {}).length > 0 && (
                    <strong className="text-indigo-800 mr-1">
                      (מוגדרים כרגע {Object.keys(settings.monthlyStandards || {}).length} חודשים בהתאמה אישית)
                    </strong>
                  )}
                </span>
              </div>
            </div>

            {onNavigateToMonthlyStandards && (
              <button
                type="button"
                onClick={onNavigateToMonthlyStandards}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <span>עריכת תקני כל החודשים</span>
                <span>←</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Live Simulation & Preview Box */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="font-bold text-sm text-white">
                סימולציה בזמן אמת של תקן השעות לפי ההגדרות
              </h4>
              <p className="text-[11px] text-slate-300">
                הדמיית קיבולת ברוטו חודשית עבור חודש נבחר
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-medium">בחר חודש לבדיקה:</span>
            <input
              type="month"
              value={previewMonth}
              onChange={(e) => setPreviewMonth(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
            />
          </div>
        </div>

        {/* Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-300 block">ימי עבודה בחודש</span>
            <span className="text-xl font-bold font-mono text-white">
              {previewSummary.workingDays} ימים
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-300 block">ימים מקוצרים שחלים בחודש</span>
            <span className="text-xl font-bold font-mono text-amber-300">
              {previewSummary.shortenedDaysInMonth.length}
            </span>
            {previewSummary.shortenedReductionHours > 0 && (
              <span className="text-[10px] text-amber-200 block mt-0.5">
                (קיזוז {previewSummary.shortenedReductionHours} שעות)
              </span>
            )}
          </div>

          <div className="bg-indigo-500/20 backdrop-blur-xs p-3 rounded-xl border border-indigo-400/30">
            <span className="text-[11px] text-indigo-200 block">תקן 100% משרה (ברוטו)</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              {previewSummary.fullTimeGrossHours} שעות
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-300 block">עובד ב-80% משרה</span>
            <span className="text-xl font-bold font-mono text-white">
              {Math.round(previewSummary.fullTimeGrossHours * 0.8)} שעות
            </span>
          </div>
        </div>

        {previewSummary.shortenedDaysInMonth.length > 0 && (
          <div className="text-xs bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 text-amber-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              בחודש זה חלים המועדים המקוצרים:{' '}
              {previewSummary.shortenedDaysInMonth.map((sd) => `${sd.title} (${sd.date})`).join(', ')}.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
