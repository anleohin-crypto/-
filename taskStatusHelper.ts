import { AppSettings, TaskStatusConfig, StatusCategory, DEFAULT_TASK_STATUSES } from '../types';

export interface StatusColorOption {
  id: string;
  name: string;
  badgeClass: string;
  borderClass: string;
  dotClass: string;
  bgHex: string;
}

export const STATUS_COLORS: Record<string, StatusColorOption> = {
  blue: {
    id: 'blue',
    name: 'כחול',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    borderClass: 'border-blue-400',
    dotClass: 'bg-blue-600',
    bgHex: '#3b82f6',
  },
  emerald: {
    id: 'emerald',
    name: 'ירוק',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderClass: 'border-emerald-400',
    dotClass: 'bg-emerald-600',
    bgHex: '#10b981',
  },
  amber: {
    id: 'amber',
    name: 'ענבר / צהוב',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    borderClass: 'border-amber-400',
    dotClass: 'bg-amber-500',
    bgHex: '#f59e0b',
  },
  rose: {
    id: 'rose',
    name: 'אדום / ורוד',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    borderClass: 'border-rose-400',
    dotClass: 'bg-rose-600',
    bgHex: '#f43f5e',
  },
  purple: {
    id: 'purple',
    name: 'סגול',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    borderClass: 'border-purple-400',
    dotClass: 'bg-purple-600',
    bgHex: '#a855f7',
  },
  indigo: {
    id: 'indigo',
    name: 'אינדיגו',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    borderClass: 'border-indigo-400',
    dotClass: 'bg-indigo-600',
    bgHex: '#6366f1',
  },
  cyan: {
    id: 'cyan',
    name: 'טורקיז / ציאן',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    borderClass: 'border-cyan-400',
    dotClass: 'bg-cyan-600',
    bgHex: '#06b6d4',
  },
  teal: {
    id: 'teal',
    name: 'ירקרק (Teal)',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    borderClass: 'border-teal-400',
    dotClass: 'bg-teal-600',
    bgHex: '#14b8a6',
  },
  orange: {
    id: 'orange',
    name: 'כתום',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    borderClass: 'border-orange-400',
    dotClass: 'bg-orange-500',
    bgHex: '#f97316',
  },
  slate: {
    id: 'slate',
    name: 'אפור',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    borderClass: 'border-slate-400',
    dotClass: 'bg-slate-500',
    bgHex: '#64748b',
  },
};

export const CATEGORY_LABELS: Record<StatusCategory, { label: string; description: string }> = {
  not_started: {
    label: 'טרם החל / בתכנון',
    description: 'משימות שטרם נכנסו לעבודה פעילה',
  },
  in_progress: {
    label: 'בביצוע / פעיל',
    description: 'משימות בעבודה שוטפת',
  },
  waiting: {
    label: 'בהמתנה / חיצוני',
    description: 'ממתין למידע מלקוח, אישורים או בדיקות',
  },
  delayed: {
    label: 'מעוכב / בסיכון',
    description: 'משימות חסומות או באיחור הדורשות תשומת לב',
  },
  completed: {
    label: 'הושלם / סגור',
    description: 'משימות שהסתיימו (אינן מעמיסות על קיבולת פתוחה)',
  },
  cancelled: {
    label: 'בוטל',
    description: 'משימות שלא יבוצעו',
  },
};

/**
 * Get the list of active task statuses configured in settings, or the defaults
 */
export function getTaskStatuses(settings?: AppSettings): TaskStatusConfig[] {
  if (settings?.taskStatuses && settings.taskStatuses.length > 0) {
    return [...settings.taskStatuses].sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return DEFAULT_TASK_STATUSES;
}

/**
 * Get config for a specific status name
 */
export function getTaskStatusConfig(statusName: string, settings?: AppSettings): TaskStatusConfig {
  const statuses = getTaskStatuses(settings);
  const found = statuses.find((s) => s.name === statusName || s.id === statusName);
  if (found) return found;

  // Fallbacks for legacy standard names
  if (statusName === 'הושלם') {
    return {
      id: 'status-completed',
      name: 'הושלם',
      category: 'completed',
      color: 'emerald',
      isClosed: true,
      order: 99,
    };
  }
  if (statusName === 'בוטל') {
    return {
      id: 'status-cancelled',
      name: 'בוטל',
      category: 'cancelled',
      color: 'slate',
      isClosed: true,
      order: 100,
    };
  }
  if (statusName === 'מעוכב') {
    return {
      id: 'status-delayed',
      name: 'מעוכב',
      category: 'delayed',
      color: 'rose',
      isClosed: false,
      order: 5,
    };
  }
  if (statusName === 'בביצוע') {
    return {
      id: 'status-in-progress',
      name: 'בביצוע',
      category: 'in_progress',
      color: 'blue',
      isClosed: false,
      order: 3,
    };
  }
  if (statusName === 'ממתין') {
    return {
      id: 'status-waiting',
      name: 'ממתין',
      category: 'waiting',
      color: 'amber',
      isClosed: false,
      order: 4,
    };
  }

  // Unknown custom status fallback
  return {
    id: `custom-${statusName}`,
    name: statusName,
    category: 'in_progress',
    color: 'slate',
    isClosed: false,
    order: 999,
  };
}

/**
 * Check if a task status is closed (completed or cancelled)
 */
export function isTaskClosed(statusName: string, settings?: AppSettings): boolean {
  if (statusName === 'הושלם' || statusName === 'בוטל') return true;
  const cfg = getTaskStatusConfig(statusName, settings);
  return cfg.isClosed || cfg.category === 'completed' || cfg.category === 'cancelled';
}

/**
 * Check if a task status indicates delay/blocker
 */
export function isTaskDelayed(statusName: string, settings?: AppSettings): boolean {
  if (statusName === 'מעוכב') return true;
  const cfg = getTaskStatusConfig(statusName, settings);
  return cfg.category === 'delayed';
}

/**
 * Get badge styling classes for a status
 */
export function getStatusStyle(statusName: string, settings?: AppSettings): {
  badgeClass: string;
  dotClass: string;
  bgHex: string;
} {
  const cfg = getTaskStatusConfig(statusName, settings);
  const colorMeta = STATUS_COLORS[cfg.color] || STATUS_COLORS.slate;
  return {
    badgeClass: `border ${colorMeta.badgeClass}`,
    dotClass: colorMeta.dotClass,
    bgHex: colorMeta.bgHex,
  };
}
