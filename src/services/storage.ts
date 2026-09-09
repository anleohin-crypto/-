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
      taskAllocations: this.getTaskAllocations(),
      monthlyCapacities: this.getMonthlyCapacities(),
      fixedAllocations: this.getFixedAllocations(),
      absences: this.getAbsences(),
      absenceRequests: this.getAbsenceRequests(),
      taskStatuses: this.getTaskStatuses(),
      notifications: this.getNotifications(),
      auditLogs: this.getAuditLogs(),
      backupTimestamp: new Date().toISOString(),
      version: '2.0-cloud',
    };
    return JSON.stringify(data, null, 2);
  },

  exportBackupJSON(): string {
    return this.exportFullBackup();
  },

  importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.users && Array.isArray(data.users)) this.saveUsers(data.users);
      if (data.teams && Array.isArray(data.teams)) this.saveTeams(data.teams);
      if (data.employees && Array.isArray(data.employees)) this.saveEmployees(data.employees);
      if (data.clients && Array.isArray(data.clients)) this.saveClients(data.clients);
      if (data.projects && Array.isArray(data.projects)) this.saveProjects(data.projects);
      if (data.tasks && Array.isArray(data.tasks)) this.saveTasks(data.tasks);
      if (data.taskAllocations && Array.isArray(data.taskAllocations)) this.saveTaskAllocations(data.taskAllocations);
      if (data.monthlyCapacities && Array.isArray(data.monthlyCapacities)) this.saveMonthlyCapacities(data.monthlyCapacities);
      if (data.fixedAllocations && Array.isArray(data.fixedAllocations)) this.saveFixedAllocations(data.fixedAllocations);
      if (data.absences && Array.isArray(data.absences)) this.saveAbsences(data.absences);
      if (data.absenceRequests && Array.isArray(data.absenceRequests)) this.saveAbsenceRequests(data.absenceRequests);
      if (data.taskStatuses && Array.isArray(data.taskStatuses)) this.saveTaskStatuses(data.taskStatuses);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (e) {
      console.error('Backup import error', e);
      return false;
    }
  },

  restoreBackupJSON(jsonString: string): boolean {
    return this.importFullBackup(jsonString);
  },
};
