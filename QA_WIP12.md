# QA WIP 12 – XLSX Integration + Build Gate

## מה נוסף
- `EntityExcelService` הופרד כך שהמרת Entity→שורות Excel ויצירת Workbook ניתנות לבדיקה ללא הורדה דרך הדפדפן.
- נוספה חבילת `tests/xlsx-integration.ts` המשתמשת בספריית `xlsx` האמיתית ולא ב-mock.
- נבדקים ארבעת סוגי הקבצים: משימות, לקוחות, עובדים והיעדרויות.
- נבדק Template → XLSX bytes → Read → Rows.
- נבדק Export rows → XLSX bytes → Read round-trip.
- נבדקת כפילות ודאית לפי מזהה עסקי לאחר parsing אמיתי של XLSX.
- נבדקת כפילות בין שתי שורות באותו Workbook וחסימת Update מול שורה שטרם קיימת במערכת.
- נבדק Update של משימה מיובאת והזזת TaskAllocation לעובד/חודש/שעות החדשים.

## Release Gate
GitHub Actions כולל כעת לפני בניית ה-Installer:
1. TypeScript validation
2. Core regression
3. XLSX integration
4. Production Vite build
5. Windows installer build

אם אחד השלבים נכשל, ה-EXE לא מועלה כ-Artifact.

## מצב סביבת העבודה הנוכחית
ניסיון `npm install` בסביבת העבודה המקומית הסתיים ב-timeout, ולכן `test:xlsx` ו-build מלא לא סומנו כ-PASS מקומי. הם חייבים לעבור ב-GitHub Actions לאחר העלאת WIP 12.

**Release Gate: CLOSED**
