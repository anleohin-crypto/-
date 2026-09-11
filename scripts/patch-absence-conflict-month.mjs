import fs from 'node:fs';

const file = 'src/context/AppContext.tsx';
let source = fs.readFileSync(file, 'utf8');

const oldSingle = `    // Calculate if this absence causes over-allocation\n    const month = newAbsence.startDate.substring(0, 7);\n    const existingMetric = teamMetrics.employeeMetrics.find(\n      (em) => em.employeeId === newAbsence.employeeId && em.month === month\n    );`;
const newSingle = `    // Calculate conflict against the absence month itself, regardless of the month currently displayed in the UI.\n    const month = newAbsence.startDate.substring(0, 7);\n    const monthMetrics = computeTeamCapacity(\n      month,\n      employees,\n      tasks,\n      taskAllocations,\n      fixedAllocations,\n      absences,\n      monthlyCapacities,\n      settings,\n      'all',\n      'all',\n      'all'\n    );\n    const existingMetric = monthMetrics.employeeMetrics.find(\n      (em) => em.employeeId === newAbsence.employeeId\n    );`;

if (!source.includes(newSingle)) {
  if (!source.includes(oldSingle)) throw new Error('Single absence conflict marker not found');
  source = source.replace(oldSingle, newSingle);
}

const oldTeam = `      // Check conflict\n      const existingMetric = teamMetrics.employeeMetrics.find(\n        (em) => em.employeeId === emp.id && em.month === month\n      );`;
const newTeam = `      // Check conflict against the target month, not the currently selected UI month.\n      const monthMetrics = computeTeamCapacity(\n        month,\n        employees,\n        tasks,\n        taskAllocations,\n        fixedAllocations,\n        absences,\n        monthlyCapacities,\n        settings,\n        'all',\n        'all',\n        'all'\n      );\n      const existingMetric = monthMetrics.employeeMetrics.find(\n        (em) => em.employeeId === emp.id\n      );`;

if (!source.includes(newTeam)) {
  if (!source.includes(oldTeam)) throw new Error('Team absence conflict marker not found');
  source = source.replace(oldTeam, newTeam);
}

fs.writeFileSync(file, source);
console.log('Absence conflict checks now use the actual target month.');
