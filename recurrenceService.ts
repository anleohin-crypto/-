import { TaskRecurrence } from '../types';

const iso = (d: Date) => d.toISOString().slice(0,10);
const parse = (s: string) => new Date(`${s}T12:00:00`);

export function generateOccurrenceDates(r?: TaskRecurrence): string[] {
  if (!r || r.mode === 'none') return [];
  if (r.mode === 'specific_dates') return [...new Set((r.specificDates || []).filter(Boolean))].sort();
  if (!r.startDate || !r.endDate) return [];
  const start = parse(r.startDate); const end = parse(r.endDate);
  if (start > end) return [];
  const exceptions = new Set(r.exceptionDates || []);
  const out:string[]=[];

  if (r.mode === 'weekly') {
    const target = r.dayOfWeek ?? start.getDay();
    const d = new Date(start);
    while (d <= end) { if (d.getDay() === target && !exceptions.has(iso(d))) out.push(iso(d)); d.setDate(d.getDate()+1); }
  }

  if (r.mode === 'monthly_day') {
    const day = Math.min(31, Math.max(1, r.dayOfMonth ?? start.getDate()));
    const cur = new Date(start.getFullYear(), start.getMonth(), 1, 12);
    while (cur <= end) {
      const candidate = new Date(cur.getFullYear(), cur.getMonth(), day, 12);
      if (candidate.getMonth() === cur.getMonth() && candidate >= start && candidate <= end && !exceptions.has(iso(candidate))) out.push(iso(candidate));
      cur.setMonth(cur.getMonth()+1);
    }
  }

  if (r.mode === 'monthly_weekday') {
    const weekday = r.dayOfWeek ?? start.getDay(); const week = Math.min(5,Math.max(1,r.weekOfMonth ?? 1));
    const cur = new Date(start.getFullYear(), start.getMonth(), 1, 12);
    while (cur <= end) {
      const first = new Date(cur.getFullYear(), cur.getMonth(), 1, 12);
      const delta = (weekday - first.getDay() + 7) % 7;
      const candidate = new Date(cur.getFullYear(), cur.getMonth(), 1 + delta + (week-1)*7, 12);
      if (candidate.getMonth() === cur.getMonth() && candidate >= start && candidate <= end && !exceptions.has(iso(candidate))) out.push(iso(candidate));
      cur.setMonth(cur.getMonth()+1);
    }
  }
  return [...new Set(out)].sort();
}

export function recurrenceToMonthlyAllocations(r?: TaskRecurrence): { month:string; hours:number }[] {
  if (!r || r.mode === 'none') return [];
  const map = new Map<string, number>();
  for (const d of generateOccurrenceDates(r)) {
    const month = d.slice(0,7); map.set(month, (map.get(month)||0) + Math.max(0,r.hoursPerOccurrence||0));
  }
  return [...map.entries()].sort().map(([month,hours])=>({month,hours:Math.round(hours*100)/100}));
}
