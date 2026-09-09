import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  PlusCircle,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  ChevronLeft,
  CalendarDays,
  Send,
} from 'lucide-react';
import { AbsenceRequest, AbsenceType } from '../../types';
import { useApp } from '../../context/AppContext';
import { calculateWorkingDaysBetween } from '../../services/absenceImpactEngine';

export const MyAbsencesView: React.FC = () => {
  const {
    currentUser,
    employees,
    absenceRequests,
    submitAbsenceRequest,
    cancelAbsenceRequest,
    settings,
  } = useApp();

  const [absenceType, setAbsenceType] = useState<AbsenceType>('חופשה');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [partialDay, setPartialDay] = useState(false);
  const [hours, setHours] = useState(4.5);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Match employee record with current logged in user
  const myEmployee = useMemo(() => {
    if (!currentUser) return employees[0] || null;
    return employees.find((e) => e.employeeNumber === currentUser.employeeNumber) || employees[0] || null;
  }, [currentUser, employees]);

  // User's requests
  const myRequests = useMemo(() => {
    if (!myEmployee) return [];
    return absenceRequests.filter((r) => r.employeeId === myEmployee.id);
  }, [absenceRequests, myEmployee]);

  // Pre-calculated working days & hours
  const calculatedDays = useMemo(() => {
    return calculateWorkingDaysBetween(startDate, endDate, settings);
  }, [startDate, endDate, settings]);

  const calculatedHours = useMemo(() => {
    if (partialDay) return hours;
    const daily = myEmployee?.dailyWorkHours || 9;
    return calculatedDays * daily;
  }, [partialDay, hours, calculatedDays, myEmployee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myEmployee) return;

    setIsSubmitting(true);
    const result = submitAbsenceRequest({
      employeeId: myEmployee.id,
      employeeNumber: myEmployee.employeeNumber || currentUser?.employeeNumber || '10001',
      employeeName: myEmployee.name,
      teamId: myEmployee.teamId,
      absenceType,
      startDate,
      endDate,
      partialDay,
      hours: calculatedHours,
      reason,
      createdBy: currentUser?.fullName || myEmployee.name,
    });

    setIsSubmitting(false);
    if (result.success) {
      setReason('');
      setPartialDay(false);
    }
  };

  const getStatusBadge = (status: AbsenceRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            ממתין לאישור מנהל
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            אושר
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            נדחה
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            בוטל
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            הגשת וניהול בקשות ההיעדרות שלי
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            הגשת בקשות חופשה, מחלה או מילואים ישירות למנהל הצוות עם חישוב ימי עבודה מדויק
          </p>
        </div>
        {myEmployee && (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>מחובר כ: <strong className="text-slate-900">{myEmployee.name}</strong></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            הגשת בקשה חדשה
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Absence Type */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">סוג היעדרות</label>
              <select
                value={absenceType}
                onChange={(e) => setAbsenceType(e.target.value as AbsenceType)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="חופשה">חופשה שנתית</option>
                <option value="מחלה">מחלה</option>
                <option value="מילואים">מילואים (צו 8 / שירות פעיל)</option>
                <option value="יום בחירה">יום בחירה</option>
                <option value="אחר">אחר</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">מתאריך</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">עד תאריך</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Partial Day Toggle */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={partialDay}
                  onChange={(e) => setPartialDay(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">היעדרות חלקית (שעות ספורות)</span>
              </label>

              {partialDay && (
                <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                  <label className="font-medium text-slate-600">מספר שעות:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="9"
                    value={hours}
                    onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                    className="w-20 p-1.5 rounded-lg border border-slate-300 font-mono text-center text-xs"
                  />
                  <span className="text-2xs text-slate-400">(לדוגמה חצי יום 4.5 שעות)</span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">פירוט / סיבה (יוצג למנהל)</label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="למשל: נסיעה משפחתית, טיפול רפואי, מילואים בצפון..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Live Estimation Box */}
            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="flex justify-between">
                <span>ימי עבודה בפועל:</span>
                <span className="font-bold font-mono">{calculatedDays} ימים</span>
              </div>
              <div className="flex justify-between">
                <span>סה״כ שעות היעדרות מחושבות:</span>
                <span className="font-bold font-mono text-rose-600">{calculatedHours} שעות</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || calculatedDays === 0}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>שלח בקשה לאישור מנהל</span>
            </button>
          </form>
        </div>

        {/* Requests History List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-slate-700" />
            היסטוריית הבקשות שלי ({myRequests.length})
          </h2>

          {myRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">טרם הוגשו בקשות היעדרות</p>
              <p className="text-xs text-slate-400 mt-0.5">כאן יופיעו הבקשות שהגשת והסטטוס המעודכן שלהן מול המנהל.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{req.absenceType}</span>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="text-slate-600 flex items-center gap-3 font-mono">
                      <span>{req.startDate} עד {req.endDate}</span>
                      <span>•</span>
                      <span>{req.hours} שעות</span>
                    </div>
                    {req.reason && (
                      <p className="text-slate-500 italic mt-0.5">
                        ״{req.reason}״
                      </p>
                    )}
                    {req.managerComment && (
                      <div className="text-2xs text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                        <strong>הערת מנהל:</strong> {req.managerComment}
                      </div>
                    )}
                  </div>

                  {req.status === 'PENDING' && (
                    <button
                      onClick={() => cancelAbsenceRequest(req.id, 'בוטל על ידי העובד')}
                      className="text-rose-600 hover:text-rose-800 p-2 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1 self-start sm:self-center"
                      title="בטל בקשה"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>בטל בקשה</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
