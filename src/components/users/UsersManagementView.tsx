import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Briefcase,
  Phone,
  Mail,
  Edit2,
  X,
  Filter,
  UserCheck,
  UserX,
} from 'lucide-react';
import { User, AppRole } from '../../types';
import { useApp } from '../../context/AppContext';

export const UsersManagementView: React.FC = () => {
  const { users, teams, addUser, updateUser, toggleUserActive, currentUser } = useApp();

  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // New User Form State
  const [formData, setFormData] = useState({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    role: 'EMPLOYEE' as AppRole,
    teamId: teams[0]?.id || '',
    active: true,
  });

  const [formError, setFormError] = useState('');

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (teamFilter !== 'ALL' && u.teamId !== teamFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchEmpNo = u.employeeNumber.toLowerCase().includes(q);
        const matchPhone = u.phone.includes(q);
        if (!matchName && !matchEmail && !matchEmpNo && !matchPhone) return false;
      }
      return true;
    });
  }, [users, roleFilter, teamFilter, searchQuery]);

  const handleOpenAdd = () => {
    setFormData({
      employeeNumber: String(10000 + users.length + 1),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      title: '',
      role: 'EMPLOYEE',
      teamId: teams[0]?.id || '',
      active: true,
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      employeeNumber: user.employeeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      title: user.title || '',
      role: user.role,
      teamId: user.teamId || '',
      active: user.active,
    });
    setFormError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setFormError('נא להזין שם פרטי ושם משפחה');
      return;
    }
    if (!formData.employeeNumber.trim()) {
      setFormError('נא להזין מספר עובד');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('נא להזין כתובת מייל תקינה');
      return;
    }

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

    if (editingUser) {
      const result = updateUser({
        ...editingUser,
        employeeNumber: formData.employeeNumber.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        title: formData.title.trim(),
        role: formData.role,
        teamId: formData.teamId,
        active: formData.active,
      });
      if (!result.success) {
        setFormError(result.error || 'שגיאה בעדכון המשתמש');
        return;
      }
      setEditingUser(null);
    } else {
      const result = addUser({
        employeeNumber: formData.employeeNumber.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        title: formData.title.trim(),
        role: formData.role,
        teamId: formData.teamId,
        active: formData.active,
      });

      if (!result.success) {
        setFormError(result.error || 'שגיאה ביצירת המשתמש');
        return;
      }
      setIsAddModalOpen(false);
    }
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            מנהל מערכת
          </span>
        );
      case 'TEAM_MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            מנהל צוות
          </span>
        );
      case 'EMPLOYEE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            עובד
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">ניהול משתמשים והרשאות</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 font-mono">
              {users.length} משתמשים
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            הגדרת משתמשי המערכת, שיוך לצוותים, הרשאות תפקיד (ADMIN / מנהל צוות / עובד) והפעלה/השבתה
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>הוסף משתמש חדש</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>תפקיד:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">כל התפקידים</option>
              <option value="ADMIN">מנהלי מערכת (ADMIN)</option>
              <option value="TEAM_MANAGER">מנהלי צוות (TEAM_MANAGER)</option>
              <option value="EMPLOYEE">עובדים (EMPLOYEE)</option>
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>צוות:</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">כל הצוותים</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם, מייל או מספר עובד..."
            className="w-full text-xs border border-slate-200 rounded-lg pr-8 pl-3 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5">עובד / משתמש</th>
                <th className="p-3.5">מספר עובד</th>
                <th className="p-3.5">הרשאה במערכת</th>
                <th className="p-3.5">צוות ותפקיד</th>
                <th className="p-3.5">פרטי התקשרות</th>
                <th className="p-3.5 text-center">סטטוס</th>
                <th className="p-3.5 text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const team = teams.find((t) => t.id === user.teamId);
                const isCurrent = currentUser?.uid === user.uid;

                return (
                  <tr key={user.uid} className={`hover:bg-slate-50/70 transition-colors ${!user.active ? 'opacity-60 bg-slate-50/40' : ''}`}>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                          {user.firstName.substring(0, 1)}{user.lastName.substring(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{user.fullName}</span>
                            {isCurrent && (
                              <span className="text-2xs bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-sans">
                                אתה
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-slate-400 font-mono mt-0.5">
                            נוצר ב-{user.createdAt.substring(0, 10)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-700">
                      #{user.employeeNumber}
                    </td>

                    <td className="p-3.5">
                      {getRoleBadge(user.role)}
                    </td>

                    <td className="p-3.5">
                      <div className="text-slate-800 font-medium">{team?.name || 'לא שויך לצוות'}</div>
                      <div className="text-2xs text-slate-500">{user.title || 'עובד'}</div>
                    </td>

                    <td className="p-3.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600 font-sans">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 font-mono text-2xs">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{user.phone}</span>
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => toggleUserActive(user.uid)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold transition-colors ${
                          user.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                        title="לחץ כדי לשנות סטטוס פעיל/מושבת"
                      >
                        {user.active ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            פעיל
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" />
                            מושבת
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-3.5 text-left">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="ערוך פרטי משתמש"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-right">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {editingUser ? 'עריכת פרטי משתמש' : 'הוספת משתמש חדש למערכת'}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Number and Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">מספר עובד *</label>
                  <input
                    type="text"
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                    placeholder="למשל 10006"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">הרשאה / תפקיד *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as AppRole })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EMPLOYEE">עובד (EMPLOYEE)</option>
                    <option value="TEAM_MANAGER">מנהל צוות (TEAM_MANAGER)</option>
                    <option value="ADMIN">מנהל מערכת (ADMIN)</option>
                  </select>
                </div>
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">שם פרטי *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">שם משפחה *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">כתובת מייל *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@capacitypro.co.il"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">טלפון נייד</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="050-1234567"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Team and Job Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">שיוך לצוות</label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">ללא שיוך צוות</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">תואר משרה / תפקיד</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="למשל מפתח Fullstack"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800">חשבון פעיל (יכול להתחבר למערכת)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                >
                  {editingUser ? 'שמור שינויים' : 'צור משתמש'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
