# Leasing Team Manager 1.1.0 – Work in Progress

## Implemented in this development batch

- Excel import/export by entity: tasks, clients, employees, absences / team-wide leave.
- Smart duplicate detection at record level with exact/high/medium risk scoring.
- Per-row import decision: import as new / update existing / skip.
- Bulk duplicate actions and pre-import preview statistics.
- Manager Excel report.
- Full JSON backup/restore improvements + internal daily snapshots (14 retained).
- Data integrity check for orphan allocations, missing relations, duplicate business IDs, invalid dates and negative hours.
- Recurring / continuous tasks:
  - specific dates
  - fixed day of month
  - nth weekday of month
  - weekly weekday
  - exception dates
  - hours per occurrence
- Monthly capacity allocations generated from recurring occurrences.
- Daily-capacity risk view for recurring tasks vs employee daily availability / absences.
- Task planning state: Draft (does not consume capacity) / Approved.
- Task dependencies.
- Baseline vs current planning values.
- Required reason when task dates change.
- Task source classification.
- Separate task comments with timestamp/history while retaining legacy notes.
- Task-level audit history inside the task edit screen.
- More detailed global Audit Log with filters, date range, expandable field changes and import source.
- Broader audit coverage for tasks, employees, clients, absences, settings and Excel import.
- Notifications fixes:
  - mark all as read
  - clear all without auto-regeneration of same alert IDs
  - undo cleared notifications
- Closed-month locking and reopening control.
- Stronger task validation: inactive employee/client, invalid dates, negative hours, closed month.
- Version display and Windows data-folder opener via secure Electron preload/IPC.
- Version bumped to 1.1.0 and Windows build kept in --publish never mode.
- GitHub Actions npm-cache setting removed because repository currently has no npm lockfile.

## Validation performed here

- TypeScript/TSX syntax transpile check: 45 source files, 0 syntax errors.
- Electron main/preload Node syntax check: passed.

## Still required before calling 1.1.0 install-ready

- Full dependency install and `npm run lint`/`npm run build` in GitHub Actions.
- Fix any semantic TypeScript errors surfaced by the real dependency types.
- Windows installer build and smoke test.
- Upgrade test over an existing 1.0.0 profile with real user data backup.

## סבב פיתוח 2 – Planning Intelligence Foundation

נוסף בפועל:
- מודל Dependency מתקדם: FS / SS / FF / SF + Lag.
- מניעת Circular Dependencies ברמת מנוע.
- ניתוח Dependency חסום והצעת Cascade ללא ביצוע אוטומטי.
- Baseline snapshots מרובי גרסאות עם שמירת משימות והקצאות.
- השוואת Baseline מול Current Plan ברמת משימה.
- מנוע Planning Issues שמזהה Overload, Underutilization, Deadline Risk, Overdue, Absence Conflict, Planned/Actual Variance ו-Dependency Blocks.
- מנוע Forecast ל-6 חודשים עם Capacity / Planned / Billable / Non-Billable / Idle / Overload / Utilization.
- תמיכה ראשונית ב-Planning Scenarios במנוע ה-Forecast ללא שינוי נתוני המקור.
- מסך חדש "מרכז תכנון חכם" בתפריט הראשי, כולל Overview, דורש טיפול, Baselines ו-Forecast.
- Baselines ו-Scenarios נוספו לגיבוי/שחזור המלא ול-DataLayer המקומי.

בדיקות שבוצעו בסבב זה:
- TypeScript type-check ממוקד למנועי התכנון: PASS.
- בדיקת FS חסום: PASS.
- בדיקת Circular Dependency: PASS.
- בדיקת Cascade מוצע עם Lag: PASS.
- בדיקת יצירת Baseline: PASS.

עדיין לא Release Candidate:
- נדרש npm install/build מלא בסביבת GitHub Actions.
- נדרש UI מלא לעריכת Dependencies מתוך משימה.
- נדרש UI להשוואת Baselines ו-Scenario editing מלא.
- Auto Planning עדיין אינו מנוע אופטימיזציה מלא.
- Gantt אינטראקטיבי + Critical Path עדיין דורשים פיתוח.
- נדרש QA/Regression מלא לפי Release Gate לפני התקנה.

## WIP 3 – Planning Intelligence expansion

- הוספת Dependencies מלאים מתוך עריכת משימה: מספר תלויות, FS/SS/FF/SF, Lag ומניעת Circular Dependency.
- הוספת מנוע Critical Path ראשוני מבוסס dependency graph, כולל חישוב Float וסימון משימות קריטיות.
- שדרוג Gantt: סימון Critical Path, סימון Dependency חסום וניווט חודשים דינמי במקום חודשים קשיחים.
- שדרוג Baseline: בחירת Baseline והשוואת Baseline → Current → Actual ברמת משימה, תאריכים ושעות.
- הוספת Auto Planning Recommendation Engine: הצעות להעברת משימה לעובד פנוי, הזזת תאריכים והעלאת עדיפות לפי חריגים.
- כל הצעת Auto Planning מוצגת כ-Current Plan → Suggested Plan → Impact ואינה מיושמת ללא אישור מפורש.
- אישור המלצת Auto Planning נרשם ב-Audit Log.
- Backward compatibility ל-dependencyIds הישנים נשמרה.
- addTask מנרמל successorTaskId של Dependencies חדשים לאחר יצירת מזהה המשימה.

### בדיקות שבוצעו בסבב WIP 3

- TypeScript type-check למנועי הליבה החדשים: PASS.
- Circular dependency detection: PASS.
- Critical Path לשרשרת A→B→C: PASS; כל שלוש המשימות זוהו כקריטיות עם Float=0.
- Auto Planning לעובד ב-130% ניצולת מול עובד עם 60 שעות פנויות: PASS; התקבלה הצעת Reassign.
- Full project type-check טרם בוצע בסביבה המקומית משום ש-node_modules של הפרויקט אינו מותקן; GitHub Actions יידרש ל-TypeScript/Build מלא לפני Release Candidate.

### עדיין לא Release Candidate

נותרו בין היתר: Scenario Planning מתקדם עם השוואת Forecast מלאה, Gantt אינטראקטיבי Drag & Drop ושינוי משך, Milestones, Auto Planning מתקדם יותר (פיצול עבודה/כישורים/Dependencies), Executive Dashboard מלא, QA/Regression/E2E ובדיקת Windows Build מלאה.

## WIP 4 – Scenario Planning / Forecast comparison
- Added isolated ScenarioService for virtual planning changes.
- Scenario changes are applied to both tasks and monthly/day-level allocations, without changing production data.
- Added task/client/project delay scenarios with positive/negative day offsets.
- Added Current Forecast → Scenario Forecast comparison in Planning Intelligence.
- Forecast comparison shows planned-hours delta, overload before/after and idle delta per month.
- Scenario reset is non-destructive.

## WIP 5 – Interactive Gantt + safer planning execution

- Gantt upgraded from display-only to interactive planning:
  - Drag & Drop task to a different date.
  - Drag & Drop task to another employee lane to reassign it.
  - Preserve task duration when moving.
  - Day-level allocations shift with the task; allocation month is recalculated from the shifted date.
  - `- / +` controls change task duration by one day.
  - Explicit impact-confirmation modal before applying any Gantt planning change.
  - Dependency cascade preview lists every downstream task whose dates need to move.
  - No Gantt move/cascade is committed before user approval.
- Existing `updateTask` allocation payload extended to preserve day-level `allocationDate`, `source`, and `notes` instead of flattening advanced allocations during planning updates.
- Auto Planning improved:
  - Full reassign is now proposed only when the recipient has enough capacity for the whole remaining task.
  - When only partial capacity exists, the engine proposes `split_task` rather than incorrectly presenting a partial move as a full reassignment.
  - Approved split creates a child task, reduces only the future remaining/estimated work on the source task, and transfers allocation hours without deleting already performed hours.
  - Split action is fully approval-gated and audited.
- Core logic test executed successfully for dependency blocking, dependency cascade with lag, Critical Path, and Auto Planning split recommendation.
- Project-wide TypeScript scan (without installed third-party node_modules) showed no additional non-module-resolution TypeScript errors after this round. Full npm lint/build still required in GitHub Actions before release.

## WIP 6 – Gantt zoom + milestones
- Added task-level `isMilestone` with backward-compatible optional field.
- Added Milestone checkbox to task editing/creation; milestone end date is normalized to its start date.
- Gantt now supports Day / Week / Month zoom windows:
  - Day = selected calendar month
  - Week = rolling 8-week planning horizon
  - Month = rolling 6-month planning horizon
- Gantt navigation now advances by a zoom-appropriate period.
- Drag/drop date calculation now uses the active visible planning horizon instead of assuming a single month.
- Milestones render as draggable diamonds and cannot be resized.
- Task rows expose dependency count and retain blocked / critical path markings.
- Existing dependency impact approval modal remains in place for drag/drop and duration changes.

### WIP 6 validation
- Electron main/preload Node syntax checks: PASS.
- TypeScript project scan executed. Environment has no local node_modules, therefore expected missing-package/type errors occur for React/lucide/xlsx/Vite. No additional parser/syntax error was reported for the changed Gantt, TaskModal or types files.
- Full React/Electron build remains pending GitHub Actions and is not release-approved.

## WIP 7 – Advanced Gantt dependencies + Executive Dashboard drilldowns

- Added visual dependency connectors to the Gantt for FS/SS/FF/SF relationships, using the actual rendered task/milestone positions.
- Blocked dependencies are displayed distinctly from normal dependency lines.
- Dependency connectors remain aligned across day/week/month zoom because their coordinates are recalculated from the rendered bars.
- Added Dashboard focus controls for month, employee, client and project, including one-click reset.
- Added drilldown support for allocated hours, Non-Billable hours, expected idle, actual hours and absences.
- Added management KPI cards for Planned Hours, Actual Hours, Remaining Hours and Absences.
- Actual Hours is explicitly described as cumulative actual hours on tasks overlapping the selected month until a future daily timesheet model exists; this avoids presenting it as exact monthly time-entry data.
- Extended the DrilldownState API without breaking existing drilldown types.

### WIP 7 validation

- TypeScript parser/type scan of the modified Dashboard, Drilldown, Gantt and AppContext files: no project-code syntax errors detected. The only reported diagnostics in the isolated environment are missing external packages (`react`, `lucide-react`, `recharts`) because node_modules is not installed here.
- Full React/Electron build and interaction QA remain mandatory in GitHub Actions before release.

## WIP 8 – Auto Planning impact + QA hardening
- Auto Planning now ranks recommendations by minimum disruption: Critical Path membership, dependency degree and priority reduce recommendation score.
- Reassignment prefers an active employee whose primary client matches the task before raw free capacity.
- Date-shift recommendations now simulate and include the full downstream Dependency cascade in `Current → Suggested → Impact` before approval.
- Recommendation score is reduced when a proposed shift affects additional dependent tasks.
- Fixed a regression-risk found during QA: split child tasks no longer inherit dependency objects that still reference the original source task ID.
- Electron main/preload syntax checks pass.

## WIP 9 – Regression hardening
- Added an executable core regression suite (`npm run test:core`) and made it a mandatory GitHub Actions gate before the Windows installer is built.
- Fixed Scenario day-level allocation movement: allocation dates now move by the exact scenario day delta even when the task remains in the same month, and the allocation month is derived from the shifted date when relevant.
- Fixed filtered Capacity/Executive KPI leakage: task allocations belonging to tasks outside the selected client/project scope are no longer counted in the filtered result.
- Fixed cross-month absence accounting: absence hours are apportioned across months by actual configured workdays instead of being double-counted or missed when the absence spans month boundaries.
- Added regression cases for recurrence, dependency constraints/cycles/cascade, critical path, baseline immutability/variance, scenario isolation, day-level scenario shifts, client-filtered capacity, cross-month absences, and data-integrity failures.

## WIP 10 – Regression + Smart Duplicate Import hardening
- Expanded automated core regression from 15 to 24 scenarios.
- Added Planning Intelligence tests for overload aggregation and absence/task overlap.
- Added Auto Planning tests for full reassignment, partial split and immutable apply.
- Added Forecast/Scenario isolation regression across month boundaries.
- Hardened Excel duplicate detection:
  - client code / employee number / task number are exact business-ID matches;
  - same task name alone is intentionally not considered a duplicate;
  - rows are now checked against earlier rows in the same import file as well as existing application data;
  - duplicate decisions remain user-controllable in preview.
- QA result for the core suite: 24/24 passed.
- Release Gate remains closed pending full build, UI/E2E and persistence tests.

## WIP 11 – Import/Export Integration hardening
- הופרדה לוגיקת Commit של Excel ל-`ImportCommitService` עם Preflight מלא בזיכרון לפני Persistence.
- תיקון סנכרון TaskAllocation לאחר Update של משימה מיובאת (עובד/חודש/שעות).
- שמירת Manual allocations בזמן החלפת Import allocations.
- חסימת `Update existing` כאשר הכפילות היא מול שורה אחרת באותו קובץ.
- Validation נוסף: Deadline לפני Planned End, תאריכי היעדרות הפוכים, שעות שליליות/אפס, אחוז משרה, שעות וימי עבודה.
- נוספו 4 XLSX QA fixtures ללקוחות/עובדים/היעדרויות/משימות.
- Core regression הורחב ל-30 תרחישים: 30/30 PASS בסביבת הבדיקה המקומית.

## WIP 12 – Real XLSX integration + stricter release build gate
- Refactored Excel export/template generation into testable `templateRows`, `exportRows` and `createWorkbook` methods while preserving existing download behavior.
- Added real `xlsx` integration suite for templates and export round-trips across tasks, clients, employees and absences.
- Added regression through real workbook serialization/parsing for exact business-ID duplicate detection, in-workbook duplicates and task-allocation synchronization on update.
- Added `npm run test:xlsx` and `npm run test:release`.
- GitHub Windows build now requires TypeScript, core regression, XLSX integration and an explicit production Vite build before building/uploading the installer.
- Local dependency installation timed out in the isolated environment; full npm/XLSX/Vite/Electron validation remains a mandatory GitHub Actions gate.


## WIP 14
- הקשחת Validation של תאריכים בייבוא Excel.
- מניעת קבלה של תאריכים קלנדריים לא חוקיים כגון 2026-02-31.
- תמיכה נכונה בבדיקת 29 בפברואר בשנים מעוברות.
- נוספו בדיקות XLSX Integration למקרי קצה של תאריכים.
- Static Release Gate: 13/13 PASS.
