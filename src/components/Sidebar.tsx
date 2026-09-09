import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  BarChart3,
  Calendar,
  Users,
  Building2,
  CalendarOff,
  SlidersHorizontal,
  Bell,
  FileSpreadsheet,
  Settings,
  Zap,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Send,
  UserCheck,
  ListOrdered,
  History,
  BrainCircuit,
} from 'lucide-react';
import { useApp, ActiveTab } from '../context/AppContext';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const {
    currentTab,
    setCurrentTab,
    unreadNotificationsCount,
    teamMetrics,
    absenceRequests,
    currentUser,
  } = useApp();

  const pendingAbsenceCount = absenceRequests.filter((r) => r.status === 'PENDING').length;

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'דשבורד ראשי',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'planningIntelligence',
      label: 'מרכז תכנון חכם',
      icon: <BrainCircuit className="w-5 h-5" />,
      badge: unreadNotificationsCount > 0 ? 'דורש טיפול' : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
    },
    {
      id: 'capacity',
      label: 'תכנון וקיבולת',
      icon: <BarChart3 className="w-5 h-5" />,
      badge: teamMetrics.overAllocationHours > 0 ? `${teamMetrics.overAllocationHours}ש׳ חריגה` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'tasks',
      label: 'משימות ופרויקטים',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: teamMetrics.openTasksCount,
      badgeColor: 'bg-slate-200 text-slate-700 font-mono',
    },
    {
      id: 'absenceApproval',
      label: 'אישור היעדרויות',
      icon: <ShieldAlert className="w-5 h-5" />,
      badge: pendingAbsenceCount > 0 ? pendingAbsenceCount : undefined,
      badgeColor: 'bg-amber-500 text-white animate-pulse font-mono',
    },
    {
      id: 'myAbsences',
      label: 'בקשות ההיעדרות שלי',
      icon: <Send className="w-5 h-5" />,
    },
    {
      id: 'gantt',
      label: 'גאנט תכנון',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: 'calendar',
      label: 'לוח עבודה שבועי',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'employees',
      label: 'עובדים ומשאבים',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'clients',
      label: 'לקוחות ופרויקטים',
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      id: 'absences',
      label: 'לוח היעדרויות וחגים',
      icon: <CalendarOff className="w-5 h-5" />,
    },
    {
      id: 'whatif',
      label: 'סימולציית תכנון',
      icon: <SlidersHorizontal className="w-5 h-5" />,
      badge: 'חדש',
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300',
    },
    {
      id: 'notifications',
      label: 'התראות וסיכונים',
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      badgeColor: 'bg-red-500 text-white animate-pulse font-mono',
    },
    {
      id: 'users',
      label: 'ניהול משתמשים',
      icon: <UserCheck className="w-5 h-5" />,
    },
    {
      id: 'taskStatuses',
      label: 'הגדרת סטטוסים',
      icon: <ListOrdered className="w-5 h-5" />,
    },
    {
      id: 'auditLogs',
      label: 'יומן ביקורת',
      icon: <History className="w-5 h-5" />,
    },
    {
      id: 'importExport',
      label: 'ייבוא וייצוא Excel',
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'הגדרות מערכת',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <aside
      id="main-sidebar"
      className={`bg-slate-900 text-slate-200 border-l border-slate-800 transition-all duration-300 flex flex-col z-30 select-none shadow-xl ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-base text-white tracking-tight leading-tight">
                CapacityPro
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">מרכז שליטה וקיבולת צוות</p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        )}

        <button
          id="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all text-right ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <div className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {item.icon}
              </div>

              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-1 shrink-0 ${
                        item.badgeColor || 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span>מצב קיבולת חודשי</span>
            <span
              className={`px-1.5 py-0.5 rounded ${
                teamMetrics.utilizationPercentage > 100
                  ? 'bg-rose-500/20 text-rose-300'
                  : teamMetrics.utilizationPercentage >= 75
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {teamMetrics.utilizationPercentage}% ניצולת
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-500 ${
                teamMetrics.utilizationPercentage > 100
                  ? 'bg-rose-500'
                  : teamMetrics.utilizationPercentage >= 75
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, teamMetrics.utilizationPercentage)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{teamMetrics.totalAllocatedHours}ש׳ משובץ</span>
            <span>מתוך {teamMetrics.netCapacity}ש׳ נטו</span>
          </div>
        </div>
      )}
    </aside>
  );
};
