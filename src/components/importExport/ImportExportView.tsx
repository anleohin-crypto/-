import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Database,
  X,
  FileCheck,
  Layers,
  ArrowRight,
  Sparkles,
  AlertOctagon,
  HelpCircle,
  Table as TableIcon,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ExcelService,
  ExcelImportPreview,
  ColumnMapping,
  ImportValidationResult,
} from '../../services/excelService';
import { getHebrewMonthName } from '../../services/capacityEngine';
import { StorageService } from '../../services/storage';
import * as XLSX from 'xlsx';

export const ImportExportView: React.FC = () => {
  const {
    tasks,
    employees,
    clients,
    teamMetrics,
    selectedMonth,
    importTasksBatch,
    addTasksBulk,
    addToast,
    setCurrentTab,
  } = useApp();

  // State for drag & drop
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // File metadata
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>('');
  const [loadedWorkbook, setLoadedWorkbook] = useState<XLSX.WorkBook | null>(null);

  // Sheet data & mapping
  const [sheetData, setSheetData] = useState<ExcelImportPreview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Active step: 1 = upload, 2 = mapping & preview, 3 = success summary
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importedCount, setImportedCount] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 1. Process selected File (from input, drop, or sample)
  const processSelectedFile = async (file: File) => {
    console.log('[Excel Import] processSelectedFile started for:', file.name, file.size);
    setGeneralError(null);

    // Validation 1: Unsupported extension
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      const err = 'סוג קובץ לא נתמך. נא להעלות קובץ מסוג XLSX, XLS או CSV בלבד.';
      console.warn('[Excel Import]', err);
      setGeneralError(err);
      return;
    }

    // Validation 2: Empty file
    if (file.size === 0) {
      const err = 'הקובץ שנבחר ריק לחלוטין (0 בתים).';
      console.warn('[Excel Import]', err);
      setGeneralError(err);
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[Excel Import] Parsing workbook...');
      const parsed = await ExcelService.parseWorkbook(file);
      console.log('[Excel Import] Workbook parsed successfully. Sheets:', parsed.sheetNames);

      setSelectedFile(file);
      setFileName(file.name);
      setFileSizeStr(formatBytes(file.size));
      setSheetNames(parsed.sheetNames);
      setLoadedWorkbook(parsed.workbook);

      const firstSheet = parsed.sheetNames[0] || '';
      setCurrentSheet(firstSheet);

      // Load sheet data
      loadSheet(parsed.workbook, firstSheet);
      setImportStep(2);
      addToast(`הקובץ "${file.name}" נטען בהצלחה!`);
    } catch (err: any) {
      console.error('[Excel Import] Error during file processing:', err);
      setGeneralError(err.message || 'שגיאה בלתי צפויה בפענוח הקובץ');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Load and inspect a specific sheet
  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      console.log(`[Excel Import] Loading sheet: "${sheetName}"`);
      const data = ExcelService.getSheetData(wb, sheetName);
      setSheetData(data);

      // Auto-detect column mappings
      const autoMap = ExcelService.autoDetectMapping(data.headers);
      console.log('[Excel Import] Auto-detected column mapping:', autoMap);
      setMapping(autoMap);

      // Compute initial validation
      const valResult = ExcelService.validateImportRows(
        data.rawRows,
        autoMap,
        tasks,
        employees,
        clients
      );
      console.log('[Excel Import] Initial validation result:', valResult);
      setValidationResult(valResult);
    } catch (err: any) {
      console.error('[Excel Import] Error loading sheet:', err);
      setGeneralError(`שגיאה בטעינת גיליון "${sheetName}": ${err.message}`);
    }
  };

  // Handle Sheet change
  const handleSheetChange = (newSheet: string) => {
    if (!loadedWorkbook) return;
    setCurrentSheet(newSheet);
    loadSheet(loadedWorkbook, newSheet);
  };

  // Handle Mapping change
  const handleMappingChange = (field: keyof ColumnMapping, colName: string) => {
    if (!mapping || !sheetData) return;
    const newMapping = { ...mapping, [field]: colName };
    setMapping(newMapping);

    // Re-validate
    const valResult = ExcelService.validateImportRows(
      sheetData.rawRows,
      newMapping,
      tasks,
      employees,
      clients
    );
    setValidationResult(valResult);
  };

  // Button click trigger
  const handleButtonClick = () => {
    console.log('[Excel Import] User clicked "ייבוא Excel" (id=btn-import-excel)');
    // Native <label htmlFor="excel-file-input"> handles the file open automatically.
    // If not triggered natively, fallback to ref:
    setTimeout(() => {
      if (fileInputRef.current && document.activeElement !== fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 50);
  };

  // Input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[Excel Import] file input onChange event fired');
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      const file = files[0];
      console.log('[Excel Import] Selected file from input dialog:', file.name, file.size);
      processSelectedFile(file);
    } else {
      console.log('[Excel Import] onChange fired but no file found');
    }
    // Reset so selecting identical file triggers onChange
    e.target.value = '';
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOver) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    console.log('[Excel Import] onDrop event fired');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Sample file one-click loader
  const handleLoadSampleFile = () => {
    console.log('[Excel Import] User clicked "טען קובץ משימות לדוגמה"');
    const sample = ExcelService.createSampleExcelFile();
    processSelectedFile(sample);
  };

  // Reset entire import flow
  const handleReset = () => {
    setSelectedFile(null);
    setFileName('');
    setFileSizeStr('');
    setSheetNames([]);
    setCurrentSheet('');
    setLoadedWorkbook(null);
    setSheetData(null);
    setMapping(null);
    setValidationResult(null);
    setGeneralError(null);
    setImportStep(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (!validationResult || validationResult.validTasks.length === 0) {
      alert('אין משימות תקינות לייבוא');
      return;
    }

    try {
      console.log('[Excel Import] Confirming import of tasks:', validationResult.validTasks.length);
      const importFn = addTasksBulk || importTasksBatch;
      if (typeof importFn === 'function') {
        importFn(validationResult.validTasks);
      } else {
        console.error('[Excel Import] Neither addTasksBulk nor importTasksBatch is defined');
      }
      setImportedCount(validationResult.validTasks.length);
      setImportStep(3);
      addToast(`יובאו בהצלחה ${validationResult.validTasks.length} משימות למערכת!`);
    } catch (err: any) {
      console.error('[Excel Import] Error during confirm import:', err);
      alert(`שגיאה בביצוע הייבוא: ${err?.message || err}`);
    }
  };

  // Download DB Backup
  const handleDownloadBackup = () => {
    const jsonStr = StorageService.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capacity_pro_backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('גיבוי מלא הורד בהצלחה');
  };

  // Restore DB Backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const success = StorageService.restoreBackupJSON(content);
      if (success) {
        addToast('הנתונים שוחזרו בהצלחה! הדף ירוענן כעת.');
        setTimeout(() => window.location.reload(), 800);
      } else {
        alert('קובץ הגיבוי אינו תקין');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="import-export-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            ייבוא וייצוא נתונים (Excel & Backup)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ייבוא משימות מאקסל עם מיפוי עמודות חכם, בדיקת תקינות מקדימה, ייצוא דוחות וגיבוי מלא
          </p>
        </div>
      </div>

      {/* Grid: 1. Excel Import & Mapping (Full width if step 2/3) | 2. Excel Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* SECTION A: EXCEL IMPORT */}
        <div
          className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 ${
            importStep >= 2 ? 'lg:col-span-2' : ''
          }`}
        >
          {/* Header Title */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">ייבוא משימות מאקסל</h3>
                <span className="text-xs text-slate-400">
                  {importStep === 1 && 'שלב 1: בחירת קובץ Excel / CSV'}
                  {importStep === 2 && 'שלב 2: תצוגה מקדימה, בחירת גיליון ומיפוי שדות'}
                  {importStep === 3 && 'שלב 3: הייבוא הושלם בהצלחה'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-download-template"
                onClick={() => ExcelService.downloadTaskTemplate()}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                title="הורדת קובץ אקסל לדוגמה עם כותרות תקינות"
              >
                <FileDown className="w-4 h-4 text-blue-600" />
                <span>הורד תבנית Excel לדוגמה</span>
              </button>

              {importStep >= 2 && (
                <button
                  type="button"
                  id="btn-reset-import"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg transition-colors"
                >
                  בחר קובץ אחר ✕
                </button>
              )}
            </div>
          </div>

          {/* Hidden native input, placed in DOM and hooked to ref and label */}
          <input
            id="excel-file-input"
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="sr-only"
            tabIndex={-1}
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          />

          {/* STEP 1: UPLOAD AREA & ACTIONS */}
          {importStep === 1 && (
            <div className="space-y-4">
              {/* General Error Banner */}
              {generalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
                  <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">שגיאה בטעינת הקובץ:</span>
                    <span>{generalError}</span>
                  </div>
                </div>
              )}

              {/* Native Accessible Drag & Drop Label */}
              <label
                htmlFor="excel-file-input"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50/70 scale-[1.005]'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/70 bg-slate-50/30'
                }`}
              >
                <div className="pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>

                  <span className="font-bold text-base text-slate-800 block">
                    גרור לכאן קובץ Excel או לחץ לבחירה
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    פורמטים נתמכים: <strong className="text-slate-700 font-mono">.xlsx, .xls, .csv</strong>
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    ניתן לייבא עשרות ומאות משימות בפעולה אחת
                  </span>
                </div>
              </label>

              {/* Primary Action Button & Fast Test Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <label
                  id="btn-import-excel"
                  htmlFor="excel-file-input"
                  onClick={handleButtonClick}
                  className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer select-none ${
                    isProcessing ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{isProcessing ? 'מעבד קובץ...' : 'ייבוא Excel (בחר קובץ מהמחשב)'}</span>
                </label>

                <button
                  type="button"
                  id="btn-load-sample-excel"
                  onClick={handleLoadSampleFile}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  title="טוען קובץ Excel מובנה עם 5 משימות לבדיקה מהירה של כל ה-Pipeline"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>טען קובץ משימות לדוגמה (לבדיקה מיידית)</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                  הנחיות לייבוא תקין:
                </div>
                <ul className="list-disc pr-4 space-y-0.5 text-[11px] text-slate-500">
                  <li>הקובץ חייב להכיל לפחות עמודת <strong>שם משימה</strong>.</li>
                  <li>שמות עובדים ולקוחות יותאמו אוטומטית למאגר הקיים במערכת (לפי שם או מזהה).</li>
                  <li>שעות עבודה (משוערות/בפועל) צריכות להיות מספריות (לדוגמה: 25, 40).</li>
                  <li>תאריכים נתמכים: YYYY-MM-DD, DD/MM/YYYY, או תאריכי אקסל רגילים.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: FILE LOADED, SHEET SELECTION, PREVIEW & MAPPING */}
          {importStep === 2 && sheetData && mapping && validationResult && (
            <div className="space-y-6">
              {/* 1. File & Sheet Info Bar (Requirement 11 & 13) */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 font-mono">{fileName}</span>
                      <span className="text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                        הקובץ נטען בהצלחה
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-3 mt-1">
                      <span>גודל קובץ: <strong className="font-mono">{fileSizeStr}</strong></span>
                      <span>•</span>
                      <span>מספר גיליונות: <strong>{sheetNames.length}</strong></span>
                      <span>•</span>
                      <span>סה"כ שורות בגיליון: <strong>{sheetData.totalRows}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Sheet Selector (if multiple sheets exist) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 shrink-0 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    גיליון פעיל:
                  </span>
                  {sheetNames.length > 1 ? (
                    <select
                      id="select-excel-sheet"
                      value={currentSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
                    >
                      {sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-800">
                      {currentSheet || 'גיליון 1'}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Raw Sheet Data Preview Table (First 10 Rows) (Requirement 13) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <TableIcon className="w-4 h-4 text-blue-600" />
                    תצוגה מקדימה של נתוני הקובץ (10 שורות ראשונות מהגיליון):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    מציג {Math.min(10, sheetData.rawRows.length)} מתוך {sheetData.rawRows.length} שורות
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs max-h-56 custom-scrollbar bg-white">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2 border-l border-slate-200 w-10 text-center">#</th>
                        {sheetData.headers.map((h, i) => (
                          <th key={i} className="p-2 border-l border-slate-200 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {sheetData.rawRows.slice(0, 10).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-blue-50/40">
                          <td className="p-2 border-l border-slate-100 font-mono text-center text-slate-400 bg-slate-50/50">
                            {rIdx + 2}
                          </td>
                          {sheetData.headers.map((h, cIdx) => (
                            <td key={cIdx} className="p-2 border-l border-slate-100 whitespace-nowrap font-sans">
                              {String(row[h] !== undefined ? row[h] : '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Column Mapping Panel (Requirement 14) */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    מיפוי עמודות מהאקסל לשדות המערכת:
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    העמודות זוהו אוטומטית, ניתן להתאים ידנית לפי הצורך
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Task Name - Required */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      שם משימה <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={mapping.taskName}
                      onChange={(e) => handleMappingChange('taskName', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-medium"
                    >
                      <option value="">-- בחר עמודה --</option>
                      {sheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">עובד אחראי</label>
                    <select
                      value={mapping.employee}
                      onChange={(e) => handleMappingChange('employee', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-medium"
                    >
                      <option value="">-- בחר עמודה --</option>
                      {sheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Client */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">לקוח</label>
                    <select
                      value={mapping.client}
                      onChange={(e) => handleMappingChange('client', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-medium"
                    >
                      <option value="">-- בחר עמודה --</option>
                      {sheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estimated Hours */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">שעות משוערות</label>
                    <select
                      value={mapping.estimatedHours}
                      onChange={(e) => handleMappingChange('estimatedHours', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-medium"
                    >
                      <option value="">-- ברירת מחדל (10 שעות) --</option>
                      {sheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actual Hours */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">שעות בפועל</label>
                    <select
                      value={mapping.actualHours || ''}
                      onChange={(e) => handleMappingChange('actualHours', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-medium"
                    >
                      <option value="">-- ללא (0) --</option>
                      {sheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Deadline */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">דדליין (תאריך יעד)</label>
                    <select
                      value={mapping.deadline || ''}
                      onChange={(e) => handleMappingChange('deadline', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-medium"
                    >
                      <option value="">-- ברירת מחדל (30 יום) --</option>
                      {sheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">עדיפות</label>
                    <select
                      value={mapping.priority || ''}
                      onChange={(e) => handleMappingChange('priority', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-medium"
                    >
                      <option value="">-- ברירת מחדל (רגילה) --</option>
                      {sheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">סטטוס</label>
                    <select
                      value={mapping.status || ''}
                      onChange={(e) => handleMappingChange('status', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-medium"
                    >
                      <option value="">-- ברירת מחדל (מתוכנן) --</option>
                      {sheetData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Live Validation Metrics Box (Requirement 16) */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    תוצאות בדיקת תקינות הקובץ:
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                      {validationResult.validCount} משימות תקינות
                    </span>
                    {validationResult.duplicateCount > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                        {validationResult.duplicateCount} כפילויות
                      </span>
                    )}
                    {validationResult.errorCount > 0 && (
                      <span className="text-xs bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold">
                        {validationResult.errorCount} שגיאות
                      </span>
                    )}
                  </div>
                </div>

                {/* Issues Log (Warnings & Errors) */}
                {validationResult.issues.length > 0 && (
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs custom-scrollbar">
                    {validationResult.issues.map((iss, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-1.5 text-[11px] py-0.5 ${
                          iss.type === 'error'
                            ? 'text-rose-700 font-semibold'
                            : iss.type === 'duplicate'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {iss.type === 'error' && <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />}
                        {iss.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />}
                        {iss.type === 'duplicate' && <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />}
                        <span>
                          <strong>שורה {iss.row}:</strong> {iss.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirmation Button (Requirement 15) */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    ביטול
                  </button>

                  <button
                    type="button"
                    id="btn-confirm-import"
                    onClick={handleConfirmImport}
                    disabled={validationResult.validCount === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>אשר וייבא {validationResult.validCount} משימות למערכת</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {importStep === 3 && (
            <div className="p-8 text-center space-y-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-emerald-900">הייבוא הושלם בהצלחה!</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  יובאו בהצלחה <strong>{importedCount}</strong> משימות חדשות למאגר הנתונים של המערכת.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab('tasks')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>צפה במשימות שיובאו בלוח המשימות</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  ייבא קובץ נוסף
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION B: EXCEL EXPORTS & JSON BACKUP */}
        {importStep === 1 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">ייצוא דוחות לאקסל</h3>
                <p className="text-xs text-slate-400">
                  הפקת דוחות Excel מעוצבים ומפורטים עבור הנהלה ופגישות עבודה
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Export 1: Tasks */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">ייצוא טבלת כל המשימות</h4>
                  <p className="text-xs text-slate-500">
                    כולל מזהים, לקוחות, עובדים אחראים, שעות נותרות, דדליינים וסטטוסים
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-export-tasks-view"
                  onClick={() => ExcelService.exportTasksToExcel(tasks, employees, clients)}
                  className="bg-white border border-slate-300 hover:border-emerald-500 text-slate-800 hover:text-emerald-700 font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ייצא משימות</span>
                </button>
              </div>

              {/* Export 2: Capacity Matrix */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    ייצוא דוח קיבולת ועומסים ({getHebrewMonthName(selectedMonth)})
                  </h4>
                  <p className="text-xs text-slate-500">
                    כולל קיבולת נטו/ברוטו, שעות משובצות, Billable, ניצולת ועומס יתר
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-export-capacity-view"
                  onClick={() =>
                    ExcelService.exportCapacityToExcel(teamMetrics, getHebrewMonthName(selectedMonth))
                  }
                  className="bg-white border border-slate-300 hover:border-emerald-500 text-slate-800 hover:text-emerald-700 font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ייצא קיבולת</span>
                </button>
              </div>
            </div>

            {/* Section C: Database JSON Backup & Restore */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>גיבוי ושחזור נתונים מלא (JSON Snapshot)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-download-db-backup"
                  onClick={handleDownloadBackup}
                  className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>הורד גיבוי מלא</span>
                </button>

                <label className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>שחזר מקובץ גיבוי</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
