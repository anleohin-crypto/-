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
import { DataLayer } from './db';

export const StorageService = {
  // Settings
  getSettings(): AppSettings {
    return DataLayer.getSettings();
  },
  saveSettings(settings: AppSettings): void {
    DataLayer.saveSettings(settings);
  },

  // Users & Auth
  getUsers(): User[] {
    return DataLayer.getUsers();
  },
  saveUsers(users: User[]): void {
    DataLayer.saveUsers(users);
  },

  // Teams
  getTeams(): Team[] {
    return DataLayer.getTeams();
  },
  saveTeams(teams: Team[]): void {
    DataLayer.saveTeams(teams);
  },

  // Employees
  getEmployees(): Employee[] {
    return DataLayer.getEmployees();
  },
  saveEmployees(employees: Employee[]): void {
    DataLayer.saveEmployees(employees);
  },

  // Clients
  getClients(): Client[] {
    return DataLayer.getClients();
  },
  saveClients(clients: Client[]): void {
    DataLayer.saveClients(clients);
  },

  // Projects
  getProjects(): Project[] {
    return DataLayer.getProjects();
  },
  saveProjects(projects: Project[]): void {
    DataLayer.saveProjects(projects);
  },

  // Tasks
  getTasks(): Task[] {
    return DataLayer.getTasks();
  },
  saveTasks(tasks: Task[]): void {
    DataLayer.saveTasks(tasks);
  },

  // Planning Baselines
  getPlanningBaselines(): PlanningBaseline[] { return DataLayer.getPlanningBaselines(); },
  savePlanningBaselines(items: PlanningBaseline[]): void { DataLayer.savePlanningBaselines(items); },

  // Planning Scenarios
  getPlanningScenarios(): PlanningScenario[] { return DataLayer.getPlanningScenarios(); },
  savePlanningScenarios(items: PlanningScenario[]): void { DataLayer.savePlanningScenarios(items); },

  // Task Allocations
  getTaskAllocations(): TaskAllocation[] {
    return DataLayer.getTaskAllocations();
  },
  saveTaskAllocations(allocations: TaskAllocation[]): void {
    DataLayer.saveTaskAllocations(allocations);
  },

  // Monthly Capacities
  getMonthlyCapacities(): MonthlyCapacityOverride[] {
    return DataLayer.getMonthlyCapacities();
  },
  saveMonthlyCapacities(capacities: MonthlyCapacityOverride[]): void {
    DataLayer.saveMonthlyCapacities(capacities);
  },

  // Fixed Allocations
  getFixedAllocations(): FixedAllocation[] {
    return DataLayer.getFixedAllocations();
  },
  saveFixedAllocations(fixed: FixedAllocation[]): void {
    DataLayer.saveFixedAllocations(fixed);
  },

  // Absences
  getAbsences(): Absence[] {
    return DataLayer.getAbsences();
  },
  saveAbsences(absences: Absence[]): void {
    DataLayer.saveAbsences(absences);
  },

  // Absence Requests
  getAbsenceRequests(): AbsenceRequest[] {
    return DataLayer.getAbsenceRequests();
  },
  saveAbsenceRequests(requests: AbsenceRequest[]): void {
    DataLayer.saveAbsenceRequests(requests);
  },

  // Task Statuses
  getTaskStatuses(): TaskStatusConfig[] {
    return DataLayer.getTaskStatuses();
  },
  saveTaskStatuses(statuses: TaskStatusConfig[]): void {
    DataLayer.saveTaskStatuses(statuses);
  },

  // Task Status History
  getTaskStatusHistory(): TaskStatusHistory[] {
    return DataLayer.getTaskStatusHistory();
  },
  saveTaskStatusHistory(history: TaskStatusHistory[]): void {
    DataLayer.saveTaskStatusHistory(history);
  },
  logTaskStatusChange(change: Omit<TaskStatusHistory, 'id' | 'changedAt'>): void {
    DataLayer.logTaskStatusChange(change);
  },

  // Notifications
  getNotifications(): NotificationItem[] {
    return DataLayer.getNotifications();
  },
  saveNotifications(notifications: NotificationItem[]): void {
    DataLayer.saveNotifications(notifications);
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return DataLayer.getAuditLogs();
  },
  saveAuditLogs(logs: AuditLog[]): void {
    DataLayer.saveAuditLogs(logs);
  },
  logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    DataLayer.logAudit(entry);
  },
  clearAuditLogs(): void {
    DataLayer.saveAuditLogs([]);
  },


  createInternalSnapshot(reason = 'automatic'): void {
    try {
      const key = 'ltm_internal_snapshots_v1';
      const raw = localStorage.getItem(key);
      const snapshots = raw ? JSON.parse(raw) : [];
      const today = new Date().toISOString().slice(0,10);
      if (snapshots.some((x: any) => x.date === today && x.reason === reason)) return;
      snapshots.unshift({ id: `snap-${Date.now()}`, date: today, timestamp: new Date().toISOString(), reason, payload: this.exportFullBackup() });
      localStorage.setItem(key, JSON.stringify(snapshots.slice(0, 14)));
    } catch (e) { console.warn('Internal snapshot failed', e); }
  },

  getInternalSnapshots(): { id:string; date:string; timestamp:string; reason:string; payload:string }[] {
    try { return JSON.parse(localStorage.getItem('ltm_internal_snapshots_v1') || '[]'); } catch { return []; }
  },

  // Database Reset
  resetToDemo(): void {
    DataLayer.resetDatabase();
  },

  // Backups
  exportFullBackup(): string {
    const data = {
      settings: this.getSettings(),
      users: this.getUsers(),
      teams: this.getTeams(),
      employees: this.getEmployees(),
      clients: this.getClients(),
      projects: this.getProjects(),
      tasks: this.getTasks(),
      planningBaselines: this.getPlanningBaselines(),
      planningScenarios: this.getPlanningScenarios(),
      taskAllocations: this.getTaskAllocations(),
      monthlyCapacities: this.getMonthlyCapacities(),
      fixedAllocations: this.getFixedAllocations(),
      absences: this.getAbsences(),
      absenceRequests: this.getAbsenceRequests(),
      taskStatuses: this.getTaskStatuses(),
      taskStatusHistory: this.getTaskStatusHistory(),
      notifications: this.getNotifications(),
      auditLogs: this.getAuditLogs(),
      backupTimestamp: new Date().toISOString(),
      version: '1.1.0-desktop',
    };
    return JSON.stringify(data, null, 2);
  },

  exportBackupJSON(): string {
    return this.exportFullBackup();
  },

  importFullBackup(jsonString: string): boolean {
    let rollback: any | null = null;
    const apply = (data: any) => {
      if (data.users) this.saveUsers(data.users);
      if (data.teams) this.saveTeams(data.teams);
      if (data.employees) this.saveEmployees(data.employees);
      if (data.clients) this.saveClients(data.clients);
      if (data.projects) this.saveProjects(data.projects);
      if (data.tasks) this.saveTasks(data.tasks);
      if (data.planningBaselines) this.savePlanningBaselines(data.planningBaselines);
      if (data.planningScenarios) this.savePlanningScenarios(data.planningScenarios);
      if (data.taskAllocations) this.saveTaskAllocations(data.taskAllocations);
      if (data.monthlyCapacities) this.saveMonthlyCapacities(data.monthlyCapacities);
      if (data.fixedAllocations) this.saveFixedAllocations(data.fixedAllocations);
      if (data.absences) this.saveAbsences(data.absences);
      if (data.absenceRequests) this.saveAbsenceRequests(data.absenceRequests);
      if (data.taskStatuses) this.saveTaskStatuses(data.taskStatuses);
      if (data.taskStatusHistory) this.saveTaskStatusHistory(data.taskStatusHistory);
      if (data.notifications) this.saveNotifications(data.notifications);
      if (data.auditLogs) this.saveAuditLogs(data.auditLogs);
      if (data.settings) this.saveSettings(data.settings);
    };

    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Backup payload must be a JSON object');
      }

      // Validate all known collection fields before writing anything. This prevents
      // a malformed backup from being partially applied to the current data set.
      const collectionKeys = [
        'users', 'teams', 'employees', 'clients', 'projects', 'tasks',
        'planningBaselines', 'planningScenarios', 'taskAllocations',
        'monthlyCapacities', 'fixedAllocations', 'absences', 'absenceRequests',
        'taskStatuses', 'taskStatusHistory', 'notifications', 'auditLogs',
      ] as const;
      for (const key of collectionKeys) {
        if (key in data && !Array.isArray(data[key])) {
          throw new Error(`Backup field ${key} must be an array`);
        }
      }
      if ('settings' in data && (data.settings === null || typeof data.settings !== 'object' || Array.isArray(data.settings))) {
        throw new Error('Backup field settings must be an object');
      }

      // Keep a complete in-memory rollback point. Validation protects against bad files;
      // this rollback additionally protects against a storage/write failure half way through restore.
      rollback = JSON.parse(this.exportFullBackup());
      apply(data);
      return true;
    } catch (e) {
      console.error('Backup import error', e);
      if (rollback) {
        try {
          apply(rollback);
        } catch (rollbackError) {
          console.error('Backup rollback failed', rollbackError);
        }
      }
      return false;
    }
  },

  restoreBackupJSON(jsonString: string): boolean {
    return this.importFullBackup(jsonString);
  },
};
