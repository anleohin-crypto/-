import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  Shield,
  Briefcase,
  User as UserIcon,
  X,
  KeyRound,
  Mail,
  Hash,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, AppRole } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, login, logout, users } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim()) {
      setError('נא להזין כתובת מייל, טלפון או מספר עובד');
      return;
    }

    const res = login(identifier.trim());
    if (res.success && res.user) {
      setSuccess(`ברוך הבא, ${res.user.fullName}!`);
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      setError(res.error || 'פרטי התחברות שגויים');
    }
  };

  const handleQuickSwitch = (u: User) => {
    const res = login(u.email);
    if (res.success) {
      onClose();
    }
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-purple-100 text-purple-800">
            <Shield className="w-3 h-3 text-purple-600" />
            מנהל מערכת
          </span>
        );
      case 'TEAM_MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-100 text-blue-800">
            <Briefcase className="w-3 h-3 text-blue-600" />
            מנהל צוות
          </span>
        );
      case 'EMPLOYEE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700">
            <UserIcon className="w-3 h-3 text-slate-500" />
            עובד
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-right" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">התחברות והחלפת משתמש</h2>
              <p className="text-xs text-slate-500">בקרת הרשאות ופרופיל אישי ב-CapacityPro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current User Card */}
          {currentUser && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                  {currentUser.firstName.substring(0, 1)}{currentUser.lastName.substring(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{currentUser.fullName}</span>
                    {getRoleBadge(currentUser.role)}
                  </div>
                  <div className="text-2xs text-slate-500 font-mono mt-0.5">
                    {currentUser.email} • #{currentUser.employeeNumber}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setIdentifier('');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>התנתק</span>
              </button>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                התחברות לפי מייל, טלפון או מספר עובד:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="למשל: admin@capacitypro.co.il או 10001"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 pr-9 font-sans"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-2xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-2xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>התחבר לחשבון</span>
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              החלפת משתמש מהירה לבדיקה (One-Click Demo):
            </div>
            <div className="space-y-1.5">
              {users.slice(0, 4).map((u) => {
                const isSelected = currentUser?.uid === u.uid;
                return (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => handleQuickSwitch(u)}
                    className={`w-full p-2.5 rounded-xl border text-xs text-right flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-400'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-2xs">
                        {u.firstName.substring(0, 1)}{u.lastName.substring(0, 1)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{u.fullName}</div>
                        <div className="text-2xs text-slate-400 font-mono">#{u.employeeNumber}</div>
                      </div>
                    </div>
                    <div>
                      {getRoleBadge(u.role)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
