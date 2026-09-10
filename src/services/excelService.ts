import * as XLSX from 'xlsx';
import { Task, Employee, Client, Absence, TeamCapacityMetrics } from '../types';

export interface ExcelImportPreview {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
  raw2D: any[][];
  totalRows: number;
}

export interface ColumnMapping {
  taskName: string;
  employee: string;
  client: string;
  estimatedHours: string;
  actualHours?: string;
  remainingHours?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  isBillable?: string;
  notes?: string;
}

export interface ImportValidationIssue {
  row: number;
  type: 'error' | 'warning' | 'duplicate';
  message: string;
}

export interface ImportValidationResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
  duplicateCount: number;
  validTasks: Partial<Task>[];
  issues: ImportValidationIssue[];
  errors: string[];
}

// Date formatter helper supporting Excel serial numbers, JS dates, and string dates
export function parseAndFormatDate(val: any, defaultDaysAhead = 30): { dateStr: string; isValid: boolean } {
  const fallback = () => {
    const d = new Date();
    d.setDate(d.getDate() + defaultDaysAhead);
    return { dateStr: d.toISOString().substring(0, 10), isValid: false };
  };

  if (!val && val !== 0) {
    return fallback();
  }

  // 1. If it's a JS Date instance
  if (val instanceof Date && !isNaN(val.getTime())) {
    return { dateStr: val.toISOString().substring(0, 10), isValid: true };
  }

  // 2. If it's an Excel numeric serial date (typically 20000 to 70000)
  if (typeof val === 'number') {
    if (val > 1000 && val < 100000) {
      // Excel epoch starts at 1899-12-30
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return { dateStr: date.toISOString().substring(0, 10), isValid: true };
      }
    }
    return fallback();
  }

  const str = String(val).trim();
  if (!str) return fallback();

  // 3. If ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return { dateStr: str, isValid: true };
  }

  // 4. If DD/MM/YYYY or DD.MM.YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    // Is it DD/MM/YYYY
    if (p0 <= 31 && p1 <= 12 && p2 >= 2000) {
      const formatted = `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
      const d = new Date(formatted);
      if (!isNaN(d.getTime())) return { dateStr: formatted, isValid: true };
    }
    // Is it YYYY/MM/DD
    if (p0 >= 2000 && p1 <= 12 && p2 <= 31) {
      const formatted = `${p0}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
      const d = new Date(formatted);
      if (!isNaN(d.getTime())) return { dateStr: formatted, isValid: true };
    }
  }

  // 5. Try standard JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return { dateStr: parsed.toISOString().substring(0, 10), isValid: true };
  }

  return fallback();
}

export const ExcelService = {
  // Read an uploaded file buffer and extract workbook + initial preview
  async parseWorkbook(file: File): Promise<{
    workbook: XLSX.WorkBook;
    sheetNames: string[];
    fileName: string;
    fileSize: number;
  }> {
    return new Promise((resolve, reject) => {
      if (!file || file.size === 0) {
        reject(new Error('הקובץ ריק (0 בתים)'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          console.log(`[ExcelService] Reading file: ${file.name}, size: ${file.size} bytes`);
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: true,
            raw: false,
            dateNF: 'yyyy-mm-dd',
          });

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error('לא נמצאו גיליונות (Sheets) בקובץ האקסל'));
            return;
          }

          console.log(`[ExcelService] Found ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);
          resolve({
            workbook,
            sheetNames: workbook.SheetNames,
            fileName: file.name,
            fileSize: file.size,
          });
        } catch (err: any) {
          console.error('[ExcelService] Parsing error:', err);
          reject(new Error(`שגיאה בפענוח קובץ האקסל: ${err.message || 'קובץ פגום או לא נתמך'}`));
        }
      };
      reader.onerror = (err) => {
        console.error('[ExcelService] FileReader error:', err);
        reject(new Error('שגיאה בקריאת הקובץ מהמכשיר'));
      };
      reader.readAsArrayBuffer(file);
    });
  },

  // Get data for a specific sheet
  getSheetData(workbook: XLSX.WorkBook, sheetName: string): ExcelImportPreview {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`הגיליון "${sheetName}" לא נמצא בקובץ`);
    }

    // Convert to 2D array to inspect headers & rows
    const raw2D = (XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]) || [];
    if (raw2D.length === 0) {
      throw new Error(`הגיליון "${sheetName}" ריק מנתונים`);
    }

    const headers: string[] = (raw2D[0] || []).map((h: any) => String(h || '').trim()).filter(Boolean);
    if (headers.length === 0) {
      throw new Error(`הגיליון "${sheetName}" אינו מכיל שורת כותרות`);
    }

    // Convert to object array
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];

    return {
      sheetNames: workbook.SheetNames,
      selectedSheet: sheetName,
      headers,
      rawRows,
      raw2D,
      totalRows: rawRows.length,
    };
  },

  // Auto-detect best column mappings from available headers
  autoDetectMapping(headers: string[]): ColumnMapping {
    const findHeader = (patterns: string[]): string => {
      for (const pattern of patterns) {
        const match = headers.find((h) => {
          const lower = h.toLowerCase();
          return lower === pattern.toLowerCase() || lower.includes(pattern.toLowerCase());
        });
        if (match) return match;
      }
      return '';
    };

    return {
      taskName: findHeader(['שם משימה', 'משימה', 'שם', 'taskName', 'task', 'name', 'title']),
      employee: findHeader(['עובד אחראי', 'עובד', 'אחראי', 'employee', 'assignee', 'owner']),
      client: findHeader(['לקוח', 'שם לקוח', 'client', 'customer']),
      estimatedHours: findHeader(['שעות משוערות', 'שעות תוכנית', 'שעות', 'estimatedHours', 'hours', 'estimate']),
      actualHours: findHeader(['שעות בפועל', 'בפועל', 'actualHours', 'actual']),
      remainingHours: findHeader(['שעות נותרות', 'נותרו', 'remainingHours', 'remaining']),
      status: findHeader(['סטטוס', 'מצב', 'status', 'state']),
      priority: findHeader(['עדיפות', 'דחיפות', 'priority']),
      deadline: findHeader(['דדליין', 'תאריך יעד', 'תאריך סיום מתוכנן', 'תאריך סיום', 'deadline', 'due date', 'end date']),
      plannedStartDate: findHeader(['תאריך התחלה', 'התחלה', 'plannedStartDate', 'start date', 'start']),
      plannedEndDate: findHeader(['תאריך סיום מתוכנן', 'תאריך סיום', 'plannedEndDate', 'end date']),
      isBillable: findHeader(['Billable', 'לחיוב', 'חיוב', 'חודשי']),
      notes: findHeader(['הערות', 'תיאור', 'notes', 'description']),
    };
  },

  // Validate and map rows to Task objects with detailed validation reports
  validateImportRows(
    rows: Record<string, any>[],
    mapping: ColumnMapping,
    existingTasks: Task[],
    employees: Employee[],
    clients: Client[]
  ): ImportValidationResult {
    const validTasks: Partial<Task>[] = [];
    const issues: ImportValidationIssue[] = [];
    const errors: string[] = [];
    let duplicateCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    if (!mapping.taskName) {
      return {
        totalRows: rows.length,
        validCount: 0,
        errorCount: 1,
        warningCount: 0,
        duplicateCount: 0,
        validTasks: [],
        issues: [{ row: 1, type: 'error', message: 'חובה למפות את עמודת "שם משימה"' }],
        errors: ['חובה למפות את עמודת "שם משימה"'],
      };
    }

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // Row 1 is header
      const taskName = String(row[mapping.taskName] || '').trim();

      // 1. Missing task name
      if (!taskName) {
        issues.push({ row: rowNumber, type: 'error', message: 'שם משימה חסר או ריק' });
        errors.push(`שורה ${rowNumber}: שם משימה חסר`);
        errorCount++;
        return;
      }

      // 2. Check duplicates with existing tasks in the database
      const isDuplicate = existingTasks.some(
        (t) => t.name.trim().toLowerCase() === taskName.toLowerCase()
      );
      if (isDuplicate) {
        duplicateCount++;
        issues.push({
          row: rowNumber,
          type: 'duplicate',
          message: `משימה עם שם זהה "${taskName}" כבר קיימת במערכת`,
        });
      }

      // 3. Validate Hours
      const estRaw = mapping.estimatedHours ? row[mapping.estimatedHours] : 10;
      let estHours = 10;
      if (estRaw !== undefined && estRaw !== '') {
        const parsed = Number(estRaw);
        if (isNaN(parsed)) {
          issues.push({
            row: rowNumber,
            type: 'warning',
            message: `שעות משוערות אינן ערך מספרי ("${estRaw}"), הוגדר ערך ברירת מחדל של 10 שעות`,
          });
          warningCount++;
          estHours = 10;
        } else if (parsed < 0) {
          issues.push({
            row: rowNumber,
            type: 'error',
            message: 'שעות משוערות אינן יכולות להיות מספר שלילי',
          });
          errors.push(`שורה ${rowNumber}: שעות משוערות שליליות`);
          errorCount++;
          return;
        } else {
          estHours = parsed;
        }
      }

      // Actual hours
      let actHours = 0;
      if (mapping.actualHours && row[mapping.actualHours] !== undefined && row[mapping.actualHours] !== '') {
        const parsedAct = Number(row[mapping.actualHours]);
        if (!isNaN(parsedAct) && parsedAct >= 0) {
          actHours = parsedAct;
        } else {
          issues.push({
            row: rowNumber,
            type: 'warning',
            message: `שעות בפועל אינן תקינות ("${row[mapping.actualHours]}"), הוגדרו ל-0`,
          });
          warningCount++;
        }
      }

      // Remaining hours
      let remHours = Math.max(0, estHours - actHours);
      if (mapping.remainingHours && row[mapping.remainingHours] !== undefined && row[mapping.remainingHours] !== '') {
        const parsedRem = Number(row[mapping.remainingHours]);
        if (!isNaN(parsedRem) && parsedRem >= 0) {
          remHours = parsedRem;
        }
      }

      // 4. Employee matching
      const empRaw = mapping.employee ? String(row[mapping.employee] || '').trim() : '';
      let matchedEmp = employees.find(
        (e) =>
          e.name.toLowerCase() === empRaw.toLowerCase() ||
          e.id === empRaw ||
          e.name.toLowerCase().includes(empRaw.toLowerCase()) ||
          empRaw.toLowerCase().includes(e.name.toLowerCase())
      );
      if (!matchedEmp && empRaw) {
        issues.push({
          row: rowNumber,
          type: 'warning',
          message: `עובד "${empRaw}" לא זוהה במערכת, שויך לעובד ברירת מחדל (${employees[0]?.name || 'ראשון'})`,
        });
        warningCount++;
      }
      const assigneeId = matchedEmp ? matchedEmp.id : employees[0]?.id || 'e1';

      // 5. Client matching
      const clientRaw = mapping.client ? String(row[mapping.client] || '').trim() : '';
      let matchedClient = clients.find(
        (c) =>
          c.name.toLowerCase() === clientRaw.toLowerCase() ||
          c.code.toLowerCase() === clientRaw.toLowerCase() ||
          c.id === clientRaw ||
          c.name.toLowerCase().includes(clientRaw.toLowerCase()) ||
          clientRaw.toLowerCase().includes(c.name.toLowerCase())
      );
      if (!matchedClient && clientRaw) {
        issues.push({
          row: rowNumber,
          type: 'warning',
          message: `לקוח "${clientRaw}" לא זוהה, שויך ללקוח ברירת מחדל (${clients[0]?.name || 'ראשון'})`,
        });
        warningCount++;
      }
      const clientId = matchedClient ? matchedClient.id : clients[0]?.id || 'c1';

      // 6. Dates
      const today = new Date().toISOString().substring(0, 10);
      const startResult = parseAndFormatDate(mapping.plannedStartDate ? row[mapping.plannedStartDate] : today, 0);
      const endResult = parseAndFormatDate(mapping.plannedEndDate ? row[mapping.plannedEndDate] : today, 14);
      const deadlineResult = parseAndFormatDate(mapping.deadline ? row[mapping.deadline] : today, 30);

      if (mapping.deadline && row[mapping.deadline] && !deadlineResult.isValid) {
        issues.push({
          row: rowNumber,
          type: 'warning',
          message: `דדליין אינו בפורמט תאריך מוכר ("${row[mapping.deadline]}"), נקבע אוטומטית ל-30 יום`,
        });
        warningCount++;
      }

      // 7. Status & Priority
      const statusRaw = mapping.status ? String(row[mapping.status] || '').trim() : '';
      let status: any = 'חדש';
      if (['חדש', 'מתוכנן', 'בביצוע', 'ממתין', 'מעוכב', 'הושלם', 'בוטל'].includes(statusRaw)) {
        status = statusRaw;
      } else if (remHours === 0 && estHours > 0) {
        status = 'הושלם';
      } else if (actHours > 0) {
        status = 'בביצוע';
      } else {
        status = 'מתוכנן';
      }

      const priorityRaw = mapping.priority ? String(row[mapping.priority] || '').trim() : '';
      let priority: any = 'רגילה';
      if (['נמוכה', 'רגילה', 'גבוהה', 'קריטית'].includes(priorityRaw)) {
        priority = priorityRaw;
      }

      // 8. Billable
      const billableRaw = mapping.isBillable ? String(row[mapping.isBillable] || '').toLowerCase() : 'כן';
      const isBillable =
        billableRaw.includes('כן') ||
        billableRaw.includes('true') ||
        billableRaw === '1' ||
        billableRaw === 'yes' ||
        billableRaw === 'billable';

      validTasks.push({
        id: `tsk-imp-${Date.now()}-${index}`,
        taskNumber: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
        name: taskName,
        description: mapping.notes ? String(row[mapping.notes] || '') : '',
        assigneeId,
        clientId,
        estimatedHours: estHours,
        actualHours: actHours,
        remainingHours: remHours,
        completionPercentage: estHours > 0 ? Math.min(100, Math.round((actHours / estHours) * 100)) : 0,
        priority,
        status,
        isBillable,
        plannedStartDate: startResult.dateStr,
        plannedEndDate: endResult.dateStr,
        deadline: deadlineResult.dateStr,
        createdAt: today,
      });
    });

    return {
      totalRows: rows.length,
      validCount: validTasks.length,
      errorCount,
      warningCount,
      duplicateCount,
      validTasks,
      issues,
      errors,
    };
  },

  // Export Tasks to Excel
  exportTasksToExcel(tasks: Task[], employees: Employee[], clients: Client[]): void {
    const data = tasks.map((t) => {
      const emp = employees.find((e) => e.id === t.assigneeId);
      const cli = clients.find((c) => c.id === t.clientId);
      return {
        'מספר משימה': t.taskNumber,
        'שם משימה': t.name,
        'לקוח': cli?.name || t.clientId,
        'עובד אחראי': emp?.name || t.assigneeId,
        'עדיפות': t.priority,
        'סטטוס': t.status,
        'Billable': t.isBillable ? 'כן' : 'לא',
        'שעות משוערות': t.estimatedHours,
        'שעות בפועל': t.actualHours,
        'שעות נותרות': t.remainingHours,
        '% ביצוע': `${t.completionPercentage}%`,
        'תאריך התחלה': t.plannedStartDate,
        'תאריך סיום': t.plannedEndDate,
        'דדליין': t.deadline,
        'סיבת עיכוב': t.delayReason || '',
        'הערות': t.notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'משימות');
    XLSX.writeFile(workbook, `משימות_צוות_${new Date().toISOString().substring(0, 10)}.xlsx`);
  },

  // Export Capacity Report
  exportCapacityToExcel(metrics: TeamCapacityMetrics, monthName: string): void {
    const summaryData = [
      { 'מדד': 'חודש', 'ערך': monthName },
      { 'מדד': 'קיבולת ברוטו', 'ערך': `${metrics.grossCapacity} שעות` },
      { 'מדד': 'היעדרויות', 'ערך': `${metrics.absenceHours} שעות` },
      { 'מדד': 'קיבולת נטו (זמינה)', 'ערך': `${metrics.netCapacity} שעות` },
      { 'מדד': 'שעות משובצות', 'ערך': `${metrics.totalAllocatedHours} שעות` },
      { 'מדד': 'שעות Billable', 'ערך': `${metrics.billableHours} שעות` },
      { 'מדד': 'שעות Non-Billable', 'ערך': `${metrics.nonBillableHours} שעות` },
      { 'מדד': 'שעות פנויות', 'ערך': `${metrics.freeHours} שעות` },
      { 'מדד': 'שעות סרק צפויות', 'ערך': `${metrics.expectedIdleHours} שעות` },
      { 'מדד': 'עומס יתר (Over-Allocation)', 'ערך': `${metrics.overAllocationHours} שעות` },
      { 'מדד': 'אחוז ניצולת כללית', 'ערך': `${metrics.utilizationPercentage}%` },
      { 'מדד': 'אחוז ניצולת Billable', 'ערך': `${metrics.billableUtilizationPercentage}%` },
      { 'מדד': 'צבר משימות פתוח', 'ערך': `${metrics.totalRemainingHours} שעות` },
      { 'מדד': 'כיסוי צבר עבודה (חודשים)', 'ערך': `${metrics.backlogCoverageMonths} חודשים` },
    ];

    const employeeData = metrics.employeeMetrics.map((em) => ({
      'שם עובד': em.employeeName,
      'קיבולת ברוטו': em.grossCapacity,
      'היעדרויות': em.absenceHours,
      'קיבולת נטו': em.netCapacity,
      'הקצאה קבועה': em.fixedAllocationHours,
      'שעות משימות': em.taskAllocatedHours,
      'סה"כ משובץ': em.totalAllocatedHours,
      'שעות Billable': em.billableHours,
      'שעות פנויות': em.freeCapacity,
      'עומס יתר': em.overAllocationHours,
      'ניצולת %': `${em.utilizationPercentage}%`,
      'סטטוס': em.status === 'over' ? 'עומס יתר' : em.status === 'under' ? 'חוסר עבודה' : 'תקין',
    }));

    const workbook = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsEmployees = XLSX.utils.json_to_sheet(employeeData);

    XLSX.utils.book_append_sheet(workbook, wsSummary, 'סיכום קיבולת');
    XLSX.utils.book_append_sheet(workbook, wsEmployees, 'פירוט עובדים');

    XLSX.writeFile(workbook, `דוח_קיבולת_${metrics.month}.xlsx`);
  },

  // Sample tasks data generator
  getSampleTasksData() {
    return [
      {
        'שם משימה': 'פיתוח מודול אבטחה ואימות דו-שלבי',
        'עובד אחראי': 'דניאל כהן',
        'לקוח': 'בנק הפועלים',
        'שעות משוערות': 45,
        'שעות בפועל': 10,
        'תאריך התחלה': '2026-09-01',
        'תאריך סיום מתוכנן': '2026-09-15',
        'דדליין': '2026-09-20',
        'עדיפות': 'גבוהה',
        'סטטוס': 'בביצוע',
        'Billable (כן/לא)': 'כן',
        'הערות': 'אינטגרציה עם שרתי SSO',
      },
      {
        'שם משימה': 'אופטימיזציית שאילתות ואינדקסים ב-PostgreSQL',
        'עובד אחראי': 'מיכל לוי',
        'לקוח': 'חברת החשמל',
        'שעות משוערות': 30,
        'שעות בפועל': 0,
        'תאריך התחלה': '2026-09-05',
        'תאריך סיום מתוכנן': '2026-09-18',
        'דדליין': '2026-09-22',
        'עדיפות': 'רגילה',
        'סטטוס': 'מתוכנן',
        'Billable (כן/לא)': 'כן',
        'הערות': 'שיפור זמני תגובה ב-40%',
      },
      {
        'שם משימה': 'עיצוב ממשק משתמש למערכת ניהול לקוחות',
        'עובד אחראי': 'יוסי אברהם',
        'לקוח': 'אל על',
        'שעות משוערות': 25,
        'שעות בפועל': 5,
        'תאריך התחלה': '2026-09-02',
        'תאריך סיום מתוכנן': '2026-09-12',
        'דדליין': '2026-09-14',
        'עדיפות': 'קריטית',
        'סטטוס': 'בביצוע',
        'Billable (כן/לא)': 'כן',
        'הערות': 'דרוש אישור מנהל מוצר',
      },
      {
        'שם משימה': 'שדרוג ספריות ותשתיות Node.js בשרתים',
        'עובד אחראי': 'דניאל כהן',
        'לקוח': 'אמדוקס',
        'שעות משוערות': 18,
        'שעות בפועל': 0,
        'תאריך התחלה': '2026-09-10',
        'תאריך סיום מתוכנן': '2026-09-16',
        'דדליין': '2026-09-25',
        'עדיפות': 'נמוכה',
        'סטטוס': 'חדש',
        'Billable (כן/לא)': 'לא',
        'הערות': 'תחזוקה פנימית Non-Billable',
      },
      {
        'שם משימה': 'הקמת תהליך CI/CD אוטומטי ב-GitHub Actions',
        'עובד אחראי': 'מיכל לוי',
        'לקוח': 'רפאל',
        'שעות משוערות': 35,
        'שעות בפועל': 0,
        'תאריך התחלה': '2026-09-08',
        'תאריך סיום מתוכנן': '2026-09-24',
        'דדליין': '2026-09-28',
        'עדיפות': 'גבוהה',
        'סטטוס': 'מתוכנן',
        'Billable (כן/לא)': 'כן',
        'הערות': 'כולל בדיקות אוטומטיות ופריסה',
      },
    ];
  },

  // Create an in-memory test Excel File object
  createSampleExcelFile(): File {
    const data = this.getSampleTasksData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'משימות פרויקטים');
    const u8 = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([u8], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return new File([blob], 'קובץ_משימות_לדוגמה.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  },

  // Download sample template
  downloadTaskTemplate(): void {
    const data = this.getSampleTasksData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'תבנית משימות');
    XLSX.writeFile(workbook, 'תבנית_ייבוא_משימות.xlsx');
  },

  // Export CSV helper
  exportToCsv(data: Record<string, any>[], filename: string): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
