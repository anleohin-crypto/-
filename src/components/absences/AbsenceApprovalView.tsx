import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  ShieldAlert,
  ArrowUpDown,
  User,
  AlertTriangle,
  ChevronLeft,
  FileText,
  Building,
} from 'lucide-react';
import { AbsenceRequest, AbsenceRequestStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { AbsenceImpactModal } from './AbsenceImpactModal';

export const AbsenceApprovalView: React.FC = () => {
  const {
    absenceRequests,
    employees,
    teams,
    approveAbsenceRequest,
    rejectAbsenceRequest,
    currentUser,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<AbsenceRequestStatus | 'ALL'>('PENDING');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<AbsenceRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return absenceRequests.filter((req) => {
      // Status filter
      if (statusFilter !== 'ALL' && req.status !== statusFilter) {
        return false;
      }
      // Team filter
      if (teamFilter !== 'ALL' && req.teamId !== teamFilter) {
        return false;
      }
      // Search query (employee name, reason, employeeNumber)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = req.employeeName.toLowerCase().includes(q);
        const matchEmpNo = req.employeeNumber.toLowerCase().includes(q);
        const matchReason = req.reason?.toLowerCase().includes(q) || false;
        if (!matchName && !matchEmpNo && !matchReason) return false;
      }
      return true;
    });
  }, [absenceRequests, statusFilter, teamFilter, searchQuery]);

  const pendingCount = useMemo(() => {
    return absenceRequests.filter((r) => r.status === 'PENDING').length;
  }, [absenceRequests]);

  const handleOpenAnalysis = (req: AbsenceRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: AbsenceRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            ממתין לאישור
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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              אישור וניהול בקשות היעדרות
            </h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                {pendingCount} בקשות ממתינות
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            סימולציה וניתוח השפעה בזמן אמת על ה-Capacity, משימות חופפות, דדליינים וחלופות צוות לפני אישור
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Segment */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === 'PENDING'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ממתינות</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-2xs bg-rose-600 text-white font-mono">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'APPROVED'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              מאושרות
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'REJECTED'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              נדחו
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              כל הבקשות
            </button>
          </div>

          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">כל הצוותים</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם או סיבה..."
              className="text-xs bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Requests Table / Cards */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-800">
            {statusFilter === 'PENDING' ? 'אין בקשות היעדרות הממתינות לאישור כעת' : 'לא נמצאו בקשות התואמות את הסינון'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            כל הבקשות שטופלו מתועדות ומעודכנות ישירות ב-Capacity וביומן הביקורת.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => {
              const emp = employees.find((e) => e.id === req.employeeId);
              const team = teams.find((t) => t.id === req.teamId);

              return (
                <div
                  key={req.id}
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                        {req.employeeName.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{req.employeeName}</span>
                          <span className="text-2xs text-slate-400 font-mono">#{req.employeeNumber}</span>
                          <span className="text-2xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {req.absenceType}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                          {team && <span>צוות: {team.name}</span>}
                          <span>תפקיד: {emp?.role || 'עובד'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.startDate} עד {req.endDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.partialDay ? `חצי יום (${req.hours} שעות)` : `${req.hours} שעות מתוכננות`}</span>
                      </div>
                      {req.reason && (
                        <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-200/80">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.reason}</span>
                        </div>
                      )}
                    </div>

                    {req.managerComment && (
                      <div className="text-xs text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 mt-1">
                        <strong className="text-amber-900">הערת מנהל:</strong> {req.managerComment}
                        {req.approvedBy && <span className="text-2xs text-slate-400 mr-2">(אושר על ידי {req.approvedBy})</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenAnalysis(req)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-4 h-4 text-blue-600" />
                      <span>{req.status === 'PENDING' ? 'ניתוח השפעה ואישור' : 'צפה בניתוח השפעה'}</span>
                    </button>

                    {req.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => approveAbsenceRequest(req.id)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-2xs"
                          title="אישור מהיר"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>אשר</span>
                        </button>

                        <button
                          onClick={() => rejectAbsenceRequest(req.id)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1"
                          title="דחה בקשה"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>דחה</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Real-time Impact Analysis Modal */}
      <AbsenceImpactModal
        isOpen={isModalOpen}
        request={selectedRequest}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
        onApprove={(id, comment) => approveAbsenceRequest(id, comment)}
        onReject={(id, comment) => rejectAbsenceRequest(id, comment)}
        isViewOnly={selectedRequest?.status !== 'PENDING'}
      />
    </div>
  );
};
