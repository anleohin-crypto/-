import React, { useState } from 'react';
import {
  ListOrdered,
  PlusCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Shield,
  Tag,
  X,
  Star,
  Check,
} from 'lucide-react';
import { TaskStatusConfig, StatusCategory, AppRole } from '../../types';
import { useApp } from '../../context/AppContext';

export const TaskStatusesManagementView: React.FC = () => {
  const {
    taskStatuses,
    saveTaskStatus,
    deleteTaskStatus,
    reorderTaskStatuses,
    setDefaultTaskStatus,
    tasks,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TaskStatusConfig | null>(null);

  const [formData, setFormData] = useState<Partial<TaskStatusConfig>>({
    name: '',
    category: 'in_progress',
    color: 'blue',
    description: '',
    isClosed: false,
    active: true,
  });

  const availableColors = [
    { id: 'slate', name: 'אפור כהה', bg: 'bg-slate-500', text: 'text-white' },
    { id: 'blue', name: 'כחול', bg: 'bg-blue-600', text: 'text-white' },
    { id: 'indigo', name: 'אינדיגו', bg: 'bg-indigo-600', text: 'text-white' },
    { id: 'amber', name: 'ענבר / כתום', bg: 'bg-amber-500', text: 'text-white' },
    { id: 'rose', name: 'אדום / ורוד', bg: 'bg-rose-600', text: 'text-white' },
    { id: 'emerald', name: 'ירוק אזמרגד', bg: 'bg-emerald-600', text: 'text-white' },
    { id: 'purple', name: 'סגול', bg: 'bg-purple-600', text: 'text-white' },
    { id: 'cyan', name: 'טורקיז', bg: 'bg-cyan-600', text: 'text-white' },
  ];

  const handleOpenAdd = () => {
    setEditingStatus(null);
    setFormData({
      name: '',
      category: 'in_progress',
      color: 'blue',
      description: '',
      isClosed: false,
      active: true,
      order: taskStatuses.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: TaskStatusConfig) => {
    setEditingStatus(s);
    setFormData({
      name: s.name,
      category: s.category,
      color: s.color,
      description: s.description || '',
      isClosed: s.isClosed,
      active: s.active !== false,
      order: s.order,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const statusId = editingStatus ? editingStatus.id : 'status-' + Date.now();

    saveTaskStatus({
      id: statusId,
      name: formData.name.trim(),
      category: formData.category || 'in_progress',
      color: formData.color || 'blue',
      description: formData.description?.trim(),
      isClosed: !!formData.isClosed,
      active: formData.active !== false,
      order: formData.order || taskStatuses.length + 1,
      isDefault: editingStatus ? editingStatus.isDefault : false,
    });

    setIsModalOpen(false);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= taskStatuses.length) return;

    const updated = [...taskStatuses];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    reorderTaskStatuses(updated.map((s) => s.id));
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">ניהול והתאמת סטטוסים למשימות</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 font-mono">
              {taskStatuses.length} סטטוסים מוגדרים
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            הגדרת שמות, קטגוריות מחזור חיים, צבעים, סדר הופעה וסימון האם הסטטוס נחשב כמשימה סגורה (Closed)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>הוסף סטטוס חדש</span>
        </button>
      </div>

      {/* Statuses List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className="flex items-center gap-4">
            <span className="w-12 text-center">סדר</span>
            <span>שם הסטטוס והגדרה</span>
          </div>
          <div className="flex items-center gap-8">
            <span>קטגוריית מערכת</span>
            <span>סוג סגירה</span>
            <span className="w-24 text-left">פעולות</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {taskStatuses.map((st, index) => {
            const taskUsageCount = tasks.filter((t) => t.status === st.name).length;

            return (
              <div
                key={st.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-4">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-0.5 w-12 items-center">
                    <button
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={index === taskStatuses.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Status Tag & Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        st.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        st.color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
                        st.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                        st.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                        st.color === 'rose' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {st.name}
                      </span>

                      {st.isDefault && (
                        <span className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          ברירת מחדל
                        </span>
                      )}

                      <span className="text-slate-400 text-2xs font-mono">
                        ({taskUsageCount} משימות בסטטוס זה)
                      </span>
                    </div>

                    {st.description && (
                      <p className="text-slate-500 text-2xs">{st.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-slate-600 font-mono text-2xs bg-slate-100 px-2 py-1 rounded">
                    {st.category}
                  </div>

                  <div>
                    {st.isClosed ? (
                      <span className="inline-flex items-center gap-1 text-2xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-slate-500" />
                        משימה סגורה
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-2xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        פעיל ב-Capacity
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 w-24 justify-end">
                    {!st.isDefault && (
                      <button
                        onClick={() => setDefaultTaskStatus(st.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                        title="קבע כסטטוס ברירת מחדל"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEdit(st)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="ערוך סטטוס"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => deleteTaskStatus(st.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="מחק סטטוס"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-right">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <h2 className="text-base font-bold text-slate-900">
                {editingStatus ? 'עריכת סטטוס משימה' : 'הוספת סטטוס משימה חדש'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">שם הסטטוס (בעברית) *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="למשל: בבדיקת QA, ממתין לפריסה..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">קטגוריה מחזור חיים</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as StatusCategory })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="not_started">לא התחיל (not_started)</option>
                  <option value="in_progress">בביצוע (in_progress)</option>
                  <option value="waiting">ממתין (waiting)</option>
                  <option value="delayed">מעוכב (delayed)</option>
                  <option value="completed">הושלם (completed)</option>
                  <option value="cancelled">בוטל (cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">צבע זיהוי</label>
                <div className="grid grid-cols-4 gap-2">
                  {availableColors.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setFormData({ ...formData, color: c.id })}
                      className={`p-2 rounded-xl text-center border text-2xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        formData.color === c.id
                          ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.bg}`} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">תיאור קצר</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="משמעות הסטטוס לתהליך העבודה..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isClosed}
                    onChange={(e) => setFormData({ ...formData, isClosed: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-800">סמן כמשימה סגורה (אינה צורכת עוד Capacity)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                >
                  שמור סטטוס
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
