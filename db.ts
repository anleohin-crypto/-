import {
  Employee,
  Client,
  Project,
  Task,
  TaskAllocation,
  FixedAllocation,
  Absence,
  MonthlyCapacityOverride,
  NotificationItem,
  AuditLog,
  AppSettings,
  User,
  Team,
  AbsenceRequest,
  TaskStatusConfig,
  TaskStatusHistory,
  PlanningBaseline,
  PlanningScenario,
} from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_EMPLOYEES,
  INITIAL_CLIENTS,
  INITIAL_PROJECTS,
  INITIAL_MONTHLY_CAPACITIES,
  INITIAL_FIXED_ALLOCATIONS,
  INITIAL_ABSENCES,
  INITIAL_TASKS,
  INITIAL_TASK_ALLOCATIONS,
  INITIAL_USERS,
  INITIAL_TEAMS,
  INITIAL_ABSENCE_REQUESTS,
  INITIAL_DYNAMIC_STATUSES,
} from './demoData';

const STORAGE_KEYS = {
  SETTINGS: 'tc_cloud_settings_v2',
  USERS: 'tc_cloud_users_v2',
  TEAMS: 'tc_cloud_teams_v2',
  EMPLOYEES: 'tc_cloud_employees_v2',
  CLIENTS: 'tc_cloud_clients_v2',
  PROJECTS: 'tc_cloud_projects_v2',
  TASKS: 'tc_cloud_tasks_v2',
  TASK_ALLOCATIONS: 'tc_cloud_task_allocations_v2',
  MONTHLY_CAPACITIES: 'tc_cloud_monthly_capacities_v2',
  FIXED_ALLOCATIONS: 'tc_cloud_fixed_allocations_v2',
  ABSENCES: 'tc_cloud_absences_v2',
  ABSENCE_REQUESTS: 'tc_cloud_absence_requests_v2',
  TASK_STATUSES: 'tc_cloud_task_statuses_v2',
  TASK_STATUS_HISTORY: 'tc_cloud_task_status_history_v2',
  NOTIFICATIONS: 'tc_cloud_notifications_v2',
  AUDIT_LOGS: 'tc_cloud_audit_logs_v2',
  MIGRATION_META: 'tc_cloud_migration_meta_v2',
  CURRENT_USER_SESSION: 'tc_cloud_session_user_v2',
  PLANNING_BASELINES: 'tc_cloud_planning_baselines_v3',
  PLANNING_SCENARIOS: 'tc_cloud_planning_scenarios_v3',
};

// Real-time multi-tab / window sync channel
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('capacity_pro_realtime_sync');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported', e);
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Error reading key ${key} from storage:`, e);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Broadcast change to other tabs
    if (syncChannel) {
      syncChannel.postMessage({ type: 'DATA_SYNC', key, timestamp: Date.now() });
    }
  } catch (e) {
    console.warn(`Error writing key ${key} to storage:`, e);
  }
}

export const DataLayer = {
  // Real-time synchronization subscription
  subscribeToSync(callback: (key: string) => void): () => void {
    const channelHandler = (event: MessageEvent) => {
      if (event.data?.type === 'DATA_SYNC' && event.data?.key) {
        callback(event.data.key);
      }
    };
    if (syncChannel) {
      syncChannel.addEventListener('message', channelHandler);
    }
    const storageHandler = (event: StorageEvent) => {
      if (event.key) {
        callback(event.key);
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      if (syncChannel) {
        syncChannel.removeEventListener('message', channelHandler);
      }
      window.removeEventListener('storage', storageHandler);
    };
  },

  // USERS
  getUsers(): User[] {
    return safeGet<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },
  saveUsers(users: User[]): void {
    safeSet(STORAGE_KEYS.USERS, users);
  },
  getUserById(uid: string): User | undefined {
    return this.getUsers().find((u) => u.uid === uid);
  },
  getUserByEmployeeNumber(empNo: string): User | undefined {
    return this.getUsers().find((u) => u.employeeNumber === empNo);
  },

  // TEAMS
  getTeams(): Team[] {
    return safeGet<Team[]>(STORAGE_KEYS.TEAMS, INITIAL_TEAMS);
  },
  saveTeams(teams: Team[]): void {
    safeSet(STORAGE_KEYS.TEAMS, teams);
  },

  // EMPLOYEES
  getEmployees(): Employee[] {
    return safeGet<Employee[]>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
  },
  saveEmployees(employees: Employee[]): void {
    safeSet(STORAGE_KEYS.EMPLOYEES, employees);
  },

  // CLIENTS
  getClients(): Client[] {
    return safeGet<Client[]>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
  },
  saveClients(clients: Client[]): void {
    safeSet(STORAGE_KEYS.CLIENTS, clients);
  },

  // PROJECTS
  getProjects(): Project[] {
    return safeGet<Project[]>(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
  },
  saveProjects(projects: Project[]): void {
    safeSet(STORAGE_KEYS.PROJECTS, projects);
  },

  // TASKS
  getTasks(): Task[] {
    return safeGet<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
  },
  saveTasks(tasks: Task[]): void {
    safeSet(STORAGE_KEYS.TASKS, tasks);
  },

  // PLANNING BASELINES
  getPlanningBaselines(): PlanningBaseline[] {
    return safeGet<PlanningBaseline[]>(STORAGE_KEYS.PLANNING_BASELINES, []);
  },
  savePlanningBaselines(items: PlanningBaseline[]): void {
    safeSet(STORAGE_KEYS.PLANNING_BASELINES, items);
  },

  // PLANNING SCENARIOS
  getPlanningScenarios(): PlanningScenario[] {
    return safeGet<PlanningScenario[]>(STORAGE_KEYS.PLANNING_SCENARIOS, []);
  },
  savePlanningScenarios(items: PlanningScenario[]): void {
    safeSet(STORAGE_KEYS.PLANNING_SCENARIOS, items);
  },

  // TASK ALLOCATIONS
  getTaskAllocations(): TaskAllocation[] {
    return safeGet<TaskAllocation[]>(STORAGE_KEYS.TASK_ALLOCATIONS, INITIAL_TASK_ALLOCATIONS);
  },
  saveTaskAllocations(allocations: TaskAllocation[]): void {
    safeSet(STORAGE_KEYS.TASK_ALLOCATIONS, allocations);
  },

  // MONTHLY CAPACITIES
  getMonthlyCapacities(): MonthlyCapacityOverride[] {
    return safeGet<MonthlyCapacityOverride[]>(STORAGE_KEYS.MONTHLY_CAPACITIES, INITIAL_MONTHLY_CAPACITIES);
  },
  saveMonthlyCapacities(capacities: MonthlyCapacityOverride[]): void {
    safeSet(STORAGE_KEYS.MONTHLY_CAPACITIES, capacities);
  },

  // FIXED ALLOCATIONS
  getFixedAllocations(): FixedAllocation[] {
    return safeGet<FixedAllocation[]>(STORAGE_KEYS.FIXED_ALLOCATIONS, INITIAL_FIXED_ALLOCATIONS);
  },
  saveFixedAllocations(fixed: FixedAllocation[]): void {
    safeSet(STORAGE_KEYS.FIXED_ALLOCATIONS, fixed);
  },

  // ABSENCES
  getAbsences(): Absence[] {
    return safeGet<Absence[]>(STORAGE_KEYS.ABSENCES, INITIAL_ABSENCES);
  },
  saveAbsences(absences: Absence[]): void {
    safeSet(STORAGE_KEYS.ABSENCES, absences);
  },

  // ABSENCE REQUESTS (Workflow)
  getAbsenceRequests(): AbsenceRequest[] {
    return safeGet<AbsenceRequest[]>(STORAGE_KEYS.ABSENCE_REQUESTS, INITIAL_ABSENCE_REQUESTS);
  },
  saveAbsenceRequests(requests: AbsenceRequest[]): void {
    safeSet(STORAGE_KEYS.ABSENCE_REQUESTS, requests);
  },

  // TASK STATUSES (Dynamic configuration)
  getTaskStatuses(): TaskStatusConfig[] {
    const saved = safeGet<TaskStatusConfig[]>(STORAGE_KEYS.TASK_STATUSES, INITIAL_DYNAMIC_STATUSES);
    if (!saved || saved.length === 0) return INITIAL_DYNAMIC_STATUSES;
    return saved.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  saveTaskStatuses(statuses: TaskStatusConfig[]): void {
    safeSet(STORAGE_KEYS.TASK_STATUSES, statuses);
  },

  // TASK STATUS HISTORY
  getTaskStatusHistory(): TaskStatusHistory[] {
    return safeGet<TaskStatusHistory[]>(STORAGE_KEYS.TASK_STATUS_HISTORY, []);
  },
  saveTaskStatusHistory(history: TaskStatusHistory[]): void {
    safeSet(STORAGE_KEYS.TASK_STATUS_HISTORY, history);
  },
  logTaskStatusChange(change: Omit<TaskStatusHistory, 'id' | 'changedAt'>): void {
    const history = this.getTaskStatusHistory();
    const entry: TaskStatusHistory = {
      ...change,
      id: 'tsh-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      changedAt: new Date().toISOString(),
    };
    history.unshift(entry);
    if (history.length > 500) history.pop();
    this.saveTaskStatusHistory(history);
  },

  // NOTIFICATIONS
  getNotifications(): NotificationItem[] {
    return safeGet<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  },
  saveNotifications(notifications: NotificationItem[]): void {
    safeSet(STORAGE_KEYS.NOTIFICATIONS, notifications);
  },

  // AUDIT LOGS
  getAuditLogs(): AuditLog[] {
    return safeGet<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  },
  saveAuditLogs(logs: AuditLog[]): void {
    safeSet(STORAGE_KEYS.AUDIT_LOGS, logs);
  },
  logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...entry,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    if (logs.length > 1000) logs.pop();
    this.saveAuditLogs(logs);
  },

  // SETTINGS
  getSettings(): AppSettings {
    const saved = safeGet<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    return {
      ...INITIAL_SETTINGS,
      ...saved,
      taskStatuses: this.getTaskStatuses(),
    };
  },
  saveSettings(settings: AppSettings): void {
    safeSet(STORAGE_KEYS.SETTINGS, settings);
  },

  // SESSION & CURRENT USER
  getCurrentUserSession(): User | null {
    return safeGet<User | null>(STORAGE_KEYS.CURRENT_USER_SESSION, INITIAL_USERS[0]);
  },
  setCurrentUserSession(user: User | null): void {
    safeSet(STORAGE_KEYS.CURRENT_USER_SESSION, user);
  },

  // MIGRATION HELPER
  getMigrationMeta(): { migrated: boolean; timestamp?: string; count?: number } {
    return safeGet(STORAGE_KEYS.MIGRATION_META, { migrated: true });
  },
  markMigrationCompleted(count: number): void {
    safeSet(STORAGE_KEYS.MIGRATION_META, {
      migrated: true,
      timestamp: new Date().toISOString(),
      count,
    });
  },

  // RESET DATABASE
  resetDatabase(): void {
    safeSet(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    safeSet(STORAGE_KEYS.USERS, INITIAL_USERS);
    safeSet(STORAGE_KEYS.TEAMS, INITIAL_TEAMS);
    safeSet(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    safeSet(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    safeSet(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    safeSet(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    safeSet(STORAGE_KEYS.TASK_ALLOCATIONS, INITIAL_TASK_ALLOCATIONS);
    safeSet(STORAGE_KEYS.MONTHLY_CAPACITIES, INITIAL_MONTHLY_CAPACITIES);
    safeSet(STORAGE_KEYS.FIXED_ALLOCATIONS, INITIAL_FIXED_ALLOCATIONS);
    safeSet(STORAGE_KEYS.ABSENCES, INITIAL_ABSENCES);
    safeSet(STORAGE_KEYS.ABSENCE_REQUESTS, INITIAL_ABSENCE_REQUESTS);
    safeSet(STORAGE_KEYS.TASK_STATUSES, INITIAL_DYNAMIC_STATUSES);
    safeSet(STORAGE_KEYS.TASK_STATUS_HISTORY, []);
    safeSet(STORAGE_KEYS.NOTIFICATIONS, []);
    safeSet(STORAGE_KEYS.AUDIT_LOGS, []);
    safeSet(STORAGE_KEYS.CURRENT_USER_SESSION, INITIAL_USERS[0]);
    safeSet(STORAGE_KEYS.PLANNING_BASELINES, []);
    safeSet(STORAGE_KEYS.PLANNING_SCENARIOS, []);
  },
};
