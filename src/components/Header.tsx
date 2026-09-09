import React, { useState } from 'react';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Plus,
  Bell,
  RotateCcw,
  UserCheck,
  Shield,
  Download,
  KeyRound,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getHebrewMonthName } from '../services/capacityEngine';
import { UserRole } from '../types';
import { LoginModal } from './auth/LoginModal';

interface HeaderProps {
  onOpenNewTaskModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewTaskModal }) => {
  const {
    selectedMonth,
    setSelectedMonth,
    filterClientId,
    setFilterClientId,
    filterProjectId,
    setFilterProjectId,
    filterEmployeeId,
    setFilterEmployeeId,
    employees,
    clients,
    projects,
    unreadNotificationsCount,
    setCurrentTab,
    settings,
    updateSettings,
    resetDatabase,
    addToast,
    currentUser,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Month navigation
  const handlePrevMonth = () => {
    const [yearStr, mStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(mStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year--;
    }
    const mFormatted = month < 10 ? `0${month}` : `${month}`;
    setSelectedMonth(`${year}-${mFormatted}`);
  };

  const handleNextMonth = () => {
    const [yearStr, mStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(mStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year++;
    }
    const mFormatted = month < 10 ? `0${month}` : `${month}`;
    setSelectedMonth(`${year}-${mFormatted}`);
  };

  const handleRoleChange = (role: UserRole) => {
    updateSettings({ activeUserRole: role });
    setShowRoleMenu(false);
    addToast(`תפקיד משתמש פעיל שונה ל: ${role}`);
  };

  const filteredProjects = projects.filter(
    (p) => filterClientId === 'all' || p.clientId === filterClientId
  );

  return (
    <header
      id="main-header"
      className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-2.5 shadow-xs"
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Month Selector & Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              title="חודש הבא"
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:shadow-xs transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 font-semibold text-slate-800 text-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{getHebrewMonthName(selectedMonth)}</span>
            </div>

            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              title="חודש קודם"
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:shadow-xs transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Quick preset buttons */}
          <div className="hidden lg:flex items-center gap-1">
            {['2026-09', '2026-10', '2026-11', '2026-12'].map((m) => (
              <button
                key={m}
                id={`preset-${m}`}
                onClick={() => setSelectedMonth(m)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  selectedMonth === m
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {getHebrewMonthName(m).split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Group (Employee, Client, Project) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Employee Filter */}
          <select
            id="filter-employee-select"
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">כל העובדים ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.role.split(' ')[0]})
              </option>
            ))}
          </select>

          {/* Client Filter */}
          <select
            id="filter-client-select"
            value={filterClientId}
            onChange={(e) => {
              setFilterClientId(e.target.value);
              setFilterProjectId('all');
            }}
            className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">כל הלקוחות ({clients.length})</option>
            {clients.map((cli) => (
              <option key={cli.id} value={cli.id}>
                {cli.name}
              </option>
            ))}
          </select>

          {/* Project Filter */}
          {filterClientId !== 'all' && (
            <select
              id="filter-project-select"
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">כל הפרויקטים ({filteredProjects.length})</option>
              {filteredProjects.map((prj) => (
                <option key={prj.id} value={prj.id}>
                  {prj.name}
                </option>
              ))}
            </select>
          )}

          {(filterClientId !== 'all' || filterEmployeeId !== 'all' || filterProjectId !== 'all') && (
            <button
              id="btn-clear-filters"
              onClick={() => {
                setFilterClientId('all');
                setFilterProjectId('all');
                setFilterEmployeeId('all');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline px-1 font-semibold"
            >
              איפוס סינון
            </button>
          )}
        </div>

        {/* Actions & Role Controls */}
        <div className="flex items-center gap-2">
          {/* New Task Button */}
          <button
            id="btn-header-new-task"
            onClick={onOpenNewTaskModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>משימה חדשה</span>
          </button>

          {/* Notifications Bell */}
          <button
            id="btn-header-notifications"
            onClick={() => setCurrentTab('notifications')}
            title="מרכז התראות"
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Account / Login Button */}
          <button
            id="btn-user-account"
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 transition-colors shadow-2xs"
            title="פרטי משתמש והחלפת חשבון"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xs">
              {currentUser?.firstName?.substring(0, 1) || 'U'}
            </div>
            <span className="max-w-28 truncate">{currentUser?.fullName || 'התחבר'}</span>
            <span className="text-2xs font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
              {currentUser?.role === 'ADMIN' ? 'Admin' : currentUser?.role === 'TEAM_MANAGER' ? 'Manager' : 'User'}
            </span>
          </button>

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              id="btn-role-switcher"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
              title="החלף הרשאת משתמש (לצורכי בדיקה)"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>{settings.activeUserRole}</span>
            </button>

            {showRoleMenu && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 text-right">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100">
                  החלף מצב הרשאות:
                </div>
                {(['Admin', 'Team Manager', 'Employee', 'Viewer'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`w-full text-right px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      settings.activeUserRole === role ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{role}</span>
                    {settings.activeUserRole === role && <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Demo Data Button */}
          <button
            id="btn-header-reset-demo"
            onClick={() => {
              if (window.confirm('האם לאפס את כל הנתונים לנתוני ה-Demo ההתחלתיים?')) {
                resetDatabase();
              }
            }}
            title="איפוס לנתוני הדגמה"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Login & User Switcher Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </header>
  );
};
