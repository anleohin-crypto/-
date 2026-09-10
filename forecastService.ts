import { Absence, AppSettings, Employee, FixedAllocation, ForecastPeriod, MonthlyCapacityOverride, PlanningScenario, Task, TaskAllocation } from '../types';
import { computeTeamCapacity } from './capacityEngine';
import { ScenarioService } from './scenarioService';

const addMonths = (month: string, offset: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const ForecastService = {
  build(params: {
    startMonth: string;
    months: number;
    employees: Employee[];
    tasks: Task[];
    allocations: TaskAllocation[];
    absences: Absence[];
    fixedAllocations: FixedAllocation[];
    monthlyCapacities: MonthlyCapacityOverride[];
    settings: AppSettings;
    scenario?: PlanningScenario;
  }): ForecastPeriod[] {
    const scenarioTasks = ScenarioService.applyToTasks(params.tasks, params.scenario);
    const scenarioAllocations = ScenarioService.applyToAllocations(params.tasks, params.allocations, params.scenario);

    return Array.from({ length: Math.max(1, params.months) }, (_, i) => addMonths(params.startMonth, i)).map((month) => {
      const metrics = computeTeamCapacity(
        month,
        params.employees,
        scenarioTasks,
        scenarioAllocations,
        params.fixedAllocations,
        params.absences,
        params.monthlyCapacities,
        params.settings,
      );
      return {
        month,
        capacity: metrics.netCapacity,
        planned: metrics.totalAllocatedHours,
        billable: metrics.billableHours,
        nonBillable: metrics.nonBillableHours,
        idle: metrics.expectedIdleHours,
        overload: metrics.overAllocationHours,
        utilization: metrics.utilizationPercentage,
      };
    });
  },
};
