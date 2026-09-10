# QA WIP 11 – Import/Export Integration

## תוצאות אוטומטיות
- Core regression: **30/30 PASS**.
- נוספו בדיקות Validation ל-Deadline, טווחי היעדרות ושעות לא חוקיות.
- נוספו בדיקות Commit ל-Insert/Update/Skip, שמירת מקור הנתונים, וסנכרון TaskAllocation לאחר עדכון משימה.
- נבדק ש-Update מול כפילות שמקורה בשורה אחרת באותו Workbook נחסם ולא יכול ליצור עדכון שקט לרשומה שאינה קיימת.

## תיקונים שנמצאו בסבב
1. **High** – Update של משימה מיובאת לא עדכן את הקצאת ה-Import ולכן Capacity עלול היה להישאר אצל עובד/חודש ישן. תוקן ונבדק.
2. **Medium** – UI אפשר `עדכן את הקיימת` גם כאשר ההתאמה הייתה שורה קודמת באותו קובץ ולא רשומה קיימת במערכת. תוקן ונבדק.
3. **High** – לוגיקת Commit הייתה מפוזרת בתוך React UI ולכן לא ניתן היה לבצע Preflight מלא לפני כתיבה. הופרדה ל-`ImportCommitService` שבונה Plan בזיכרון לפני Persistence.
4. **Medium** – Validation חסר לערכים שליליים/טווחי תאריכים/Deadline. הורחב.

## Fixtures
נוצרו 4 קבצי XLSX תחת `tests/import-fixtures/` לבדיקות UI/E2E ב-Windows/GitHub build.

## עדיין פתוח לפני Release
- הרצת קבצי XLSX האמיתיים דרך UI עם ספריית `xlsx` האמיתית לאחר `npm install`.
- בדיקת Export -> Import round-trip בפועל.
- Build מלא, UI/E2E, Persistence לאחר Restart ו-Regression לכל המסכים.

**Release Gate: CLOSED**
