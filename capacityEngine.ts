import {
  Employee,
  Task,
  TaskAllocation,
  FixedAllocation,
  Absence,
  MonthlyCapacityOverride,
  AppSettings,
  EmployeeCapacityMetrics,
  TeamCapacityMetrics,
} from '../types';

export function getMonthWorkingDays(
  monthStr: string,
  workDaysOfWeek: number[] = [0, 1, 2, 3, 4]
): number {
  // monthStr: "YYYY-MM"
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10) - 1; // 0-indexed

  const date = new Date(year, month, 1);
  let workingDays = 0;

  while (date.getMonth() === month) {
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    if (workDaysOfWeek.includes(day)) {
      workingDays++;
    }
    date.setDate(date.getDate() + 1);
  }

  return workingDays;
}

export function getMonthScheduleSummary(monthStr: string, settings: AppSettings) {
  const workDaysOfWeek = settings.workDaysOfWeek || [0, 1, 2, 3, 4];
  const workingDays = getMonthWorkingDays(monthStr, workDaysOfWeek);
  const shortenedDaysInMonth = (settings.shortenedDays || []).filter((sd) => sd.date.startsWith(monthStr));
  const defaultDaily = settings.defaultDailyHours || settings.workingHoursPerDay || 9;

  const shortenedReductionHours = shortenedDaysInMonth.reduce((acc, sd) => {
    return acc + Math.max(0, defaultDaily - sd.workingHours);
  }, 0);

  const customMonthStandard = settings.monthlyStandards?.[monthStr];
  const isCustom = typeof customMonthStandard === 'number' && customMonthStandard > 0;

  const defaultFullTimeHours =
    settings.monthlyStandardHoursMode === 'fixed_standard'
      ? Math.max(
          0,
          (settings.fixedMonthlyStandardHours || 182) -
            (settings.deductShortenedDaysFromStandard ? shortenedReductionHours : 0)
        )
      : Math.max(0, workingDays * defaultDaily - shortenedReductionHours);

  const fullTimeGrossHours = isCustom ? customMonthStandard : defaultFullTimeHours;

  return {
    workingDays,
    shortenedDaysInMonth,
    shortenedReductionHours,
    fullTimeGrossHours,
    defaultFullTimeHours,
    isCustom,
    mode: settings.monthlyStandardHoursMode || 'fixed_standard',
    fixedStandard: settings.fixedMonthlyStandardHours || 182,
  };
}


function getAbsenceHoursForMonth(
  absence: Absence,
  monthStr: string,
  workDaysOfWeek: number[]
): number {
  const startMonth = absence.startDate.substring(0, 7);
  const endMonth = absence.endDate.substring(0, 7);
  if (monthStr < startMonth || monthStr > endMonth) return 0;
  if (startMonth === endMonth) return Math.max(0, absence.hours || 0);

  // Absence.hours represents the whole absence. For cross-month absences, distribute
  // those hours proportionally by actual working days so hours are not double-counted
  // in both months and a month fully contained by the range is not missed.
  const start = new Date(`${absence.startDate}T12:00:00`);
  const end = new Date(`${absence.endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  let totalWorkDays = 0;
  let monthWorkDays = 0;
  const d = new Date(start);
  while (d <= end) {
    if (workDaysOfWeek.includes(d.getDay())) {
      totalWorkDays += 1;
      const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (currentMonth === monthStr) monthWorkDays += 1;
    }
    d.setDate(d.getDate() + 1);
  }
  if (totalWorkDays === 0) return 0;
  return Math.max(0, (absence.hours || 0) * (monthWorkDays / totalWorkDays));
}

export function computeEmployeeCapacity(
  employee: Employee,
  monthStr: string,
  tasks: Task[],
  taskAllocations: TaskAllocation[],
  fixedAllocations: FixedAllocation[],
  absences: Absence[],
  monthlyCapacities: MonthlyCapacityOverride[],
  settings: AppSettings
): EmployeeCapacityMetrics {
  // 1. Gross Capacity
  const customCapacity = monthlyCapacities.find(
    (mc) => mc.employeeId === employee.id && mc.month === monthStr
  );

  let grossCapacity = 0;
  if (customCapacity) {
    grossCapacity = customCapacity.grossHours;
  } else {
    const ratio = (employee.jobPercentage || 100) / 100;
    const workDays = settings.workDaysOfWeek || [0, 1, 2, 3, 4];
    const workingDays = getMonthWorkingDays(monthStr, workDays);
    const dailyHours = employee.dailyWorkHours || settings.defaultDailyHours || settings.workingHoursPerDay || 9;

    // Calculate shortened days reduction for this month
    const monthShortened = (settings.shortenedDays || []).filter((sd) => sd.date.startsWith(monthStr));
    const shortenedReduction = monthShortened.reduce((acc, sd) => {
      return acc + Math.max(0, dailyHours - sd.workingHours);
    }, 0);

    const customMonthStandard = settings.monthlyStandards?.[monthStr];

    if (employee.defaultMonthlyHours && employee.defaultMonthlyHours > 0) {
      grossCapacity = Math.round(employee.defaultMonthlyHours * ratio);
    } else if (typeof customMonthStandard === 'number' && customMonthStandard > 0) {
      // Exact monthly standard specified for this month for 100% position
      grossCapacity = Math.round(customMonthStandard * ratio);
    } else if (settings.monthlyStandardHoursMode === 'fixed_standard') {
      let baseStandard = settings.fixedMonthlyStandardHours || 182;
      if (settings.deductShortenedDaysFromStandard) {
        baseStandard = Math.max(0, baseStandard - shortenedReduction);
      }
      grossCapacity = Math.round(baseStandard * ratio);
    } else {
      // Dynamic by actual working days
      const totalHours = Math.max(0, workingDays * dailyHours - shortenedReduction);
      grossCapacity = Math.round(totalHours * ratio);
    }
  }

  // 2. Absence Hours in this month
  const workDaysForAbsence = settings.workDaysOfWeek || [0, 1, 2, 3, 4];
  const absenceHours = absences
    .filter((a) => a.employeeId === employee.id)
    .reduce((acc, a) => acc + getAbsenceHoursForMonth(a, monthStr, workDaysForAbsence), 0);

  // 3. Net Capacity (Available)
  const netCapacity = Math.max(0, grossCapacity - absenceHours);

  // 4. Fixed Allocations for this employee
  const employeeFixed = fixedAllocations.filter((fa) => {
    if (fa.employeeId !== employee.id) return false;
    const faStartMonth = fa.startDate.substring(0, 7);
    const faEndMonth = fa.endDate ? fa.endDate.substring(0, 7) : '9999-12';
    return monthStr >= faStartMonth && monthStr <= faEndMonth;
  });

  // Calculate monthly fixed hours (approx 4.333 weeks in a month)
  let fixedAllocationHours = 0;
  let fixedBillableHours = 0;
  let fixedNonBillableHours = 0;

  for (const fa of employeeFixed) {
    // 4.33 weeks per month or 4 weeks
    const mHours = Math.round(fa.weeklyHours * 4.333);
    fixedAllocationHours += mHours;
    if (fa.isBillable) {
      fixedBillableHours += mHours;
    } else {
      fixedNonBillableHours += mHours;
    }
  }

  // 5. Task Allocations for this employee in this month
  const employeeAllocations = taskAllocations.filter(
    (ta) => ta.employeeId === employee.id && ta.month === monthStr
  );

  let taskAllocatedHours = 0;
  let taskBillableHours = 0;
  let taskNonBillableHours = 0;
  const contributingTasks: Task[] = [];

  for (const ta of employeeAllocations) {
    const task = tasks.find((t) => t.id === ta.taskId);
    // When capacity is filtered by client/project, tasks outside the filter are not
    // present in `tasks`. Their allocations must not leak into the filtered KPI.
    if (!task || task.planningStatus === 'draft') continue;
    taskAllocatedHours += ta.allocatedHours;
    if (task) {
      if (!contributingTasks.some((t) => t.id === task.id)) {
        contributingTasks.push(task);
      }
      if (task.isBillable) {
        taskBillableHours += ta.allocatedHours;
      } else {
        taskNonBillableHours += ta.allocatedHours;
      }
    }
  }

  // If there are tasks assigned to this employee whose planned start/end covers this month
  // but no explicit TaskAllocation was recorded, we consider them if remainingHours > 0
  const activeTasksWithoutAlloc = tasks.filter((t) => {
    if (t.assigneeId !== employee.id) return false;
    if (t.status === 'הושלם' || t.status === 'בוטל' || t.planningStatus === 'draft') return false;
    const hasExplicit = employeeAllocations.some((ta) => ta.taskId === t.id);
    if (hasExplicit) return false;
    const sMonth = t.plannedStartDate.substring(0, 7);
    const eMonth = t.plannedEndDate.substring(0, 7);
    return monthStr >= sMonth && monthStr <= eMonth;
  });

  for (const task of activeTasksWithoutAlloc) {
    if (!contributingTasks.some((t) => t.id === task.id)) {
      contributingTasks.push(task);
    }
  }

  const totalAllocatedHours = taskAllocatedHours + fixedAllocationHours;
  const billableHours = taskBillableHours + fixedBillableHours;
  const nonBillableHours = taskNonBillableHours + fixedNonBillableHours;

  const freeCapacity = Math.max(0, netCapacity - totalAllocatedHours);
  const overAllocationHours = Math.max(0, totalAllocatedHours - netCapacity);

  const utilizationPercentage =
    netCapacity > 0 ? Math.round((totalAllocatedHours / netCapacity) * 100) : 0;
  const billableUtilizationPercentage =
    netCapacity > 0 ? Math.round((billableHours / netCapacity) * 100) : 0;

  // Expected Idle Hours: if utilization is below underAllocationThreshold, free capacity is idle
  const isUnderAllocated = utilizationPercentage < settings.underAllocationThreshold;
  const idleHours = isUnderAllocated ? freeCapacity : 0;

  let status: 'over' | 'high' | 'normal' | 'under' = 'normal';
  if (utilizationPercentage > settings.overAllocationThreshold) {
    status = 'over';
  } else if (utilizationPercentage >= settings.highUtilizationThreshold) {
    status = 'high';
  } else if (utilizationPercentage < settings.underAllocationThreshold) {
    status = 'under';
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    month: monthStr,
    grossCapacity,
    absenceHours,
    fixedAllocationHours,
    netCapacity,
    taskAllocatedHours,
    totalAllocatedHours,
    billableHours,
    nonBillableHours,
    freeCapacity,
    idleHours,
    overAllocationHours,
    utilizationPercentage,
    billableUtilizationPercentage,
    status,
    contributingTasks,
  };
}

export function computeTeamCapacity(
  monthStr: string,
  employees: Employee[],
  tasks: Task[],
  taskAllocations: TaskAllocation[],
  fixedAllocations: FixedAllocation[],
  absences: Absence[],
  monthlyCapacities: MonthlyCapacityOverride[],
  settings: AppSettings,
  filterClientId?: string,
  filterProjectId?: string,
  filterEmployeeId?: string
): TeamCapacityMetrics {
  let relevantEmployees = employees.filter((e) => e.isActive);
  if (filterEmployeeId && filterEmployeeId !== 'all') {
    relevantEmployees = relevantEmployees.filter((e) => e.id === filterEmployeeId);
  }

  let relevantTasks = tasks;
  if (filterClientId && filterClientId !== 'all') {
    relevantTasks = relevantTasks.filter((t) => t.clientId === filterClientId);
  }
  if (filterProjectId && filterProjectId !== 'all') {
    relevantTasks = relevantTasks.filter((t) => t.projectId === filterProjectId);
  }
  if (filterEmployeeId && filterEmployeeId !== 'all') {
    relevantTasks = relevantTasks.filter((t) => t.assigneeId === filterEmployeeId);
  }

  const employeeMetrics = relevantEmployees.map((emp) =>
    computeEmployeeCapacity(
      emp,
      monthStr,
      relevantTasks,
      taskAllocations,
      fixedAllocations,
      absences,
      monthlyCapacities,
      settings
    )
  );

  const grossCapacity = employeeMetrics.reduce((a, b) => a + b.grossCapacity, 0);
  const absenceHours = employeeMetrics.reduce((a, b) => a + b.absenceHours, 0);
  const netCapacity = employeeMetrics.reduce((a, b) => a + b.netCapacity, 0);
  const fixedHours = employeeMetrics.reduce((a, b) => a + b.fixedAllocationHours, 0);
  const taskHours = employeeMetrics.reduce((a, b) => a + b.taskAllocatedHours, 0);
  const totalAllocatedHours = employeeMetrics.reduce((a, b) => a + b.totalAllocatedHours, 0);
  const billableHours = employeeMetrics.reduce((a, b) => a + b.billableHours, 0);
  const nonBillableHours = employeeMetrics.reduce((a, b) => a + b.nonBillableHours, 0);
  const freeHours = employeeMetrics.reduce((a, b) => a + b.freeCapacity, 0);
  const expectedIdleHours = employeeMetrics.reduce((a, b) => a + b.idleHours, 0);
  const overAllocationHours = employeeMetrics.reduce((a, b) => a + b.overAllocationHours, 0);

  const utilizationPercentage =
    netCapacity > 0 ? Math.round((totalAllocatedHours / netCapacity) * 100) : 0;
  const billableUtilizationPercentage =
    netCapacity > 0 ? Math.round((billableHours / netCapacity) * 100) : 0;

  // Task stats:
  const openTasks = relevantTasks.filter((t) => t.status !== 'הושלם' && t.status !== 'בוטל');
  const openTasksCount = openTasks.length;

  const todayStr = new Date().toISOString().substring(0, 10);
  const overdueTasks = openTasks.filter((t) => t.deadline < todayStr);
  const overdueTasksCount = overdueTasks.length;

  // Tasks at risk: overdue OR remainingHours > (workingDaysUntilDeadline * 9) OR marked delayed
  const atRiskTasks = openTasks.filter((t) => {
    if (t.status === 'מעוכב') return true;
    if (t.deadline < todayStr) return true;
    // Approaching deadline within settings.upcomingDeadlineDays
    const deadlineDate = new Date(t.deadline);
    const today = new Date();
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= settings.upcomingDeadlineDays && t.remainingHours > diffDays * 9) {
      return true;
    }
    return false;
  });
  const atRiskTasksCount = atRiskTasks.length;

  const totalRemainingHours = openTasks.reduce((acc, t) => acc + (t.remainingHours || 0), 0);
  const backlogCoverageMonths =
    netCapacity > 0 ? parseFloat((totalRemainingHours / netCapacity).toFixed(1)) : 0;

  return {
    month: monthStr,
    grossCapacity,
    absenceHours,
    netCapacity,
    fixedHours,
    taskHours,
    totalAllocatedHours,
    billableHours,
    nonBillableHours,
    freeHours,
    expectedIdleHours,
    overAllocationHours,
    utilizationPercentage,
    billableUtilizationPercentage,
    openTasksCount,
    overdueTasksCount,
    atRiskTasksCount,
    totalRemainingHours,
    backlogCoverageMonths,
    employeeMetrics,
  };
}

export function getUpcomingMonths(baseMonthStr: string, count: number = 4): string[] {
  const [yearStr, mStr] = baseMonthStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(mStr, 10); // 1-12

  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    const formattedMonth = month < 10 ? `0${month}` : `${month}`;
    months.push(`${year}-${formattedMonth}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return months;
}

export function getHebrewMonthName(monthStr: string): string {
  const [year, m] = monthStr.split('-');
  const monthNum = parseInt(m, 10);
  const names = [
    'ינואר',
    'פברואר',
    'מרץ',
    'אפריל',
    'מאי',
    'יוני',
    'יולי',
    'אוגוסט',
    'ספטמבר',
    'אוקטובר',
    'נובמבר',
    'דצמבר',
  ];
  return `${names[monthNum - 1]} ${year}`;
}
