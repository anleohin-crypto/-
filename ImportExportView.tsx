import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EntityExcelService, ImportDecision, SmartImportRow } from '../../services/entityExcelService';
import { ImportCommitService } from '../../services/importCommitService';
import { StorageService } from '../../services/storage';
import { Absence, Client, Employee, ImportEntityType, Task } from '../../types';
import { checkDataIntegrity, IntegrityIssue } from '../../services/dataIntegrityService';
import * as XLSX from 'xlsx';

type EntityMeta = { label: string; description: string };
const META: Record<ImportEntityType, EntityMeta> = {
  tasks: { label: 'משימות', description: 'משימות, שיוך לקוח/עובד, תאריכים ושעות' },
  clients: { label: 'לקוחות', description: 'לקוחות, קודים, אנשי קשר וריטיינרים' },
  employees: { label: 'עובדים', description: 'עובדים, מספרי עובד, משרה ושעות עבודה' },
  absences: { label: 'היעדרויות וחופשות מרוכזות', description: 'חופשות, מחלות והיעדרויות צוות' },
};

export const ImportExportView: React.FC = () => {
  const { tasks, employees, clients, absences, settings, teamMetrics, addToast } = useApp();
  const [entityType, setEntityType] = useState<ImportEntityType>('tasks');
  const [rows, setRows] = useState<SmartImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [sheets, setSheets] = useState<string[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [error, setError] = useState('');
  const [integrityIssues, setIntegrityIssues] = useState<IntegrityIssue[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const source = useMemo(() => ({ tasks, employees, clients, absences }), [tasks, employees, clients, absences]);
  const counts = useMemo(() => ({
    total: rows.length,
    valid: rows.filter(r => r.errors.length === 0).length,
    exact: rows.filter(r => r.duplicate?.risk === 'exact').length,
    high: rows.filter(r => r.duplicate?.risk === 'high').length,
    medium: rows.filter(r => r.duplicate?.risk === 'medium').length,
    errors: rows.filter(r => r.errors.length > 0).length,
    selected: rows.filter(r => r.errors.length === 0 && r.decision !== 'skip').length,
  }), [rows]);

  const analyze = (wb: XLSX.WorkBook, sheet: string, type = entityType) => {
    const raw = EntityExcelService.rows(wb, sheet);
    setRows(EntityExcelService.mapAndAnalyze(type, raw, source));
  };

  const loadFile = async (file: File) => {
    setError('');
    try {
      const parsed = await EntityExcelService.parseFile(file);
      const first = parsed.sheets[0] || '';
      if (!first) throw new Error('לא נמצאו גיליונות בקובץ');
      setWorkbook(parsed.workbook);
      setSheets(parsed.sheets);
      setSheetName(first);
      setFileName(file.name);
      analyze(parsed.workbook, first);
    } catch (e: any) {
      setError(e?.message || 'שגיאה בקריאת הקובץ');
      setRows([]);
    }
  };

  const changeEntity = (type: ImportEntityType) => {
    setEntityType(type);
    setRows([]);
    setFileName('');
    setWorkbook(null);
    setSheets([]);
    setSheetName('');
    setError('');
  };

  const setDecision = (idx: number, decision: ImportDecision) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, decision } : r));
  };

  const setBulkDecision = (risk: 'exact' | 'high' | 'medium', decision: ImportDecision) => {
    setRows(prev => prev.map(r => r.duplicate?.risk === risk && r.errors.length === 0 ? { ...r, decision } : r));
  };

  const commit = () => {
    const selected = rows.filter(r => r.errors.length === 0 && r.decision !== 'skip');
    if (!selected.length) {
      addToast('לא נבחרו רשומות תקינות לייבוא', 'info');
      return;
    }
    try {
      // Build the complete result in memory first. No persistent data is changed until
      // the entire import plan validates successfully. This prevents silent partial imports.
      const now = Date.now();
      const actor = settings.activeUserName || 'מנהל מערכת';
      const plan = ImportCommitService.buildPlan(entityType, rows, {
        tasks, employees, clients, absences, taskAllocations: StorageService.getTaskAllocations(),
      }, now);

      if (entityType === 'clients') StorageService.saveClients(plan.clients);
      if (entityType === 'employees') StorageService.saveEmployees(plan.employees);
      if (entityType === 'absences') StorageService.saveAbsences(plan.absences);
      if (entityType === 'tasks') {
        StorageService.saveTasks(plan.tasks);
        StorageService.saveTaskAllocations(plan.taskAllocations);
      }

      StorageService.logAudit({
        user: actor, action: `ייבוא Excel – ${META[entityType].label}`, entityType: 'ExcelImport', entityId: `import-${now}`,
        entityLabel: fileName, fieldName: 'rows', oldValue: null, newValue: plan.selectedCount,
        details: `${plan.insertedCount} נוספו; ${plan.updatedCount} עודכנו; ${plan.forcedDuplicateCount} יובאו למרות חשד לכפילות; ${plan.skippedCount} דולגו; ${plan.rejectedCount} שגויים`,
        changes: [], source: 'excel_import',
      });
      addToast(`הייבוא הושלם: ${plan.insertedCount} נוספו, ${plan.updatedCount} עודכנו`);
      setTimeout(() => window.location.reload(), 450);
    } catch (e: any) {
      setError(e?.message || 'הייבוא בוטל לפני שמירת הנתונים');
      addToast('הייבוא בוטל – לא נשמרו נתונים חלקיים', 'error');
    }
  };


  const exportManagementReport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamMetrics.employeeMetrics.map(m => ({
      'עובד': m.employeeName, 'קיבולת ברוטו': m.grossCapacity, 'היעדרויות': m.absenceHours, 'קיבולת נטו': m.netCapacity,
      'שעות משימות': m.taskAllocatedHours, 'סה״כ משובץ': m.totalAllocatedHours, 'Billable': m.billableHours, 'Non-Billable': m.nonBillableHours,
      'שעות פנויות': m.freeCapacity, 'חריגה': m.overAllocationHours, 'ניצולת %': m.utilizationPercentage
    }))), 'Capacity');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasks.map(t => ({'מספר משימה':t.taskNumber,'שם':t.name,'סטטוס':t.status,'עדיפות':t.priority,'תאריך התחלה':t.plannedStartDate,'סיום מתוכנן':t.plannedEndDate,'דדליין':t.deadline,'שעות משוערות':t.estimatedHours,'שעות בפועל':t.actualHours,'נותרו':t.remainingHours,'מקור':t.source||'','מצב תכנון':t.planningStatus||'approved'}))), 'Tasks');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(absences.map(a=>({'עובד':employees.find(e=>e.id===a.employeeId)?.name||a.employeeId,'סוג':a.type,'התחלה':a.startDate,'סיום':a.endDate,'שעות':a.hours,'מרוכזת':a.isTeamWide?'כן':'לא'}))), 'Absences');
    XLSX.writeFile(wb, `management_report_${teamMetrics.month}_${new Date().toISOString().slice(0,10)}.xlsx`);
    addToast('דוח מנהלים יוצא בהצלחה');
  };

  const exportBackup = () => {
    const blob = new Blob([StorageService.exportBackupJSON()], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `leasing_team_manager_backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  };

  const restoreBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (StorageService.restoreBackupJSON(String(reader.result || ''))) {
        addToast('הגיבוי שוחזר בהצלחה'); setTimeout(()=>window.location.reload(),450);
      } else addToast('קובץ הגיבוי אינו תקין','error');
    };
    reader.readAsText(file);
  };

  return <div className="space-y-5 text-right" dir="rtl">
    <div className="bg-white p-5 rounded-2xl border border-slate-200">
      <h2 className="text-xl font-bold flex items-center gap-2"><FileSpreadsheet className="w-6 h-6 text-blue-600"/>ייבוא וייצוא Excel – גרסה 1.1</h2>
      <p className="text-xs text-slate-500 mt-1">ייבוא חכם לפי סוג נתון, איתור כפילויות ברמת הרשומה, Preview והחלטה לפני קליטה.</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {(Object.keys(META) as ImportEntityType[]).map(type => <button key={type} onClick={()=>changeEntity(type)} className={`p-3 rounded-xl border text-sm font-bold ${entityType===type?'bg-blue-50 border-blue-300 text-blue-800':'bg-white border-slate-200 text-slate-700'}`}>{META[type].label}</button>)}
    </div>

    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <div><h3 className="font-bold">{META[entityType].label}</h3><p className="text-xs text-slate-500">{META[entityType].description}</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>EntityExcelService.template(entityType)} className="px-3 py-2 text-xs rounded-lg bg-slate-100 font-semibold"><Download className="w-4 h-4 inline ml-1"/>הורד תבנית</button>
          <button onClick={()=>EntityExcelService.export(entityType, source)} className="px-3 py-2 text-xs rounded-lg bg-emerald-50 text-emerald-800 font-semibold"><Download className="w-4 h-4 inline ml-1"/>ייצא {META[entityType].label}</button>
          <button onClick={exportManagementReport} className="px-3 py-2 text-xs rounded-lg bg-indigo-50 text-indigo-800 font-semibold"><Download className="w-4 h-4 inline ml-1"/>דוח מנהלים</button>
          <button onClick={()=>fileRef.current?.click()} className="px-3 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold"><Upload className="w-4 h-4 inline ml-1"/>בחר קובץ לייבוא</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) loadFile(f); e.target.value='';}}/>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">{error}</div>}
      {fileName && <div className="flex flex-wrap gap-3 items-center text-xs bg-slate-50 p-3 rounded-xl"><strong>{fileName}</strong>{sheets.length>1 && <select value={sheetName} onChange={e=>{setSheetName(e.target.value); if(workbook) analyze(workbook,e.target.value)}} className="border rounded p-1">{sheets.map(s=><option key={s}>{s}</option>)}</select>}</div>}

      {rows.length>0 && <>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
          <Stat label="שורות" value={counts.total}/><Stat label="תקינות" value={counts.valid}/><Stat label="כפילות ודאית" value={counts.exact}/><Stat label="חשד גבוה" value={counts.high}/><Stat label="חשד בינוני" value={counts.medium}/><Stat label="ייבוא נבחר" value={counts.selected}/>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={()=>setBulkDecision('exact','skip')} className="px-2 py-1 rounded bg-slate-100">דלג על כל הכפילויות הוודאיות</button>
          <button onClick={()=>setBulkDecision('high','skip')} className="px-2 py-1 rounded bg-slate-100">דלג על חשד גבוה</button>
          <button onClick={()=>setBulkDecision('high','import')} className="px-2 py-1 rounded bg-amber-50 text-amber-800">אפשר ייבוא לחשד גבוה</button>
        </div>
        <div className="overflow-x-auto border rounded-xl max-h-[460px] overflow-y-auto">
          <table className="w-full text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">שורה</th><th className="p-2">רשומה</th><th className="p-2">בדיקה</th><th className="p-2">התאמה קיימת</th><th className="p-2">החלטה</th></tr></thead>
          <tbody className="divide-y">{rows.map((r,i)=><tr key={i} className={r.errors.length?'bg-rose-50':r.duplicate?'bg-amber-50/40':''}><td className="p-2">{r.rowNumber}</td><td className="p-2 font-semibold">{String((r.mapped as any).name || (r.mapped as any).employeeNumber || (r.mapped as any).collectiveTitle || (r.mapped as any).startDate || 'רשומה')}</td><td className="p-2">{r.errors.length ? <span className="text-rose-700">{r.errors.join(' • ')}</span> : r.duplicate ? <span className="text-amber-800"><AlertTriangle className="w-3.5 h-3.5 inline ml-1"/>{r.duplicate.risk==='exact'?'כפילות ודאית':r.duplicate.risk==='high'?'חשד גבוה':'חשד בינוני'} ({r.duplicate.score}%)<br/><span className="text-[10px]">{r.duplicate.matchedFields.join(', ')}</span></span> : <span className="text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 inline ml-1"/>לא נמצאה כפילות</span>}</td><td className="p-2">{r.duplicate?.existingLabel || '—'}</td><td className="p-2"><select disabled={r.errors.length>0} value={r.errors.length?'skip':r.decision} onChange={e=>setDecision(i,e.target.value as ImportDecision)} className="border rounded p-1 bg-white"><option value="import">ייבא כרשומה חדשה</option>{r.duplicate && !r.duplicate.existingId.startsWith('import-row-') && <option value="update">עדכן את הקיימת</option>}<option value="skip">דלג</option></select></td></tr>)}</tbody></table>
        </div>
        <div className="flex justify-end"><button onClick={commit} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm">בצע ייבוא של {counts.selected} רשומות</button></div>
      </>}
    </div>

    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold flex items-center gap-2"><Database className="w-5 h-5 text-purple-600"/>גיבוי, שחזור ובדיקת תקינות</h3><p className="text-xs text-slate-500">מומלץ לבצע גיבוי לפני כל עדכון גרסה או ייבוא גדול. בנוסף נשמר Snapshot מקומי אוטומטי יומי.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={exportBackup} className="px-3 py-2 rounded-lg bg-purple-50 text-purple-800 text-xs font-bold">גבה עכשיו</button><label className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-bold cursor-pointer">שחזר גיבוי<input type="file" accept=".json" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) restoreBackup(f); e.target.value='';}}/></label><button onClick={()=>setIntegrityIssues(checkDataIntegrity({employees,clients,projects:StorageService.getProjects(),tasks,taskAllocations:StorageService.getTaskAllocations(),absences}))} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold">בדוק תקינות מערכת</button></div></div>
      {integrityIssues.length>0 && <div className="border rounded-xl max-h-44 overflow-y-auto divide-y">{integrityIssues.map((x,i)=><div key={i} className={`p-2 text-xs ${x.severity==='error'?'bg-rose-50 text-rose-800':'bg-amber-50 text-amber-800'}`}><strong>{x.severity==='error'?'שגיאה':'אזהרה'} · {x.entity}</strong> · {x.message}</div>)}</div>}
      {integrityIssues.length===0 && <div className="text-[11px] text-slate-400">לחץ על “בדוק תקינות מערכת” כדי לאתר הקצאות יתומות, כפילויות מזהים, תאריכים לא תקינים וקשרים חסרים.</div>}
    </div>
  </div>;
};

const Stat = ({label,value}:{label:string;value:number}) => <div className="p-2 rounded-xl bg-slate-50 border"><div className="text-lg font-bold">{value}</div><div className="text-slate-500">{label}</div></div>;
