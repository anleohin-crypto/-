import { Absence, Client, Employee, Project, Task, TaskAllocation } from '../types';

export interface IntegrityIssue { severity:'error'|'warning'; entity:string; id:string; message:string; }
export function checkDataIntegrity(data:{employees:Employee[];clients:Client[];projects:Project[];tasks:Task[];taskAllocations:TaskAllocation[];absences:Absence[]}): IntegrityIssue[] {
  const issues:IntegrityIssue[]=[];
  const empIds=new Set(data.employees.map(e=>e.id)); const clientIds=new Set(data.clients.map(c=>c.id)); const projectIds=new Set(data.projects.map(p=>p.id)); const taskIds=new Set(data.tasks.map(t=>t.id));
  const empNo=new Map<string,string>(); data.employees.forEach(e=>{if(e.employeeNumber){const k=e.employeeNumber.trim().toLowerCase(); if(empNo.has(k)) issues.push({severity:'error',entity:'Employee',id:e.id,message:`מספר עובד כפול: ${e.employeeNumber}`}); else empNo.set(k,e.id);}});
  const clientCode=new Map<string,string>(); data.clients.forEach(c=>{const k=c.code?.trim().toLowerCase(); if(k){if(clientCode.has(k)) issues.push({severity:'error',entity:'Client',id:c.id,message:`קוד לקוח כפול: ${c.code}`}); else clientCode.set(k,c.id);}});
  data.tasks.forEach(t=>{
    if(!empIds.has(t.assigneeId)) issues.push({severity:'error',entity:'Task',id:t.id,message:`${t.taskNumber}: עובד אחראי אינו קיים`});
    if(!clientIds.has(t.clientId)) issues.push({severity:'error',entity:'Task',id:t.id,message:`${t.taskNumber}: לקוח אינו קיים`});
    if(t.projectId && !projectIds.has(t.projectId)) issues.push({severity:'warning',entity:'Task',id:t.id,message:`${t.taskNumber}: פרויקט אינו קיים`});
    if(t.plannedEndDate < t.plannedStartDate) issues.push({severity:'error',entity:'Task',id:t.id,message:`${t.taskNumber}: תאריך סיום מוקדם מתאריך התחלה`});
    if(t.deadline < t.plannedEndDate) issues.push({severity:'warning',entity:'Task',id:t.id,message:`${t.taskNumber}: דדליין מוקדם מתאריך סיום מתוכנן`});
    if(t.estimatedHours<0 || t.actualHours<0 || t.remainingHours<0) issues.push({severity:'error',entity:'Task',id:t.id,message:`${t.taskNumber}: ערך שעות שלילי`});
  });
  data.taskAllocations.forEach(a=>{if(!taskIds.has(a.taskId)) issues.push({severity:'error',entity:'TaskAllocation',id:a.id,message:'הקצאת שעות ללא משימה קיימת'}); if(!empIds.has(a.employeeId)) issues.push({severity:'error',entity:'TaskAllocation',id:a.id,message:'הקצאת שעות לעובד שאינו קיים'});});
  data.absences.forEach(a=>{if(!empIds.has(a.employeeId)) issues.push({severity:'error',entity:'Absence',id:a.id,message:'היעדרות משויכת לעובד שאינו קיים'}); if(a.endDate<a.startDate) issues.push({severity:'error',entity:'Absence',id:a.id,message:'טווח היעדרות אינו תקין'});});
  return issues;
}
