import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
  TeamCapacityMetrics,
  TeamWideAbsenceInput,
  TaskStatus,
  DelayReason,
  User,
  Team,
  AbsenceRequest,
  TaskStatusConfig,
} from '../types';
import { StorageService } from '../services/storage';
import { DataLayer } from '../services/db';
import { AuthService } from '../services/authService';
import { computeTeamCapacity, getHebrewMonthName } from '../services/capacityEngine';
import { isTaskClosed } from '../services/taskStatusHelper';

export type ActiveTab =
  | 'dashboard'
  | 'capacity'
  | 'tasks'
  | 'gantt'
  | 'calendar'
  | 'employees'
  | 'clients'
  | 'absences'
  | 'absenceApproval'
  | 'myAbsences'
  | 'users'
  | 'taskStatuses'
  | 'auditLogs'
  | 'whatif'
  | 'notifications'
  | 'importExport'
  | 'settings';

export interface DrilldownState {
  isOpen: boolean;
  type: 'free_hours' | 'over_allocation' | 'overdue' | 'at_risk' | 'billable' | 'all_open' | 'employee';
  title: string;
  employeeId?: string;
  data?: any;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  // Navigation & Filters
  currentTab: ActiveTab;
  setCurrentTab: (tab: ActiveTab) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  filterClientId: string;
  setFilterClientId: (id: string) => void;
  filterProjectId: string;
  setFilterProjectId: (id: string) => void;
  filterEmployeeId: string;
  setFilterEmployeeId: (id: string) => void;

  // Auth & Current User
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;
  switchUser: (uid: string) => void;

  // Data
  employees: Employee[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  taskAllocations: TaskAllocation[];
  monthlyCapacities: MonthlyCapacityOverride[];
  fixedAllocations: FixedAllocation[];
  absences: Absence[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  settings: AppSettings;
  users: User[];
  teams: Team[];
  absenceRequests: AbsenceRequest[];
  taskStatuses: TaskStatusConfig[];

  // Computed
  teamMetrics: TeamCapacityMetrics;
  unreadNotificationsCount: number;

  // Modals & Drilldown
  drilldown: DrilldownState;
  openDrilldown: (type: DrilldownState['type'], title: string, employeeId?: string, data?: any) => void;
  closeDrilldown: () => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Actions / Mutators
  // Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'taskNumber'>, allocations?: { month: string; hours: number }[]) => void;
  updateTask: (task: Task, allocations?: { month: string; hours: number }[]) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus, delayReason?: DelayReason) => void;
  batchUpdateTaskStatus: (taskIds: string[], newStatus: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  duplicateTask: (taskId: string) => void;

  // Employees
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  updateEmployee: (emp: Employee) => void;
  toggleEmployeeStatus: (empId: string) => void;

  // Users (Admin)
  addUser: (user: Omit<User, 'uid' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  updateUser: (user: User) => void;
  toggleUserActive: (uid: string) => void;

  // Clients & Projects
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => void;
  addProject: (project: Omit<Project, 'id'>) => void;

  // Absences
  addAbsence: (absence: Omit<Absence, 'id'>) => { hasConflict: boolean; warningMsg?: string };
  deleteAbsence: (absenceId: string) => void;
  addTeamWideAbsence: (input: TeamWideAbsenceInput) => { count: number; conflictWarnings: string[] };
  deleteTeamWideAbsence: (collectiveId: string) => void;

  // Absence Requests Workflow
  submitAbsenceRequest: (request: Omit<AbsenceRequest, 'id' | 'createdAt' | 'status'>) => { success: boolean; error?: string };
  approveAbsenceRequest: (requestId: string, managerComment?: string) => { success: boolean; error?: string };
  rejectAbsenceRequest: (requestId: string, managerComment?: string) => void;
  cancelAbsenceRequest: (requestId: string, reason?: string) => void;

  // Task Status Management (Admin)
  saveTaskStatus: (status: TaskStatusConfig) => void;
  deleteTaskStatus: (statusId: string) => { success: boolean; error?: string };
  reorderTaskStatuses: (orderedIds: string[]) => void;
  setDefaultTaskStatus: (statusId: string) => void;

  // Fixed Allocations
  addFixedAllocation: (fa: Omit<FixedAllocation, 'id'>) => void;
  deleteFixedAllocation: (faId: string) => void;

  // Monthly capacity override
  setMonthlyCapacity: (employeeId: string, month: string, grossHours: number) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;

  // Settings & DB
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetDatabase: () => void;
  importTasksBatch: (newTasks: Partial<Task>[]) => void;
  addTasksBulk: (newTasks: Partial<Task>[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');

  const [currentUser, setCurrentUser] = useState<User | null>(AuthService.getCurrentUser());
  const [users, setUsers] = useState<User[]>(StorageService.getUsers());
  const [teams, setTeams] = useState<Team[]>(StorageService.getTeams());
  const [employees, setEmployees] = useState<Employee[]>(StorageService.getEmployees());
  const [clients, setClients] = useState<Client[]>(StorageService.getClients());
  const [projects, setProjects] = useState<Project[]>(StorageService.getProjects());
  const [tasks, setTasks] = useState<Task[]>(StorageService.getTasks());
  const [taskAllocations, setTaskAllocations] = useState<TaskAllocation[]>(StorageService.getTaskAllocations());
  const [monthlyCapacities, setMonthlyCapacities] = useState<MonthlyCapacityOverride[]>(StorageService.getMonthlyCapacities());
  const [fixedAllocations, setFixedAllocations] = useState<FixedAllocation[]>(StorageService.getFixedAllocations());
  const [absences, setAbsences] = useState<Absence[]>(StorageService.getAbsences());
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>(StorageService.getAbsenceRequests());
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusConfig[]>(StorageService.getTaskStatuses());
  const [notifications, setNotifications] = useState<NotificationItem[]>(StorageService.getNotifications());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(StorageService.getAuditLogs());
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());

  const [drilldown, setDrilldown] = useState<DrilldownState>({
    isOpen: false,
    type: 'free_hours',
    title: '',
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 't-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Real-time synchronization across browser tabs and windows
  useEffect(() => {
    const unsubscribe = DataLayer.subscribeToSync(() => {
      setEmployees(StorageService.getEmployees());
      setClients(StorageService.getClients());
      setProjects(StorageService.getProjects());
      setTasks(StorageService.getTasks());
      setTaskAllocations(StorageService.getTaskAllocations());
      setMonthlyCapacities(StorageService.getMonthlyCapacities());
      setFixedAllocations(StorageService.getFixedAllocations());
      setAbsences(StorageService.getAbsences());
      setAbsenceRequests(StorageService.getAbsenceRequests());
      setTaskStatuses(StorageService.getTaskStatuses());
      setNotifications(StorageService.getNotifications());
      setAuditLogs(StorageService.getAuditLogs());
      setSettings(StorageService.getSettings());
      setUsers(StorageService.getUsers());
      setTeams(StorageService.getTeams());
      setCurrentUser(AuthService.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  // Sync state to storage
  useEffect(() => { StorageService.saveUsers(users); }, [users]);
  useEffect(() => { StorageService.saveTeams(teams); }, [teams]);
  useEffect(() => { StorageService.saveEmployees(employees); }, [employees]);
  useEffect(() => { StorageService.saveClients(clients); }, [clients]);
  useEffect(() => { StorageService.saveProjects(projects); }, [projects]);
  useEffect(() => { StorageService.saveTasks(tasks); }, [tasks]);
  useEffect(() => { StorageService.saveTaskAllocations(taskAllocations); }, [taskAllocations]);
  useEffect(() => { StorageService.saveMonthlyCapacities(monthlyCapacities); }, [monthlyCapacities]);
  useEffect(() => { StorageService.saveFixedAllocations(fixedAllocations); }, [fixedAllocations]);
  useEffect(() => { StorageService.saveAbsences(absences); }, [absences]);
  useEffect(() => { StorageService.saveAbsenceRequests(absenceRequests); }, [absenceRequests]);
  useEffect(() => { StorageService.saveTaskStatuses(taskStatuses); }, [taskStatuses]);
  useEffect(() => { StorageService.saveNotifications(notifications); }, [notifications]);
  useEffect(() => { StorageService.saveAuditLogs(auditLogs); }, [auditLogs]);
  useEffect(() => { StorageService.saveSettings(settings); }, [settings]);

  // Compute team metrics
  const teamMetrics = useMemo(() => {
    return computeTeamCapacity(
      selectedMonth,
      employees,
      tasks,
      taskAllocations,
      fixedAllocations,
      absences,
      monthlyCapacities,
      settings,
      filterClientId,
      filterProjectId,
      filterEmployeeId
    );
  }, [
    selectedMonth,
    employees,
    tasks,
    taskAllocations,
    fixedAllocations,
    absences,
    monthlyCapacities,
    settings,
    filterClientId,
    filterProjectId,
    filterEmployeeId,
  ]);

  // Automated notification generator on state changes
  useEffect(() => {
    const autoAlerts: NotificationItem[] = [];
    const today = new Date().toISOString().substring(0, 10);

    // 1. Over Allocation alerts
    teamMetrics.employeeMetrics.forEach((em) => {
      if (em.status === 'over') {
        autoAlerts.push({
          id: `alert-over-${em.employeeId}-${selectedMonth}`,
          type: 'danger',
          title: `עומס יתר: ${em.employeeName}`,
          message: `עובד ${em.employeeName} נמצא ב-${em.utilizationPercentage}% ניצולת ב${getHebrewMonthName(selectedMonth)} (חריגה של ${em.overAllocationHours} שעות).`,
          targetType: 'employee',
          targetId: em.employeeId,
          createdAt: today,
          isRead: false,
        });
      } else if (em.status === 'under') {
        autoAlerts.push({
          id: `alert-under-${em.employeeId}-${selectedMonth}`,
          type: 'warning',
          title: `חוסר עבודה: ${em.employeeName}`,
          message: `ל${em.employeeName} נותרו ${em.freeCapacity} שעות ללא עבודה ב${getHebrewMonthName(selectedMonth)}.`,
          targetType: 'employee',
          targetId: em.employeeId,
          createdAt: today,
          isRead: false,
        });
      }
    });

    // 2. Deadline risks & overdue
    tasks.forEach((t) => {
      if (t.status === 'הושלם' || t.status === 'בוטל') return;
      if (t.deadline < today) {
        autoAlerts.push({
          id: `alert-overdue-${t.id}`,
          type: 'danger',
          title: `דדליין עבר: ${t.name}`,
          message: `משימה ${t.taskNumber} חרגה מתאריך היעד שלה (${t.deadline}). נותרו ${t.remainingHours} שעות לסיום.`,
          targetType: 'task',
          targetId: t.id,
          createdAt: today,
          isRead: false,
        });
      }
    });

    // Merge without duplicating existing alerts
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const newItems = autoAlerts.filter((a) => !existingIds.has(a.id));
      if (newItems.length === 0) return prev;
      return [...newItems, ...prev];
    });
  }, [teamMetrics, tasks, selectedMonth]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead && !n.dismissed).length;
  }, [notifications]);

  const openDrilldown = (type: DrilldownState['type'], title: string, employeeId?: string, data?: any) => {
    setDrilldown({
      isOpen: true,
      type,
      title,
      employeeId,
      data,
    });
  };

  const closeDrilldown = () => {
    setDrilldown((prev) => ({ ...prev, isOpen: false }));
  };

  // Mutator functions
  const addTask = (
    taskData: Omit<Task, 'id' | 'createdAt' | 'taskNumber'>,
    allocations?: { month: string; hours: number }[]
  ) => {
    const newId = 'tsk-' + Date.now();
    const taskNum = `TSK-${Math.floor(100 + tasks.length + 1)}`;
    const newTask: Task = {
      ...taskData,
      id: newId,
      taskNumber: taskNum,
      createdAt: new Date().toISOString().substring(0, 10),
    };

    setTasks((prev) => [newTask, ...prev]);

    // Add allocations if provided
    if (allocations && allocations.length > 0) {
      const newAllocations: TaskAllocation[] = allocations.map((a, idx) => ({
        id: `ta-${Date.now()}-${idx}`,
        taskId: newId,
        employeeId: newTask.assigneeId,
        month: a.month,
        allocatedHours: a.hours,
      }));
      setTaskAllocations((prev) => [...prev, ...newAllocations]);
    } else {
      // Default: allocate all remaining hours to the task start month
      const startMonth = newTask.plannedStartDate.substring(0, 7) || selectedMonth;
      setTaskAllocations((prev) => [
        ...prev,
        {
          id: `ta-${Date.now()}`,
          taskId: newId,
          employeeId: newTask.assigneeId,
          month: startMonth,
          allocatedHours: newTask.remainingHours,
        },
      ]);
    }

    StorageService.logAudit({
      user: settings.activeUserName,
      action: 'יצירת משימה',
      entityType: 'Task',
      entityId: newId,
      fieldName: 'all',
      oldValue: null,
      newValue: newTask.name,
    });

    addToast(`משימה ${taskNum} נוצרה בהצלחה`);
  };

  const updateTask = (
    updatedTask: Task,
    allocations?: { month: string; hours: number }[]
  ) => {
    const oldTask = tasks.find((t) => t.id === updatedTask.id);
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));

    if (allocations) {
      // Remove old allocations for this task and set new ones
      setTaskAllocations((prev) => {
        const filtered = prev.filter((a) => a.taskId !== updatedTask.id);
        const added: TaskAllocation[] = allocations.map((a, idx) => ({
          id: `ta-${Date.now()}-${idx}`,
          taskId: updatedTask.id,
          employeeId: updatedTask.assigneeId,
          month: a.month,
          allocatedHours: a.hours,
        }));
        return [...filtered, ...added];
      });
    }

    // Log significant changes
    if (oldTask) {
      if (oldTask.remainingHours !== updatedTask.remainingHours) {
        StorageService.logAudit({
          user: settings.activeUserName,
          action: 'עדכון שעות משימה',
          entityType: 'Task',
          entityId: updatedTask.id,
          fieldName: 'remainingHours',
          oldValue: oldTask.remainingHours,
          newValue: updatedTask.remainingHours,
        });
      }
      if (oldTask.assigneeId !== updatedTask.assigneeId) {
        StorageService.logAudit({
          user: settings.activeUserName,
          action: 'העברת משימה לעובד אחר',
          entityType: 'Task',
          entityId: updatedTask.id,
          fieldName: 'assigneeId',
          oldValue: oldTask.assigneeId,
          newValue: updatedTask.assigneeId,
        });
      }
      if (oldTask.status !== updatedTask.status) {
        StorageService.logAudit({
          user: settings.activeUserName,
          action: 'שינוי סטטוס משימה',
          entityType: 'Task',
          entityId: updatedTask.id,
          fieldName: 'status',
          oldValue: oldTask.status,
          newValue: updatedTask.status,
        });
      }
    }

    addToast(`משימה ${updatedTask.taskNumber} עודכנה בהצלחה`);
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus, delayReason?: DelayReason) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const oldStatus = target.status;
    if (oldStatus === newStatus && (delayReason === undefined || delayReason === target.delayReason)) return;

    const isNowClosed = isTaskClosed(newStatus, settings);
    const updated: Task = {
      ...target,
      status: newStatus,
      delayReason: delayReason !== undefined ? delayReason : (newStatus === 'מעוכב' ? target.delayReason : undefined),
      completionPercentage: isNowClosed ? 100 : (oldStatus === 'הושלם' && target.completionPercentage === 100 ? 50 : target.completionPercentage),
      remainingHours: isNowClosed ? 0 : (oldStatus === 'הושלם' && target.remainingHours === 0 ? Math.max(1, target.estimatedHours - target.actualHours) : target.remainingHours),
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

    StorageService.logAudit({
      user: settings.activeUserName,
      action: 'עדכון סטטוס משימה (יזום)',
      entityType: 'Task',
      entityId: taskId,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
    });

    addToast(`סטטוס משימה ${target.taskNumber} עודכן ל-"${newStatus}"`);
  };

  const batchUpdateTaskStatus = (taskIds: string[], newStatus: TaskStatus) => {
    if (taskIds.length === 0) return;
    const isNowClosed = isTaskClosed(newStatus, settings);

    setTasks((prev) =>
      prev.map((t) => {
        if (!taskIds.includes(t.id)) return t;
        return {
          ...t,
          status: newStatus,
          delayReason: newStatus === 'מעוכב' ? t.delayReason : undefined,
          completionPercentage: isNowClosed ? 100 : t.completionPercentage,
          remainingHours: isNowClosed ? 0 : t.remainingHours,
        };
      })
    );

    StorageService.logAudit({
      user: settings.activeUserName,
      action: 'עדכון סטטוס מרוכז',
      entityType: 'Task',
      entityId: taskIds.join(','),
      fieldName: 'status',
      oldValue: `${taskIds.length} משימות`,
      newValue: newStatus,
    });

    addToast(`${taskIds.length} משימות עודכנו בהצלחה לסטטוס "${newStatus}"`);
  };

  const deleteTask = (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTaskAllocations((prev) => prev.filter((a) => a.taskId !== taskId));

    StorageService.logAudit({
      user: settings.activeUserName,
      action: 'מחיקת משימה',
      entityType: 'Task',
      entityId: taskId,
      fieldName: 'name',
      oldValue: taskToDelete?.name || taskId,
      newValue: 'נמחק',
    });

    addToast('המשימה נמחקה בהצלחה', 'info');
  };

  const duplicateTask = (taskId: string) => {
    const source = tasks.find((t) => t.id === taskId);
    if (!source) return;

    const newId = 'tsk-' + Date.now();
    const taskNum = `TSK-${Math.floor(100 + tasks.length + 1)}`;
    const copy: Task = {
      ...source,
      id: newId,
      taskNumber: taskNum,
      name: `${source.name} (שכפול)`,
      status: 'חדש',
      actualHours: 0,
      completionPercentage: 0,
      remainingHours: source.estimatedHours,
      createdAt: new Date().toISOString().substring(0, 10),
    };

    setTasks((prev) => [copy, ...prev]);

    // Copy allocations with new ID
    const srcAllocations = taskAllocations.filter((a) => a.taskId === taskId);
    const newAllocations = srcAllocations.map((a, i) => ({
      ...a,
      id: `ta-${Date.now()}-${i}`,
      taskId: newId,
    }));
    setTaskAllocations((prev) => [...prev, ...newAllocations]);

    addToast(`משימה שוכפלה כ-${taskNum}`);
  };

  const addEmployee = (empData: Omit<Employee, 'id'>) => {
    const newId = 'emp-' + Date.now();
    const colors = [
      'bg-indigo-600',
      'bg-emerald-600',
      'bg-amber-600',
      'bg-cyan-600',
      'bg-purple-600',
      'bg-rose-600',
      'bg-blue-600',
    ];
    const newEmp: Employee = {
      ...empData,
      id: newId,
      avatarColor: colors[employees.length % colors.length],
    };
    setEmployees((prev) => [...prev, newEmp]);
    addToast(`העובד/ת ${newEmp.name} נוסף/ה בהצלחה`);
  };

  const updateEmployee = (emp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? emp : e)));
    addToast(`פרטי העובד/ת ${emp.name} עודכנו בהצלחה`);
  };

  const toggleEmployeeStatus = (empId: string) => {
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id === empId) {
          const updated = !e.isActive;
          addToast(`העובד/ת ${e.name} ${updated ? 'הופעל/ה' : 'הושבת/ה'}`);
          return { ...e, isActive: updated };
        }
        return e;
      })
    );
  };

  const addClient = (clientData: Omit<Client, 'id'>) => {
    const newId = 'cli-' + Date.now();
    const newClient: Client = { ...clientData, id: newId };
    setClients((prev) => [...prev, newClient]);
    addToast(`הלקוח ${newClient.name} נוסף בהצלחה`);
  };

  const updateClient = (client: Client) => {
    setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
    addToast(`פרטי הלקוח ${client.name} עודכנו`);
  };

  const addProject = (projectData: Omit<Project, 'id'>) => {
    const newId = 'prj-' + Date.now();
    const newProj: Project = { ...projectData, id: newId };
    setProjects((prev) => [...prev, newProj]);
    addToast(`הפרויקט ${newProj.name} נוסף בהצלחה`);
  };

  const addAbsence = (absenceData: Omit<Absence, 'id'>) => {
    const newId = 'abs-' + Date.now();
    const newAbsence: Absence = { ...absenceData, id: newId };
    const emp = employees.find((e) => e.id === newAbsence.employeeId);

    // Calculate if this absence causes over-allocation
    const month = newAbsence.startDate.substring(0, 7);
    const existingMetric = teamMetrics.employeeMetrics.find(
      (em) => em.employeeId === newAbsence.employeeId && em.month === month
    );

    let hasConflict = false;
    let warningMsg = '';

    if (existingMetric) {
      const projectedNet = Math.max(0, existingMetric.netCapacity - newAbsence.hours);
      if (existingMetric.totalAllocatedHours > projectedNet) {
        hasConflict = true;
        const overHours = existingMetric.totalAllocatedHours - projectedNet;
        warningMsg = `בעקבות ה${newAbsence.type} של ${emp?.name || 'העובד'}, צפוי עומס יתר של ${overHours} שעות בחודש ${getHebrewMonthName(month)}!`;
      }
    }

    setAbsences((prev) => [...prev, newAbsence]);
    addToast(`היעדרות נרשמה עבור ${emp?.name || ''}`);

    if (hasConflict && warningMsg) {
      // Create explicit notification
      setNotifications((prev) => [
        {
          id: `alert-abs-${newId}`,
          type: 'warning',
          title: `השפעת היעדרות: ${emp?.name}`,
          message: warningMsg,
          targetType: 'absence',
          targetId: newId,
          createdAt: new Date().toISOString().substring(0, 10),
          isRead: false,
        },
        ...prev,
      ]);
    }

    return { hasConflict, warningMsg };
  };

  const deleteAbsence = (absenceId: string) => {
    setAbsences((prev) => prev.filter((a) => a.id !== absenceId));
    addToast('ההיעדרות הוסרה', 'info');
  };

  const addTeamWideAbsence = (input: TeamWideAbsenceInput) => {
    const collectiveId = 'team-abs-' + Date.now();
    const dStart = new Date(input.startDate);
    const dEnd = new Date(input.endDate);

    // Calculate work days based on configured workDaysOfWeek
    const workDaysOfWeek = settings.workDaysOfWeek || [0, 1, 2, 3, 4];
    let workDays = 0;
    const cur = new Date(dStart);
    while (cur <= dEnd) {
      const day = cur.getDay();
      if (workDaysOfWeek.includes(day)) {
        workDays++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    workDays = Math.max(1, workDays);

    const targetEmployees = employees.filter((e) => input.employeeIds.includes(e.id));
    const newAbsences: Absence[] = [];
    const conflictWarnings: string[] = [];
    const month = input.startDate.substring(0, 7);

    targetEmployees.forEach((emp) => {
      const dailyHours =
        input.hoursCalculationMode === 'fixed_hours'
          ? (input.fixedHoursPerDay ?? (settings.workingHoursPerDay || 9))
          : (emp.dailyWorkHours || settings.workingHoursPerDay || 9);
      const totalHours = Math.round(workDays * dailyHours * 10) / 10;

      const newAbsence: Absence = {
        id: `abs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        employeeId: emp.id,
        type: input.type || 'חופשה מרוכזת',
        startDate: input.startDate,
        endDate: input.endDate,
        hours: totalHours,
        isPlanned: true,
        notes: input.notes ? `${input.title} - ${input.notes}` : input.title,
        isTeamWide: true,
        collectiveId,
        collectiveTitle: input.title,
      };

      // Check conflict
      const existingMetric = teamMetrics.employeeMetrics.find(
        (em) => em.employeeId === emp.id && em.month === month
      );
      if (existingMetric) {
        const projectedNet = Math.max(0, existingMetric.netCapacity - totalHours);
        if (existingMetric.totalAllocatedHours > projectedNet) {
          const over = Math.round((existingMetric.totalAllocatedHours - projectedNet) * 10) / 10;
          conflictWarnings.push(
            `${emp.name}: עומס יתר של ${over} שעות בחודש ${getHebrewMonthName(month)}`
          );
        }
      }

      newAbsences.push(newAbsence);
    });

    setAbsences((prev) => [...prev, ...newAbsences]);

    StorageService.logAudit({
      user: settings.activeUserName || 'מנהל מערכת',
      action: 'הגדרת חופשה מרוכזת לצוות',
      entityType: 'Absence',
      entityId: collectiveId,
      fieldName: 'all',
      oldValue: null,
      newValue: `${input.title}: ${newAbsences.length} עובדים, ${input.startDate} עד ${input.endDate}`,
    });

    if (conflictWarnings.length > 0) {
      setNotifications((prev) => [
        {
          id: `alert-team-abs-${collectiveId}`,
          type: 'warning',
          title: `השפעת חופשה מרוכזת: ${input.title}`,
          message: `נקבעה חופשה מרוכזת ל-${newAbsences.length} עובדים. שים לב: נוצר עומס יתר עבור ${conflictWarnings.length} עובדים (${conflictWarnings.slice(0, 2).join(', ')}${conflictWarnings.length > 2 ? '...' : ''})`,
          targetType: 'absence',
          targetId: collectiveId,
          createdAt: new Date().toISOString().substring(0, 10),
          isRead: false,
        },
        ...prev,
      ]);
    }

    addToast(`חופשה מרוכזת "${input.title}" נקבעה בהצלחה ל-${newAbsences.length} עובדים!`);
    return { count: newAbsences.length, conflictWarnings };
  };

  const deleteTeamWideAbsence = (collectiveId: string) => {
    let deletedTitle = '';
    let deletedCount = 0;
    setAbsences((prev) => {
      const match = prev.filter((a) => a.collectiveId === collectiveId);
      deletedCount = match.length;
      if (match.length > 0 && match[0].collectiveTitle) {
        deletedTitle = match[0].collectiveTitle;
      }
      return prev.filter((a) => a.collectiveId !== collectiveId);
    });

    StorageService.logAudit({
      user: settings.activeUserName || 'מנהל מערכת',
      action: 'מחיקת חופשה מרוכזת',
      entityType: 'Absence',
      entityId: collectiveId,
      fieldName: 'all',
      oldValue: `${deletedTitle || collectiveId} (${deletedCount} עובדים)`,
      newValue: 'נמחקה',
    });

    addToast(`החופשה המרוכזת "${deletedTitle || ''}" הוסרה עבור כלל הצוות`, 'info');
  };

  const addFixedAllocation = (faData: Omit<FixedAllocation, 'id'>) => {
    const newId = 'fa-' + Date.now();
    const newFa: FixedAllocation = { ...faData, id: newId };
    setFixedAllocations((prev) => [...prev, newFa]);
    addToast('הקצאה קבועה נשמרה בהצלחה');
  };

  const deleteFixedAllocation = (faId: string) => {
    setFixedAllocations((prev) => prev.filter((f) => f.id !== faId));
    addToast('ההקצאה הקבועה הוסרה', 'info');
  };

  const setMonthlyCapacity = (employeeId: string, month: string, grossHours: number) => {
    setMonthlyCapacities((prev) => {
      const filtered = prev.filter((mc) => !(mc.employeeId === employeeId && mc.month === month));
      return [...filtered, { id: `mc-${Date.now()}`, employeeId, month, grossHours }];
    });
    addToast(`קיבולת חודש עודכנה בהצלחה`);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    addToast('כל ההתראות סומנו כנקראו');
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    addToast('הגדרות המערכת עודכנו');
  };

  const resetDatabase = () => {
    StorageService.resetToDemo();
    setEmployees(StorageService.getEmployees());
    setClients(StorageService.getClients());
    setProjects(StorageService.getProjects());
    setTasks(StorageService.getTasks());
    setTaskAllocations(StorageService.getTaskAllocations());
    setMonthlyCapacities(StorageService.getMonthlyCapacities());
    setFixedAllocations(StorageService.getFixedAllocations());
    setAbsences(StorageService.getAbsences());
    setNotifications([]);
    setAuditLogs([]);
    setSettings(StorageService.getSettings());
    addToast('המערכת אותחלה לנתוני ברירת מחדל');
  };

  const importTasksBatch = (newTasks: Partial<Task>[]) => {
    const createdTasks: Task[] = newTasks.map((t, idx) => ({
      id: t.id || 'tsk-imp-' + Date.now() + '-' + idx,
      taskNumber: t.taskNumber || `TSK-${Math.floor(200 + tasks.length + idx)}`,
      name: t.name || 'משימה מיובאת',
      description: t.description || '',
      clientId: t.clientId || clients[0]?.id || '',
      projectId: t.projectId,
      assigneeId: t.assigneeId || employees[0]?.id || '',
      priority: t.priority || 'רגילה',
      createdAt: t.createdAt || new Date().toISOString().substring(0, 10),
      plannedStartDate: t.plannedStartDate || new Date().toISOString().substring(0, 10),
      plannedEndDate: t.plannedEndDate || t.deadline || new Date().toISOString().substring(0, 10),
      deadline: t.deadline || new Date().toISOString().substring(0, 10),
      estimatedHours: t.estimatedHours || 0,
      actualHours: t.actualHours || 0,
      remainingHours: t.remainingHours || t.estimatedHours || 0,
      completionPercentage: t.completionPercentage || 0,
      status: t.status || 'חדש',
      isBillable: t.isBillable !== undefined ? t.isBillable : true,
      delayReason: t.delayReason,
      notes: t.notes,
    }));

    setTasks((prev) => [...createdTasks, ...prev]);

    // Create default task allocations for the start month
    const newAllocations: TaskAllocation[] = createdTasks.map((t, idx) => ({
      id: `ta-imp-${Date.now()}-${idx}`,
      taskId: t.id,
      employeeId: t.assigneeId,
      month: t.plannedStartDate.substring(0, 7) || selectedMonth,
      allocatedHours: t.remainingHours,
    }));
    setTaskAllocations((prev) => [...prev, ...newAllocations]);

    StorageService.logAudit({
      user: settings.activeUserName || 'מנהל מערכת',
      action: 'ייבוא משימות מאקסל',
      entityType: 'Task',
      entityId: `bulk-${createdTasks.length}`,
      fieldName: 'all',
      oldValue: null,
      newValue: `יובאו ${createdTasks.length} משימות`,
    });

    addToast(`יובאו ${createdTasks.length} משימות בהצלחה!`);
  };

  const addTasksBulk = importTasksBatch;

  // Auth & Session
  const login = (identifier: string, password?: string) => {
    const res = AuthService.login(identifier, password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      addToast(`ברוך הבא, ${res.user.fullName}!`, 'success');
      return { success: true };
    }
    return { success: false, error: res.error || 'פרטי התחברות שגויים' };
  };

  const logout = () => {
    AuthService.logout();
    setCurrentUser(null);
    addToast('התנתקת מהמערכת בהצלחה', 'info');
  };

  const switchUser = (uid: string) => {
    const switched = AuthService.switchUser(uid);
    if (switched) {
      setCurrentUser(switched);
      addToast(`עברת למשתמש: ${switched.fullName} (${switched.role})`, 'info');
    }
  };

  // User Management
  const addUser = (userData: Omit<User, 'uid' | 'createdAt' | 'updatedAt'>) => {
    const cleanEmpNo = userData.employeeNumber.trim();
    if (users.some((u) => u.employeeNumber.trim() === cleanEmpNo)) {
      return { success: false, error: `מספר עובד ${cleanEmpNo} כבר קיים במערכת!` };
    }
    if (users.some((u) => u.email.trim().toLowerCase() === userData.email.trim().toLowerCase())) {
      return { success: false, error: `כתובת מייל ${userData.email} כבר קיימת במערכת!` };
    }

    const newUid = 'usr-' + Date.now();
    const now = new Date().toISOString();
    const newUser: User = {
      ...userData,
      uid: newUid,
      employeeNumber: cleanEmpNo,
      createdAt: now,
      updatedAt: now,
    };

    setUsers((prev) => [...prev, newUser]);

    // Also sync to Employee list if not exists
    if (!employees.some((e) => e.employeeNumber === cleanEmpNo)) {
      const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-600', 'bg-cyan-600', 'bg-purple-600', 'bg-rose-600'];
      const newEmp: Employee = {
        id: 'emp-' + Date.now(),
        employeeNumber: cleanEmpNo,
        name: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.title || (newUser.role === 'ADMIN' ? 'מנהל מערכת' : 'עובד'),
        teamId: newUser.teamId,
        dailyWorkHours: 9,
        jobPercentage: 100,
        hourlyBillableRate: 150,
        hourlyCost: 90,
        weeklyWorkDays: 5,
        startDate: new Date().toISOString().substring(0, 10),
        isActive: newUser.active,
        avatarColor: colors[employees.length % colors.length],
      };
      setEmployees((prev) => [...prev, newEmp]);
    }

    StorageService.logAudit({
      user: currentUser?.fullName || 'מנהל מערכת',
      action: 'יצירת משתמש חדש',
      entityType: 'User',
      entityId: newUid,
      fieldName: 'all',
      oldValue: null,
      newValue: `${newUser.fullName} (${newUser.role})`,
    });

    addToast(`המשתמש ${newUser.fullName} נוצר בהצלחה!`);
    return { success: true };
  };

  const updateUser = (user: User) => {
    setUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...user, updatedAt: new Date().toISOString() } : u)));
    if (currentUser?.uid === user.uid) {
      setCurrentUser(user);
    }
    setEmployees((prev) =>
      prev.map((e) =>
        e.employeeNumber === user.employeeNumber
          ? { ...e, name: user.fullName, email: user.email, phone: user.phone, isActive: user.active }
          : e
      )
    );
    StorageService.logAudit({
      user: currentUser?.fullName || 'מנהל מערכת',
      action: 'עדכון משתמש',
      entityType: 'User',
      entityId: user.uid,
      fieldName: 'profile',
      oldValue: null,
      newValue: user.fullName,
    });
    addToast(`פרטי המשתמש ${user.fullName} עודכנו`);
  };

  const toggleUserActive = (uid: string) => {
    const target = users.find((u) => u.uid === uid);
    if (!target) return;
    const newActive = !target.active;
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, active: newActive } : u)));
    setEmployees((prev) => prev.map((e) => (e.employeeNumber === target.employeeNumber ? { ...e, isActive: newActive } : e)));
    if (currentUser?.uid === uid && !newActive) {
      logout();
    }
    addToast(`המשתמש ${target.fullName} ${newActive ? 'הופעל' : 'הושבת'}`);
  };

  // Absence Requests Workflow
  const submitAbsenceRequest = (reqData: Omit<AbsenceRequest, 'id' | 'createdAt' | 'status'>) => {
    if (reqData.startDate > reqData.endDate) {
      return { success: false, error: 'תאריך התחלה אינו יכול להיות מאוחר מתאריך הסיום' };
    }

    const newId = 'abreq-' + Date.now();
    const newReq: AbsenceRequest = {
      ...reqData,
      id: newId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    setAbsenceRequests((prev) => [newReq, ...prev]);

    const notif: NotificationItem = {
      id: `notif-abreq-${newId}`,
      type: 'warning',
      title: 'בקשת היעדרות חדשה ממתינה לאישור',
      message: `${newReq.employeeName} הגיש/ה בקשת ${newReq.absenceType} מתאריך ${newReq.startDate} עד ${newReq.endDate}.`,
      targetType: 'absence',
      targetId: newId,
      createdAt: new Date().toISOString().substring(0, 10),
      isRead: false,
    };
    setNotifications((prev) => [notif, ...prev]);

    StorageService.logAudit({
      user: currentUser?.fullName || newReq.employeeName,
      action: 'הגשת בקשת היעדרות',
      entityType: 'AbsenceRequest',
      entityId: newId,
      fieldName: 'status',
      oldValue: null,
      newValue: 'PENDING',
    });

    addToast('בקשת ההיעדרות הוגשה בהצלחה ונשלחה לאישור המנהל');
    return { success: true };
  };

  const approveAbsenceRequest = (requestId: string, managerComment?: string) => {
    const req = absenceRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'בקשה לא נמצאה' };

    const approverName = currentUser?.fullName || 'מנהל מערכת';
    const now = new Date().toISOString();

    setAbsenceRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'APPROVED', approvedAt: now, approvedBy: approverName, managerComment }
          : r
      )
    );

    const newAbsence: Absence = {
      id: 'abs-' + Date.now(),
      employeeId: req.employeeId,
      type: req.absenceType,
      startDate: req.startDate,
      endDate: req.endDate,
      hours: req.hours,
      isPlanned: true,
      notes: `אושר מתוך בקשה: ${req.reason}${managerComment ? ` | הערת מנהל: ${managerComment}` : ''}`,
    };
    setAbsences((prev) => [...prev, newAbsence]);

    const notif: NotificationItem = {
      id: `notif-appr-${requestId}`,
      type: 'info',
      title: 'בקשת ההיעדרות שלך אושרה',
      message: `בקשת ה${req.absenceType} שלך לתאריכים ${req.startDate} - ${req.endDate} אושרה על ידי ${approverName}.`,
      targetType: 'absence',
      targetId: requestId,
      createdAt: now.substring(0, 10),
      isRead: false,
    };
    setNotifications((prev) => [notif, ...prev]);

    StorageService.logAudit({
      user: approverName,
      action: 'אישור בקשת היעדרות',
      entityType: 'AbsenceRequest',
      entityId: requestId,
      fieldName: 'status',
      oldValue: 'PENDING',
      newValue: 'APPROVED',
    });

    addToast(`בקשת ההיעדרות של ${req.employeeName} אושרה בהצלחה!`);
    return { success: true };
  };

  const rejectAbsenceRequest = (requestId: string, managerComment?: string) => {
    const req = absenceRequests.find((r) => r.id === requestId);
    if (!req) return;

    const rejectorName = currentUser?.fullName || 'מנהל מערכת';
    const now = new Date().toISOString();

    setAbsenceRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'REJECTED', rejectedAt: now, rejectedBy: rejectorName, managerComment }
          : r
      )
    );

    const notif: NotificationItem = {
      id: `notif-rej-${requestId}`,
      type: 'danger',
      title: 'בקשת ההיעדרות שלך נדחתה',
      message: `בקשת ה${req.absenceType} שלך לתאריכים ${req.startDate} - ${req.endDate} נדחתה. ${managerComment ? `סיבה: ${managerComment}` : ''}`,
      targetType: 'absence',
      targetId: requestId,
      createdAt: now.substring(0, 10),
      isRead: false,
    };
    setNotifications((prev) => [notif, ...prev]);

    StorageService.logAudit({
      user: rejectorName,
      action: 'דחיית בקשת היעדרות',
      entityType: 'AbsenceRequest',
      entityId: requestId,
      fieldName: 'status',
      oldValue: 'PENDING',
      newValue: 'REJECTED',
    });

    addToast(`בקשת ההיעדרות נדחתה`, 'info');
  };

  const cancelAbsenceRequest = (requestId: string, reason?: string) => {
    const req = absenceRequests.find((r) => r.id === requestId);
    if (!req) return;

    if (req.status === 'APPROVED') {
      setAbsences((prev) =>
        prev.filter(
          (a) =>
            !(
              a.employeeId === req.employeeId &&
              a.startDate === req.startDate &&
              a.endDate === req.endDate
            )
        )
      );
    }

    setAbsenceRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'CANCELLED', managerComment: reason || r.managerComment }
          : r
      )
    );

    StorageService.logAudit({
      user: currentUser?.fullName || 'עובד',
      action: 'ביטול בקשת היעדרות',
      entityType: 'AbsenceRequest',
      entityId: requestId,
      fieldName: 'status',
      oldValue: req.status,
      newValue: 'CANCELLED',
    });

    addToast('בקשת ההיעדרות בוטלה', 'info');
  };

  // Task Status Management
  const saveTaskStatus = (statusConfig: TaskStatusConfig) => {
    setTaskStatuses((prev) => {
      const exists = prev.some((s) => s.id === statusConfig.id);
      let updated: TaskStatusConfig[];
      if (exists) {
        updated = prev.map((s) => (s.id === statusConfig.id ? statusConfig : s));
      } else {
        updated = [...prev, statusConfig];
      }
      if (statusConfig.isDefault) {
        updated = updated.map((s) => (s.id === statusConfig.id ? s : { ...s, isDefault: false }));
      }
      return updated;
    });

    StorageService.logAudit({
      user: currentUser?.fullName || 'מנהל מערכת',
      action: 'שמירת תצורת סטטוס',
      entityType: 'TaskStatusConfig',
      entityId: statusConfig.id,
      fieldName: 'name',
      oldValue: null,
      newValue: statusConfig.name,
    });

    addToast(`הסטטוס "${statusConfig.name}" נשמר בהצלחה`);
  };

  const deleteTaskStatus = (statusId: string) => {
    const target = taskStatuses.find((s) => s.id === statusId);
    if (!target) return { success: false, error: 'סטטוס לא קיים' };

    const inUseCount = tasks.filter((t) => t.status === target.name).length;
    if (inUseCount > 0) {
      return {
        success: false,
        error: `לא ניתן למחוק סטטוס זה כי יש ${inUseCount} משימות המשויכות אליו. שנה את הסטטוס למשימות אלו תחילה או כבה את הסטטוס (Inactive).`,
      };
    }

    setTaskStatuses((prev) => prev.filter((s) => s.id !== statusId));

    StorageService.logAudit({
      user: currentUser?.fullName || 'מנהל מערכת',
      action: 'מחיקת סטטוס משימה',
      entityType: 'TaskStatusConfig',
      entityId: statusId,
      fieldName: 'deleted',
      oldValue: target.name,
      newValue: null,
    });

    addToast(`הסטטוס "${target.name}" נמחק`);
    return { success: true };
  };

  const reorderTaskStatuses = (orderedIds: string[]) => {
    setTaskStatuses((prev) => {
      const reordered: TaskStatusConfig[] = [];
      orderedIds.forEach((id, index) => {
        const item = prev.find((s) => s.id === id);
        if (item) {
          reordered.push({ ...item, order: index + 1 });
        }
      });
      return reordered;
    });
    addToast('סדר הסטטוסים עודכן');
  };

  const setDefaultTaskStatus = (statusId: string) => {
    setTaskStatuses((prev) =>
      prev.map((s) => ({
        ...s,
        isDefault: s.id === statusId,
      }))
    );
    addToast('סטטוס ברירת מחדל הוגדר');
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        selectedMonth,
        setSelectedMonth,
        filterClientId,
        setFilterClientId,
        filterProjectId,
        setFilterProjectId,
        filterEmployeeId,
        setFilterEmployeeId,
        currentUser,
        isAuthenticated: Boolean(currentUser),
        login,
        logout,
        switchUser,
        users,
        teams,
        absenceRequests,
        taskStatuses,
        employees,
        clients,
        projects,
        tasks,
        taskAllocations,
        monthlyCapacities,
        fixedAllocations,
        absences,
        notifications,
        auditLogs,
        settings,
        teamMetrics,
        unreadNotificationsCount,
        drilldown,
        openDrilldown,
        closeDrilldown,
        toasts,
        addToast,
        removeToast,
        addTask,
        updateTask,
        updateTaskStatus,
        batchUpdateTaskStatus,
        deleteTask,
        duplicateTask,
        addEmployee,
        updateEmployee,
        toggleEmployeeStatus,
        addUser,
        updateUser,
        toggleUserActive,
        addClient,
        updateClient,
        addProject,
        addAbsence,
        deleteAbsence,
        addTeamWideAbsence,
        deleteTeamWideAbsence,
        submitAbsenceRequest,
        approveAbsenceRequest,
        rejectAbsenceRequest,
        cancelAbsenceRequest,
        saveTaskStatus,
        deleteTaskStatus,
        reorderTaskStatuses,
        setDefaultTaskStatus,
        addFixedAllocation,
        deleteFixedAllocation,
        setMonthlyCapacity,
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        updateSettings,
        resetDatabase,
        importTasksBatch,
        addTasksBulk,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
