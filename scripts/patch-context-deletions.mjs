import fs from 'node:fs';

const file = 'src/context/AppContext.tsx';
let source = fs.readFileSync(file, 'utf8');

const replaceOnce = (label, from, to) => {
  if (source.includes(to)) {
    console.log(`SKIP ${label}: already patched`);
    return;
  }
  if (!source.includes(from)) {
    throw new Error(`Cannot patch ${label}: marker not found`);
  }
  source = source.replace(from, to);
  console.log(`PATCH ${label}`);
};

replaceOnce(
  'employee interface',
  `  updateEmployee: (emp: Employee) => void;\n  toggleEmployeeStatus: (empId: string) => void;`,
  `  updateEmployee: (emp: Employee) => void;\n  toggleEmployeeStatus: (empId: string) => void;\n  deleteEmployee: (empId: string) => { success: boolean; error?: string };`
);

replaceOnce(
  'client/project interface',
  `  addClient: (client: Omit<Client, 'id'>) => void;\n  updateClient: (client: Client) => void;\n  addProject: (project: Omit<Project, 'id'>) => void;`,
  `  addClient: (client: Omit<Client, 'id'>) => void;\n  updateClient: (client: Client) => void;\n  deleteClient: (clientId: string) => { success: boolean; error?: string };\n  addProject: (project: Omit<Project, 'id'>) => void;\n  deleteProject: (projectId: string) => { success: boolean; error?: string };`
);

replaceOnce(
  'employee deletion implementation',
  `  const addClient = (clientData: Omit<Client, 'id'>) => {`,
  `  const deleteEmployee = (empId: string) => {\n    const emp = employees.find((e) => e.id === empId);\n    if (!emp) return { success: false, error: 'עובד לא נמצא' };\n\n    const taskCount = tasks.filter((t) => t.assigneeId === empId).length;\n    const absenceCount = absences.filter((a) => a.employeeId === empId).length;\n    const fixedCount = fixedAllocations.filter((f) => f.employeeId === empId).length;\n    const capacityCount = monthlyCapacities.filter((c) => c.employeeId === empId).length;\n    const linkedUserCount = emp.employeeNumber\n      ? users.filter((u) => u.employeeNumber === emp.employeeNumber).length\n      : 0;\n\n    const dependencyCount = taskCount + absenceCount + fixedCount + capacityCount + linkedUserCount;\n    if (dependencyCount > 0) {\n      const details = [\n        taskCount ? \`${'${taskCount}'} משימות\` : '',\n        absenceCount ? \`${'${absenceCount}'} היעדרויות\` : '',\n        fixedCount ? \`${'${fixedCount}'} הקצאות קבועות\` : '',\n        capacityCount ? \`${'${capacityCount}'} הגדרות קיבולת\` : '',\n        linkedUserCount ? \`${'${linkedUserCount}'} משתמשים מקושרים\` : '',\n      ].filter(Boolean).join(', ');\n      const error = \`לא ניתן למחוק את ${'${emp.name}'} כל עוד קיימים נתונים מקושרים: ${'${details}'}. יש להסיר/להעביר אותם תחילה או להשבית את העובד.\`;\n      addToast(error, 'error');\n      return { success: false, error };\n    }\n\n    setEmployees((prev) => prev.filter((e) => e.id !== empId));\n    if (filterEmployeeId === empId) setFilterEmployeeId('all');\n    StorageService.logAudit({\n      user: currentUser?.fullName || settings.activeUserName || 'מנהל מערכת',\n      action: 'מחיקת עובד',\n      entityType: 'Employee',\n      entityId: empId,\n      entityLabel: emp.name,\n      fieldName: 'deleted',\n      oldValue: emp.name,\n      newValue: null,\n      details: 'העובד נמחק לאחר בדיקת קשרים',\n      source: 'ui',\n    });\n    addToast(\`העובד/ת ${'${emp.name}'} נמחק/ה בהצלחה\`, 'info');\n    return { success: true };\n  };\n\n  const addClient = (clientData: Omit<Client, 'id'>) => {`
);

replaceOnce(
  'client/project deletion implementation',
  `  const addAbsence = (absenceData: Omit<Absence, 'id'>) => {`,
  `  const deleteClient = (clientId: string) => {\n    const client = clients.find((c) => c.id === clientId);\n    if (!client) return { success: false, error: 'לקוח לא נמצא' };\n\n    const taskCount = tasks.filter((t) => t.clientId === clientId).length;\n    const projectCount = projects.filter((p) => p.clientId === clientId).length;\n    const fixedCount = fixedAllocations.filter((f) => f.clientId === clientId).length;\n    if (taskCount + projectCount + fixedCount > 0) {\n      const details = [\n        taskCount ? \`${'${taskCount}'} משימות\` : '',\n        projectCount ? \`${'${projectCount}'} פרויקטים\` : '',\n        fixedCount ? \`${'${fixedCount}'} הקצאות קבועות\` : '',\n      ].filter(Boolean).join(', ');\n      const error = \`לא ניתן למחוק את הלקוח ${'${client.name}'} כל עוד קיימים נתונים מקושרים: ${'${details}'}.\`;\n      addToast(error, 'error');\n      return { success: false, error };\n    }\n\n    setClients((prev) => prev.filter((c) => c.id !== clientId));\n    if (filterClientId === clientId) setFilterClientId('all');\n    StorageService.logAudit({\n      user: currentUser?.fullName || settings.activeUserName || 'מנהל מערכת',\n      action: 'מחיקת לקוח',\n      entityType: 'Client',\n      entityId: clientId,\n      entityLabel: client.name,\n      fieldName: 'deleted',\n      oldValue: client.name,\n      newValue: null,\n      details: 'הלקוח נמחק לאחר בדיקת קשרים',\n      source: 'ui',\n    });\n    addToast(\`הלקוח ${'${client.name}'} נמחק בהצלחה\`, 'info');\n    return { success: true };\n  };\n\n  const deleteProject = (projectId: string) => {\n    const project = projects.find((p) => p.id === projectId);\n    if (!project) return { success: false, error: 'פרויקט לא נמצא' };\n\n    const taskCount = tasks.filter((t) => t.projectId === projectId).length;\n    if (taskCount > 0) {\n      const error = \`לא ניתן למחוק את הפרויקט ${'${project.name}'} כי קיימות ${'${taskCount}'} משימות המשויכות אליו.\`;\n      addToast(error, 'error');\n      return { success: false, error };\n    }\n\n    setProjects((prev) => prev.filter((p) => p.id !== projectId));\n    if (filterProjectId === projectId) setFilterProjectId('all');\n    StorageService.logAudit({\n      user: currentUser?.fullName || settings.activeUserName || 'מנהל מערכת',\n      action: 'מחיקת פרויקט',\n      entityType: 'Project',\n      entityId: projectId,\n      entityLabel: project.name,\n      fieldName: 'deleted',\n      oldValue: project.name,\n      newValue: null,\n      details: 'הפרויקט נמחק לאחר בדיקת קשרים',\n      source: 'ui',\n    });\n    addToast(\`הפרויקט ${'${project.name}'} נמחק בהצלחה\`, 'info');\n    return { success: true };\n  };\n\n  const addAbsence = (absenceData: Omit<Absence, 'id'>) => {`
);

replaceOnce(
  'provider employee deletion',
  `        addEmployee,\n        updateEmployee,\n        toggleEmployeeStatus,`,
  `        addEmployee,\n        updateEmployee,\n        toggleEmployeeStatus,\n        deleteEmployee,`
);

replaceOnce(
  'provider client/project deletion',
  `        addClient,\n        updateClient,\n        addProject,`,
  `        addClient,\n        updateClient,\n        deleteClient,\n        addProject,\n        deleteProject,`
);

fs.writeFileSync(file, source);
console.log('AppContext deletion contracts patched successfully.');
