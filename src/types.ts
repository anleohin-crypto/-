export type Priority = 'נמוכה' | 'רגילה' | 'גבוהה' | 'קריטית';

export type StatusCategory =
  | 'not_started'
  | 'in_progress'
  | 'waiting'
  | 'delayed'
  | 'completed'
  | 'cancelled';

export type AppRole = 'ADMIN' | 'TEAM_MANAGER' | 'EMPLOYEE';

export interface TaskStatusConfig {
  id: string;
  code?: string;
  name: string;
  nameHe?: string;
  category: StatusCategory;
  color: string; // 'slate' | 'blue' | 'indigo' | 'amber' | 'rose' | 'emerald' | 'purple' | 'cyan' | 'teal' | 'orange' or hex
  description?: string;
  isClosed: boolean;
  isDefault?: boolean;
  active?: boolean;
  order: number;
  allowedRoles?: AppRole[];
  allowedTransitions?: string[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TaskStatusHistory {
  id: string;
  taskId: string;
  fromStatusId: string;
  toStatusId: string;
  changedAt: string;
  changedBy: string;
  comment?: string;
}

export interface User {
  uid: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  title?: string;
  role: AppRole;
  teamId?: string;
  managerId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  managerId?: string;
}

export type AbsenceRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type AbsenceRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AbsenceRequest {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  teamId?: string;
  absenceType: AbsenceType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  partialDay: boolean;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  hours: number;
  reason: string;
  status: AbsenceRequestStatus;
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  managerComment?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  riskLevel?: AbsenceRiskLevel;
}

export interface AbsenceImpactAnalysis {
  affectedWorkDays: number;
  hoursDeducted: number;
  capacityBefore: number;
  capacityAfter: number;
  utilizationBefore: number;
  utilizationAfter: number;
  conflictingTaskHours: number;
  conflictingTasksCount: number;
  deadlinesCount: number;
  criticalTasks: Task[];
  hasSufficientCapacity: boolean;
  uncoveredHours: number;
  billableImpactHours: number;
  nonBillableImpactHours: number;
  idleImpactHours: number;
  riskLevel: AbsenceRiskLevel;
  managerSummary: string;
  recommendations: string[];
  availableColleagues: {
    employeeId: string;
    employeeName: string;
    role: string;
    freeCapacity: number;
    utilization: number;
    isViableCandidate: boolean;
    reason: string;
  }[];
}

export const DEFAULT_TASK_STATUSES: TaskStatusConfig[] = [
  {
    id: 'status-new',
    name: 'חדש',
    category: 'not_started',
    color: 'slate',
    description: 'משימה חדשה שטרם תוכננה',
    isClosed: false,
    isDefault: true,
    order: 1,
  },
  {
    id: 'status-planned',
    name: 'מתוכנן',
    category: 'not_started',
    color: 'indigo',
    description: 'משימה שתוכננה וממתינה לתחילת עבודה',
    isClosed: false,
    order: 2,
  },
  {
    id: 'status-in-progress',
    name: 'בביצוע',
    category: 'in_progress',
    color: 'blue',
    description: 'משימה בעבודה שוטפת ופעילה',
    isClosed: false,
    order: 3,
  },
  {
    id: 'status-waiting',
    name: 'ממתין',
    category: 'waiting',
    color: 'amber',
    description: 'ממתין למידע, אפיון או מענה חיצוני',
    isClosed: false,
    order: 4,
  },
  {
    id: 'status-delayed',
    name: 'מעוכב',
    category: 'delayed',
    color: 'rose',
    description: 'משימה חסומה או מעוכבת הדורשת טיפול',
    isClosed: false,
    order: 5,
  },
  {
    id: 'status-completed',
    name: 'הושלם',
    category: 'completed',
    color: 'emerald',
    description: 'משימה שהסתיימה בהצלחה',
    isClosed: true,
    order: 6,
  },
  {
    id: 'status-cancelled',
    name: 'בוטל',
    category: 'cancelled',
    color: 'slate',
    description: 'משימה שבוטלה ולא תבוצע',
    isClosed: true,
    order: 7,
  },
];

export type TaskStatus = string;

export type DelayReason =
  | 'ממתין ללקוח'
  | 'ממתין לאפיון'
  | 'ממתין לפיתוח'
  | 'ממתין לבדיקה'
  | 'תקלה'
  | 'חוסר קיבולת'
  | 'חופשה / מחלה'
  | 'שינוי עדיפות'
  | 'תלות במשימה אחרת'
  | 'אחר';

export type AbsenceType =
  | 'חופשה'
  | 'חופשה מרוכזת'
  | 'מחלה'
  | 'מילואים'
  | 'חג'
  | 'יום בחירה'
  | 'אחר';

export type UserRole = 'Admin' | 'Team Manager' | 'Employee' | 'Viewer';

export interface Employee {
  id: string;
  employeeNumber?: string;
  name: string;
  email?: string;
  phone?: string;
  role: string; // e.g. "מפתח Fullstack בכיר", "מנתח מערכות"
  department?: string;
  teamId?: string;
  managerId?: string;
  primaryClientId?: string;
  jobPercentage: number; // e.g. 100 for 100%, 80 for 80%
  dailyWorkHours: number; // default 9
  weeklyWorkDays: number; // default 5
  defaultMonthlyHours?: number;
  hourlyCost?: number;
  hourlyBillableRate?: number;
  isActive: boolean;
  startDate: string; // YYYY-MM-DD
  notes?: string;
  avatarColor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isRetainer?: boolean;
  monthlyRetainerHours?: number;
  isActive?: boolean;
  color?: string;
  notes?: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface TaskAllocation {
  id: string;
  taskId: string;
  employeeId: string;
  month: string; // Format: "YYYY-MM", e.g. "2026-09"
  allocatedHours: number;
  notes?: string;
}

export interface Task {
  id: string;
  taskNumber: string; // e.g. "TSK-101"
  name: string;
  description?: string;
  clientId: string;
  projectId?: string;
  assigneeId: string;
  priority: Priority;
  createdAt: string; // YYYY-MM-DD
  plannedStartDate: string; // YYYY-MM-DD
  plannedEndDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  estimatedHours: number;
  actualHours: number;
  remainingHours: number;
  completionPercentage: number; // 0 - 100
  status: TaskStatus;
  isBillable: boolean;
  delayReason?: DelayReason;
  notes?: string;
}

export interface FixedAllocation {
  id: string;
  employeeId: string;
  clientId: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  weeklyDays?: number; // e.g. 3 days per week
  weeklyHours: number; // e.g. 27 hours per week
  isBillable: boolean;
  description?: string;
}

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  hours: number; // Calculated or custom (e.g. 3 days * 9h = 27h)
  isPlanned: boolean;
  notes?: string;
  isTeamWide?: boolean;
  collectiveId?: string;
  collectiveTitle?: string;
}

export interface TeamWideAbsenceInput {
  title: string;
  type?: AbsenceType;
  startDate: string;
  endDate: string;
  hoursCalculationMode: 'employee_daily_hours' | 'fixed_hours';
  fixedHoursPerDay?: number;
  employeeIds: string[];
  notes?: string;
}

export interface MonthlyCapacityOverride {
  id: string;
  employeeId: string;
  month: string; // "YYYY-MM"
  grossHours: number; // custom gross hours for this month
}

export type NotificationSeverity = 'critical' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  severity?: NotificationSeverity;
  title: string;
  message: string;
  targetType?: 'task' | 'employee' | 'capacity' | 'absence';
  targetId?: string;
  linkTo?: string;
  createdAt: string;
  isRead: boolean;
  dismissed?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

export interface ShortenedDay {
  id: string;
  date: string; // YYYY-MM-DD
  title: string; // e.g. "ערב פסח", "ערב ראש השנה"
  workingHours: number; // e.g. 4 or 5
  notes?: string;
}

export type MonthlyStandardHoursMode = 'fixed_standard' | 'dynamic_working_days';

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  name: string; // "ראשון", "שני", ...
  isWorkDay: boolean;
  hours: number;
}

export interface AppSettings {
  defaultDailyHours: number; // default 9
  workingHoursPerDay?: number; // alias for backwards compatibility
  weeklyWorkDays?: number; // default 5
  workDaysOfWeek: number[]; // default [0, 1, 2, 3, 4] (Sun-Thu)
  daySchedules?: DaySchedule[];
  
  // Standard monthly hours for 100% position
  monthlyStandardHoursMode: MonthlyStandardHoursMode; // 'fixed_standard' | 'dynamic_working_days'
  fixedMonthlyStandardHours: number; // default 182 (Israeli standard) or 186
  deductShortenedDaysFromStandard: boolean; // default true
  monthlyStandards?: Record<string, number>; // per-month 100% standard hours overrides (e.g. { "2026-09": 140 })

  // Shortened days / holiday eves
  shortenedDays: ShortenedDay[];

  // Custom Task Statuses managed by Admin
  taskStatuses?: TaskStatusConfig[];

  underAllocationThreshold: number; // default 75 (%)
  normalUtilizationMin?: number;
  normalUtilizationMax?: number;
  overAllocationThreshold: number; // default 100 (%)
  highUtilizationThreshold: number; // default 90 (%)
  upcomingDeadlineDays: number; // default 5 (days)
  workingYear: number; // e.g. 2026
  activeUserRole: UserRole;
  activeUserName: string;
}

export interface EmployeeCapacityMetrics {
  employeeId: string;
  employeeName: string;
  month: string;
  grossCapacity: number;
  absenceHours: number;
  fixedAllocationHours: number;
  netCapacity: number;
  taskAllocatedHours: number;
  totalAllocatedHours: number;
  billableHours: number;
  nonBillableHours: number;
  freeCapacity: number;
  idleHours: number;
  overAllocationHours: number;
  utilizationPercentage: number;
  billableUtilizationPercentage: number;
  status: 'over' | 'high' | 'normal' | 'under';
  contributingTasks: Task[];
}

export interface TeamCapacityMetrics {
  month: string;
  grossCapacity: number;
  absenceHours: number;
  netCapacity: number;
  fixedHours: number;
  taskHours: number;
  totalAllocatedHours: number;
  billableHours: number;
  nonBillableHours: number;
  freeHours: number;
  expectedIdleHours: number;
  overAllocationHours: number;
  utilizationPercentage: number;
  billableUtilizationPercentage: number;
  openTasksCount: number;
  overdueTasksCount: number;
  atRiskTasksCount: number;
  totalRemainingHours: number;
  backlogCoverageMonths: number;
  employeeMetrics: EmployeeCapacityMetrics[];
}
