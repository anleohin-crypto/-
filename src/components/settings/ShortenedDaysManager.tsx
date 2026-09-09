import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Info,
  CalendarCheck2,
  RotateCcw,
  Search,
  Filter,
} from 'lucide-react';
import { ShortenedDay, AppSettings } from '../../types';
import { DEFAULT_ISRAELI_SHORTENED_DAYS_2026 } from '../../services/demoData';

interface Props {
  settings: AppSettings;
  onChange: (updated: Partial<AppSettings>) => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const COMMON_HOLIDAY_PRESETS = [
  { title: 'ערב פסח (חג ראשון)', hours: 4, notes: 'ערב חג ראשון' },
  { title: 'ערב שביעי של פסח', hours: 4, notes: 'ערב חג שני' },
  { title: 'ערב ראש השנה', hours: 4, notes: 'ערב חג' },
  { title: 'ערב יום כיפור', hours: 4, notes: 'ערב יום כיפור' },
  { title: 'ערב סוכות', hours: 4, notes: 'ערב חג ראשון' },
  { title: 'ערב שבועות', hours: 4, notes: 'ערב חג מתן תורה' },
  { title: 'פורים', hours: 5, notes: 'יום מקוצר' },
  { title: 'ערב יום הזיכרון', hours: 7, notes: 'צפירה וטקסי זיכרון' },
  { title: 'יום בחירות', hours: 0, notes: 'שבתון / יום ללא עבודה' },
];

export const ShortenedDaysManager: React.FC<Props> = ({ settings, onChange, onToast }) => {
  const [shortenedDays, setShortenedDays] = useState<ShortenedDay[]>(
    settings.shortenedDays || []
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');

  // New item form state
  const [newDate, setNewDate] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newHours, setNewHours] = useState<number>(4);
  const [newNotes, setNewNotes] = useState('');

  const standardDaily = settings.defaultDailyHours || settings.workingHoursPerDay || 9;

  const handleAddDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTitle.trim()) {
      if (onToast) onToast('נא למלא תאריך ושם המועד', 'warning');
      return;
    }

    // Check duplicate date
    if (shortenedDays.some((sd) => sd.date === newDate)) {
      if (onToast) onToast('כבר קיים יום מקוצר מוגדר לתאריך זה', 'warning');
      return;
    }

    const newDay: ShortenedDay = {
      id: `sd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: newDate,
      title: newTitle.trim(),
      workingHours: newHours,
      notes: newNotes.trim() || undefined,
    };

    const updated = [...shortenedDays, newDay].sort((a, b) => a.date.localeCompare(b.date));
    setShortenedDays(updated);
    onChange({ shortenedDays: updated });

    if (onToast) onToast(`היום המקוצר "${newTitle}" נוסף בהצלחה`);

    // Reset
    setNewDate('');
    setNewTitle('');
    setNewHours(4);
    setNewNotes('');
    setShowAddForm(false);
  };

  const handleDeleteDay = (id: string, title: string) => {
    if (!window.confirm(`האם להסיר את היום המקוצר "${title}"?`)) return;

    const updated = shortenedDays.filter((sd) => sd.id !== id);
    setShortenedDays(updated);
    onChange({ shortenedDays: updated });

    if (onToast) onToast(`היום המקוצר "${title}" הוסר`, 'info');
  };

  const handleRestoreDefaultHolidays = () => {
    if (
      !window.confirm(
        'האם לטעון את רשימת ערבי החג והמועדים המקוצרים הנפוצים בישראל (שנת 2026)?'
      )
    ) {
      return;
    }

    // Merge or replace
    const mergedMap = new Map<string, ShortenedDay>();
    // keep custom ones not in default
    shortenedDays.forEach((sd) => mergedMap.set(sd.date, sd));
    DEFAULT_ISRAELI_SHORTENED_DAYS_2026.forEach((sd) => mergedMap.set(sd.date, sd));

    const updated = Array.from(mergedMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    setShortenedDays(updated);
    onChange({ shortenedDays: updated });

    if (onToast) onToast('רשימת ערבי החג והמועדים המקוצרים נטענה בהצלחה');
  };

  const filteredDays = useMemo(() => {
    return shortenedDays.filter((sd) => {
      const matchQuery =
        !searchQuery ||
        sd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sd.date.includes(searchQuery) ||
        (sd.notes && sd.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchYear =
        selectedYearFilter === 'all' || sd.date.startsWith(selectedYearFilter);

      return matchQuery && matchYear;
    });
  }, [shortenedDays, searchQuery, selectedYearFilter]);

  const totalDeductedHours = useMemo(() => {
    return filteredDays.reduce((acc, sd) => {
      return acc + Math.max(0, standardDaily - sd.workingHours);
    }, 0);
  }, [filteredDays, standardDaily]);

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">
                ניהול ימים מקוצרים וערבי חג
              </h3>
              <p className="text-xs text-slate-500">
                הגדרת ימים שבהם שעות העבודה קצרות מיום רגיל (למשל ערבי חג, פורים, ימי קיץ מיוחדים)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDefaultHolidays}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>טען ערבי חג ישראליים ל-2026</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף יום מקוצר חדש</span>
            </button>
          </div>
        </div>

        {/* Explain Card */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">כיצד משפיעים ימים מקוצרים על המערכת?</span>
            <p className="text-blue-800/90 text-[11px] leading-relaxed">
              כאשר יום מסוים מוגדר כיום מקוצר, המערכת מחשבת אוטומטית את שעות החסר (שעות יום רגיל בניכוי
              שעות העבודה ביום המקוצר) ומקזזת אותן מקיבולת הברוטו של כלל העובדים.
              בנוסף, ימים אלו מודגשים במיוחד בלוח השנה ובלוח הגאנט.
            </p>
          </div>
        </div>

        {/* Add Form (Collapsible) */}
        {showAddForm && (
          <form
            onSubmit={handleAddDay}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-xs text-slate-800">הגדרת יום מקוצר חדש</span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ביטול
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">תאריך</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  שם המועד / כותרת
                </label>
                <input
                  type="text"
                  required
                  placeholder="למשל: ערב פסח, יום פורים"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  שעות עבודה בפועל ביום זה
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={standardDaily}
                    step="0.5"
                    required
                    value={newHours}
                    onChange={(e) => setNewHours(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-center"
                  />
                  <span className="text-xs text-slate-500">
                    שעות (קיזוז {Math.max(0, standardDaily - newHours)} שעות)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Title Chips */}
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">קיצורי דרך נפוצים:</span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_HOLIDAY_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNewTitle(preset.title);
                      setNewHours(preset.hours);
                      if (preset.notes) setNewNotes(preset.notes);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    {preset.title} ({preset.hours} שעות)
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                הערות נוספות (אופציונלי)
              </label>
              <input
                type="text"
                placeholder="למשל: יציאה מוקדמת בשעה 13:00"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                סגור
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs"
              >
                שמור יום מקוצר
              </button>
            </div>
          </form>
        )}

        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש מועד או תאריך..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span>סינון שנה:</span>
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700"
              >
                <option value="all">כל השנים</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

            <span className="font-semibold text-slate-700">
              מוצגים {filteredDays.length} מועדים (קיזוז מצטבר: {totalDeductedHours} שעות)
            </span>
          </div>
        </div>

        {/* Table of Shortened Days */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="py-2.5 px-3 font-semibold">תאריך</th>
                <th className="py-2.5 px-3 font-semibold">יום בשבוע</th>
                <th className="py-2.5 px-3 font-semibold">שם המועד / אירוע</th>
                <th className="py-2.5 px-3 font-semibold text-center">שעות עבודה ביום זה</th>
                <th className="py-2.5 px-3 font-semibold text-center">קיזוז מהתקן היומי</th>
                <th className="py-2.5 px-3 font-semibold">הערות</th>
                <th className="py-2.5 px-3 font-semibold text-center">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDays.map((item) => {
                const itemDate = new Date(item.date);
                const dayName = [
                  'ראשון',
                  'שני',
                  'שלישי',
                  'רביעי',
                  'חמישי',
                  'שישי',
                  'שבת',
                ][itemDate.getDay()];
                const reduction = Math.max(0, standardDaily - item.workingHours);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {item.date}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">יום {dayName}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {item.title}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                        {item.workingHours} שעות
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                        -{reduction} שעות
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={item.notes}>
                      {item.notes || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteDay(item.id, item.title)}
                        title="הסר יום מקוצר"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredDays.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    לא נמצאו ימים מקוצרים תואמים לחיפוש.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
