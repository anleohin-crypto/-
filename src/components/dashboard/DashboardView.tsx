import React, { useState } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Percent,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  HelpCircle,
  BarChart,
  PieChart as PieIcon,
  Calendar,
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { getHebrewMonthName, getUpcomingMonths, computeTeamCapacity } from '../../services/capacityEngine';

export const DashboardView: React.FC = () => {
  const {
    teamMetrics,
    selectedMonth,
    setSelectedMonth,
    openDrilldown,
    employees,
    tasks,
    taskAllocations,
    fixedAllocations,
    absences,
    monthlyCapacities,
    settings,
    setCurrentTab,
  } = useApp();

  // Forecast data for 4 consecutive months
  const forecastMonths = getUpcomingMonths(selectedMonth, 4);
  const forecastMetrics = forecastMonths.map((m) =>
    computeTeamCapacity(
      m,
      employees,
      tasks,
      taskAllocations,
      fixedAllocations,
      absences,
      monthlyCapacities,
      settings
    )
  );

  const forecastChartData = forecastMetrics.map((fm) => ({
    name: getHebrewMonthName(fm.month).split(' ')[0],
    month: fm.month,
    קיבולת_נטו: fm.netCapacity,
    שעות_משובצות: fm.totalAllocatedHours,
    שעות_Billable: fm.billableHours,
    שעות_פנויות: fm.freeHours,
  }));

  // Employee workload chart data
  const employeeChartData = teamMetrics.employeeMetrics.map((em) => ({
    name: em.employeeName.split(' ')[0],
    fullName: em.employeeName,
    קיבולת_נטו: em.netCapacity,
    שעות_משובצות: em.totalAllocatedHours,
    שעות_Billable: em.billableHours,
    שעות_פנויות: em.freeCapacity,
    עומס_יתר: em.overAllocationHours,
    ניצולת: em.utilizationPercentage,
  }));

  // Billable vs Non-Billable pie data
  const billableData = [
    { name: 'Billable (לחיוב)', value: teamMetrics.billableHours, color: '#2563eb' },
    { name: 'Non-Billable (פנימי/תחזוקה)', value: teamMetrics.nonBillableHours, color: '#94a3b8' },
  ];

  // Tasks by status data
  const statusCounts: Record<string, number> = {};
  tasks.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });
  const statusColors: Record<string, string> = {
    'בביצוע': '#3b82f6',
    'מתוכנן': '#6366f1',
    'חדש': '#94a3b8',
    'מעוכב': '#ef4444',
    'ממתין': '#f59e0b',
    'הושלם': '#10b981',
    'בוטל': '#64748b',
  };
  const taskStatusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
    color: statusColors[status] || '#cbd5e1',
  }));

  return (
    <div id="dashboard-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Risk & Over-Allocation Critical Banner (if any) */}
      {teamMetrics.overAllocationHours > 0 && (
        <div className="bg-rose-50 border-r-4 border-rose-600 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-rose-900">
                זוהה עומס יתר של {teamMetrics.overAllocationHours} שעות בצוות בחודש {getHebrewMonthName(selectedMonth)}!
              </h4>
              <p className="text-xs text-rose-700">
                עובדים מסוימים שובצו מעבר לקיבולת הזמינה לאחר חישוב היעדרויות והקצאות קבועות.
              </p>
            </div>
          </div>
          <button
            id="btn-banner-drilldown-over"
            onClick={() => openDrilldown('over_allocation', 'עובדים בעומס יתר')}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1"
          >
            <span>תחקור משימות חריגות</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Under-Allocation Highlights */}
      {teamMetrics.expectedIdleHours > 0 && (
        <div className="bg-amber-50 border-r-4 border-amber-500 p-3.5 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>התראת ניצולת חסרה:</strong> צפויות {teamMetrics.expectedIdleHours} שעות סרק בצוות. יש לנצל את הקיבולת הפנויה לקליטת משימות מהצבר.
            </span>
          </div>
          <button
            onClick={() => openDrilldown('free_hours', 'קיבולת פנויה לפי עובדים')}
            className="text-amber-800 underline font-semibold hover:text-amber-950 shrink-0"
          >
            הצג עובדים פנויים ←
          </button>
        </div>
      )}

      {/* 1. Top KPI Cards Grid (12 Cards as requested in section 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Gross Capacity */}
        <div
          id="kpi-gross-capacity"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
          onClick={() => setCurrentTab('capacity')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>קיבולת ברוטו</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{teamMetrics.grossCapacity} ש׳</div>
          <div className="text-[11px] text-slate-400 mt-0.5">ימי עבודה כפול שעות</div>
        </div>

        {/* Net Capacity */}
        <div
          id="kpi-net-capacity"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
          onClick={() => setCurrentTab('capacity')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>קיבולת נטו</span>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-blue-700 font-mono">{teamMetrics.netCapacity} ש׳</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            לאחר היעדרות של {teamMetrics.absenceHours} ש׳
          </div>
        </div>

        {/* Allocated Hours */}
        <div
          id="kpi-allocated-hours"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
          onClick={() => setCurrentTab('capacity')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>שעות משובצות</span>
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-indigo-700 font-mono">{teamMetrics.totalAllocatedHours} ש׳</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            משימות ({teamMetrics.taskHours}ש׳) + קבוע ({teamMetrics.fixedHours}ש׳)
          </div>
        </div>

        {/* Billable Hours */}
        <div
          id="kpi-billable-hours"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
          onClick={() => openDrilldown('billable', 'משימות ושעות Billable')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>שעות Billable</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-700 font-mono">{teamMetrics.billableHours} ש׳</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {teamMetrics.billableUtilizationPercentage}% מסך הנטו
          </div>
        </div>

        {/* Non-Billable Hours */}
        <div
          id="kpi-non-billable-hours"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Non-Billable</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-700 font-mono">{teamMetrics.nonBillableHours} ש׳</div>
          <div className="text-[11px] text-slate-400 mt-0.5">תחזוקה פנימית/ניהול</div>
        </div>

        {/* Free Hours (Drilldown enabled!) */}
        <div
          id="kpi-free-hours"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => openDrilldown('free_hours', 'שעות פנויות בצוות')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-700">שעות פנויות</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xl font-bold text-amber-600 font-mono">{teamMetrics.freeHours} ש׳</div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5 underline">לחץ לראות אצל מי ←</div>
        </div>

        {/* Expected Idle Hours */}
        <div
          id="kpi-idle-hours"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>שעות סרק צפויות</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-700 font-mono">{teamMetrics.expectedIdleHours} ש׳</div>
          <div className="text-[11px] text-slate-400 mt-0.5">מעובדים מתחת ל-75%</div>
        </div>

        {/* Utilization % */}
        <div
          id="kpi-utilization-rate"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>ניצולת צוות (Utilization)</span>
            <Percent className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              teamMetrics.utilizationPercentage > 100
                ? 'text-rose-600'
                : teamMetrics.utilizationPercentage >= 75
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}
          >
            {teamMetrics.utilizationPercentage}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {teamMetrics.utilizationPercentage > 100 ? 'עומס יתר' : 'יעד: 75%-90%'}
          </div>
        </div>

        {/* Billable Utilization % */}
        <div
          id="kpi-billable-utilization"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Billable Utilization</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 font-mono">
            {teamMetrics.billableUtilizationPercentage}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">רווחיות ויעילות</div>
        </div>

        {/* Open Tasks */}
        <div
          id="kpi-open-tasks"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
          onClick={() => openDrilldown('all_open', 'משימות פתוחות')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>משימות פתוחות</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{teamMetrics.openTasksCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">סה״כ {teamMetrics.totalRemainingHours} שעות בצבר</div>
        </div>

        {/* Overdue Tasks (Drilldown!) */}
        <div
          id="kpi-overdue-tasks"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => openDrilldown('overdue', 'משימות באיחור')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-rose-700">משימות באיחור</span>
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-bold text-rose-600 font-mono">{teamMetrics.overdueTasksCount}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5 underline">לחץ לצפייה ברשימה ←</div>
        </div>

        {/* At Risk Tasks (Drilldown!) */}
        <div
          id="kpi-risk-tasks"
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => openDrilldown('at_risk', 'משימות בסיכון')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-amber-800">משימות בסיכון</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-bold text-amber-600 font-mono">{teamMetrics.atRiskTasksCount}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5 underline">מעוכבות / דדליין קרוב ←</div>
        </div>
      </div>

      {/* 2. Business Question Card & Backlog Coverage Indicator */}
      <div className="bg-gradient-to-l from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>השאלה העסקית המרכזית:</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold">
            ״האם יש לי מספיק עבודה כדי לנצל נכון את קיבולת הצוות, ואם לא – אצל מי, מתי ובכמה שעות?״
          </h3>
          <p className="text-xs text-slate-300">
            {teamMetrics.utilizationPercentage > 100 ? (
              <span className="text-rose-300 font-semibold">
                הצוות נמצא בעומס יתר! נדרש לפזר משימות לחודשים הבאים או להקצות משאבים נוספים.
              </span>
            ) : teamMetrics.freeHours > 50 ? (
              <span className="text-amber-300 font-semibold">
                יש קיבולת פנויה של {teamMetrics.freeHours} שעות החודש. מומלץ לקדם משימות מהצבר לעובדים בעלי ניצולת נמוכה.
              </span>
            ) : (
              <span className="text-emerald-300 font-semibold">
                הצוות מאוזן היטב החודש עם ניצולת של {teamMetrics.utilizationPercentage}%.
              </span>
            )}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-4 shrink-0 text-center min-w-[190px]">
          <div className="text-xs text-blue-200 mb-1">כיסוי צבר עבודה (Backlog Coverage)</div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {teamMetrics.backlogCoverageMonths} <span className="text-sm font-normal">חודשים</span>
          </div>
          <div className="text-[11px] text-slate-300 mt-1">
            {teamMetrics.totalRemainingHours} שעות מול {teamMetrics.netCapacity} שעות נטו לחודש
          </div>
        </div>
      </div>

      {/* 3. Main Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart A: Capacity vs Allocated per Employee */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900">קיבולת מול שעות משובצות לפי עובד</h4>
              <p className="text-xs text-slate-500">חודש {getHebrewMonthName(selectedMonth)}</p>
            </div>
            <button
              onClick={() => setCurrentTab('capacity')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              צפה בטבלה המלאה ←
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={employeeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip
                  formatter={(value: any, name: any) => [`${value} שעות`, name]}
                  labelFormatter={(label) => `עובד: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="קיבולת_נטו" fill="#94a3b8" radius={[4, 4, 0, 0]} name="קיבולת נטו" />
                <Bar dataKey="שעות_משובצות" fill="#2563eb" radius={[4, 4, 0, 0]} name="משובץ בפועל" />
                <Bar dataKey="עומס_יתר" fill="#ef4444" radius={[4, 4, 0, 0]} name="עומס יתר (חריגה)" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Multi-Month Workload Forecast */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900">תחזית עומס ל-4 החודשים הקרובים</h4>
              <p className="text-xs text-slate-500">מגמת קיבולת לעומת שיבוץ מתוכנן</p>
            </div>
            <div className="flex items-center gap-1">
              {forecastMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                    selectedMonth === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {getHebrewMonthName(m).split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAllocated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(value: any, name: any) => [`${value} שעות`, name]} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="קיבולת_נטו"
                  stroke="#64748b"
                  fillOpacity={1}
                  fill="url(#colorNet)"
                  name="קיבולת נטו זמינה"
                />
                <Area
                  type="monotone"
                  dataKey="שעות_משובצות"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAllocated)"
                  name="שעות משובצות"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Billable vs Non-Billable Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900">פילוח שעות: Billable מול Non-Billable</h4>
              <p className="text-xs text-slate-500">
                סה״כ {teamMetrics.totalAllocatedHours} שעות מתוכננות בחודש {getHebrewMonthName(selectedMonth)}
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {teamMetrics.billableUtilizationPercentage}% Billable
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={billableData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {billableData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(val: any) => [`${val} שעות`, '']} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Tasks by Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900">התפלגות משימות לפי סטטוס</h4>
              <p className="text-xs text-slate-500">סה״כ {tasks.length} משימות במערכת</p>
            </div>
            <button
              onClick={() => setCurrentTab('tasks')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              ניהול משימות ←
            </button>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(val: any) => [`${val} משימות`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Quick Team Workload Table summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-base text-slate-900">
              סטטוס ניצולת אישית - {getHebrewMonthName(selectedMonth)}
            </h4>
          </div>
          <button
            onClick={() => setCurrentTab('capacity')}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            מעבר ללוח קיבולת מלא ←
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2 font-semibold">עובד</th>
                <th className="pb-2 font-semibold">קיבולת נטו</th>
                <th className="pb-2 font-semibold">הקצאה קבועה</th>
                <th className="pb-2 font-semibold">שעות משימות</th>
                <th className="pb-2 font-semibold">סה״כ משובץ</th>
                <th className="pb-2 font-semibold">Billable</th>
                <th className="pb-2 font-semibold">שעות פנויות</th>
                <th className="pb-2 font-semibold">ניצולת %</th>
                <th className="pb-2 font-semibold">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamMetrics.employeeMetrics.map((em) => (
                <tr key={em.employeeId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 font-bold text-slate-900">{em.employeeName}</td>
                  <td className="py-2.5 font-mono">{em.netCapacity} ש׳</td>
                  <td className="py-2.5 font-mono text-slate-600">{em.fixedAllocationHours} ש׳</td>
                  <td className="py-2.5 font-mono text-slate-600">{em.taskAllocatedHours} ש׳</td>
                  <td className="py-2.5 font-mono font-bold text-slate-800">{em.totalAllocatedHours} ש׳</td>
                  <td className="py-2.5 font-mono text-emerald-700">{em.billableHours} ש׳</td>
                  <td className="py-2.5 font-mono">
                    {em.freeCapacity > 0 ? (
                      <span className="text-amber-600 font-semibold">{em.freeCapacity} ש׳</span>
                    ) : (
                      <span className="text-slate-400">0 ש׳</span>
                    )}
                  </td>
                  <td className="py-2.5 font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-md ${
                        em.status === 'over'
                          ? 'bg-rose-100 text-rose-700'
                          : em.status === 'high'
                          ? 'bg-blue-100 text-blue-700'
                          : em.status === 'normal'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {em.utilizationPercentage}%
                    </span>
                  </td>
                  <td className="py-2.5">
                    {em.status === 'over' && (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5" /> עומס יתר (+{em.overAllocationHours}ש׳)
                      </span>
                    )}
                    {em.status === 'under' && (
                      <span className="text-amber-700 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> חוסר עבודה ({em.freeCapacity}ש׳)
                      </span>
                    )}
                    {(em.status === 'normal' || em.status === 'high') && (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> מאוזן
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
