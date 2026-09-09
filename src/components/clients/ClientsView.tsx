import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  Layers,
  Phone,
  Mail,
  User,
  Clock,
  X,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Client, Project } from '../../types';

export const ClientsView: React.FC = () => {
  const {
    clients,
    projects,
    tasks,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    deleteProject,
    setFilterClientId,
    setCurrentTab,
  } = useApp();

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Client form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyRetainerHours, setMonthlyRetainerHours] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Project form fields
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projClientId, setProjClientId] = useState('');
  const [projName, setProjName] = useState('');
  const [projDescription, setProjDescription] = useState('');

  const openCreateClient = () => {
    setEditingClient(null);
    setName('');
    setCode('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setMonthlyRetainerHours(0);
    setIsActive(true);
    setIsClientModalOpen(true);
  };

  const openEditClient = (c: Client) => {
    setEditingClient(c);
    setName(c.name);
    setCode(c.code);
    setContactPerson(c.contactPerson || '');
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setMonthlyRetainerHours(c.monthlyRetainerHours || 0);
    setIsActive(c.isActive);
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    if (editingClient) {
      updateClient({
        ...editingClient,
        name,
        code,
        contactPerson,
        email,
        phone,
        monthlyRetainerHours,
        isActive,
      });
    } else {
      addClient({
        name,
        code,
        contactPerson,
        email,
        phone,
        monthlyRetainerHours,
        isActive,
      });
    }

    setIsClientModalOpen(false);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projClientId || !projName.trim()) return;
    addProject({
      clientId: projClientId,
      name: projName,
      description: projDescription,
      isActive: true,
    });
    setIsProjectModalOpen(false);
    setProjName('');
    setProjDescription('');
  };

  return (
    <div id="clients-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">לקוחות ופרויקטים</h2>
          <p className="text-xs text-slate-500">
            ניהול תיקי לקוחות, הסכמי ריטיינר ושיוך פרויקטים ומשימות
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setProjClientId(clients[0]?.id || '');
              setIsProjectModalOpen(true);
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4" />
            <span>פרויקט חדש</span>
          </button>

          <button
            id="btn-add-client"
            onClick={openCreateClient}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>לקוח חדש</span>
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((cli) => {
          const clientProjects = projects.filter((p) => p.clientId === cli.id);
          const clientTasks = tasks.filter((t) => t.clientId === cli.id);
          const remainingHours = clientTasks.reduce((a, b) => a + (b.remainingHours || 0), 0);

          return (
            <div
              key={cli.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200">
                      {cli.code}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">{cli.name}</h3>
                      <span className="text-[11px] text-slate-400">קוד: {cli.code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditClient(cli)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="ערוך לקוח"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`האם למחוק את הלקוח ${cli.name}?`)) {
                          deleteClient(cli.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="מחק לקוח"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  {cli.contactPerson && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>איש קשר: {cli.contactPerson}</span>
                    </div>
                  )}
                  {cli.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cli.phone}</span>
                    </div>
                  )}
                  {cli.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cli.email}</span>
                    </div>
                  )}
                </div>

                {/* Retainer & Hours summary */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs my-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">ריטיינר חודשי:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {cli.monthlyRetainerHours ? `${cli.monthlyRetainerHours} שעות` : 'לפי דרישה'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">שעות בצבר:</span>
                    <span className="font-bold text-blue-700 font-mono">{remainingHours} שעות</span>
                  </div>
                </div>

                {/* Associated Projects */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>פרויקטים פעילים ({clientProjects.length}):</span>
                  </div>
                  <div className="space-y-1">
                    {clientProjects.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">אין פרויקטים ספציפיים</span>
                    ) : (
                      clientProjects.map((p) => (
                        <div
                          key={p.id}
                          className="text-[11px] bg-slate-50 px-2 py-1 rounded flex items-center justify-between text-slate-700"
                        >
                          <span>{p.name}</span>
                          <button
                            onClick={() => deleteProject(p.id)}
                            className="text-slate-300 hover:text-rose-500"
                            title="מחק פרויקט"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{clientTasks.length} משימות במערכת</span>
                <button
                  onClick={() => {
                    setFilterClientId(cli.id);
                    setCurrentTab('tasks');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  צפה במשימות הלקוח ←
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Client Modal */}
      {isClientModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsClientModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-right border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900">
                {editingClient ? 'עריכת לקוח' : 'הוספת לקוח חדש'}
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">שם הלקוח</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="אלבר ציי רכב"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">קוד מקוצר</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ALBAR"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">איש קשר</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="ישראל ישראלי - מנמ״ר"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">טלפון</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="050-1234567"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">אימייל</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@client.co.il"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">שעות ריטיינר חודשיות</label>
                <input
                  type="number"
                  min="0"
                  value={monthlyRetainerHours}
                  onChange={(e) => setMonthlyRetainerHours(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  שמור לקוח
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isProjectModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsProjectModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-right border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900">הוספת פרויקט חדש</h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">לקוח</label>
                <select
                  value={projClientId}
                  onChange={(e) => setProjClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">שם הפרויקט</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="לדוגמה: פיתוח מודול אפליקציה חדשה"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">תיאור</label>
                <textarea
                  rows={2}
                  value={projDescription}
                  onChange={(e) => setProjDescription(e.target.value)}
                  placeholder="פרטי הפרויקט..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  שמור פרויקט
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
