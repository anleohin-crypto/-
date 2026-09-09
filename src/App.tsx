import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { DrilldownModal } from './components/dashboard/DrilldownModal';
import { CapacityView } from './components/capacity/CapacityView';
import { TasksView } from './components/tasks/TasksView';
import { TaskModal } from './components/tasks/TaskModal';
import { GanttView } from './components/gantt/GanttView';
import { CalendarView } from './components/calendar/CalendarView';
import { EmployeesView } from './components/employees/EmployeesView';
import { ClientsView } from './components/clients/ClientsView';
import { AbsencesView } from './components/absences/AbsencesView';
import { AbsenceApprovalView } from './components/absences/AbsenceApprovalView';
import { MyAbsencesView } from './components/absences/MyAbsencesView';
import { UsersManagementView } from './components/users/UsersManagementView';
import { TaskStatusesManagementView } from './components/settings/TaskStatusesManagementView';
import { AuditLogsView } from './components/settings/AuditLogsView';
import { WhatIfView } from './components/whatif/WhatIfView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { ImportExportView } from './components/importExport/ImportExportView';
import { SettingsView } from './components/settings/SettingsView';
import { Task } from './types';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentTab, toasts, removeToast } = useApp();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Global Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task?: Task) => {
    setEditingTask(task || null);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans antialiased select-none">
      {/* 1. Right Navigation Sidebar (RTL) */}
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header onOpenNewTaskModal={handleOpenNewTask} />

        {/* Dynamic Tab Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentTab === 'dashboard' && <DashboardView />}
            {currentTab === 'capacity' && <CapacityView />}
            {currentTab === 'tasks' && <TasksView onOpenTaskModal={handleEditTask} />}
            {currentTab === 'gantt' && <GanttView onSelectTask={handleEditTask} />}
            {currentTab === 'calendar' && <CalendarView onSelectTask={handleEditTask} />}
            {currentTab === 'employees' && <EmployeesView />}
            {currentTab === 'clients' && <ClientsView />}
            {currentTab === 'absences' && <AbsencesView />}
            {currentTab === 'absenceApproval' && <AbsenceApprovalView />}
            {currentTab === 'myAbsences' && <MyAbsencesView />}
            {currentTab === 'users' && <UsersManagementView />}
            {currentTab === 'taskStatuses' && <TaskStatusesManagementView />}
            {currentTab === 'auditLogs' && <AuditLogsView />}
            {currentTab === 'whatif' && <WhatIfView />}
            {currentTab === 'notifications' && <NotificationsView />}
            {currentTab === 'importExport' && <ImportExportView />}
            {currentTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* 3. Global Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={editingTask}
      />

      <DrilldownModal onSelectTask={handleEditTask} />

      {/* 4. Floating Toast Notifications */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className="pointer-events-auto bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs border border-slate-700 animate-in slide-in-from-bottom-2 duration-200 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
