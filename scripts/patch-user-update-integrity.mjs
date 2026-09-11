import fs from 'node:fs';

const file = 'src/context/AppContext.tsx';
let source = fs.readFileSync(file, 'utf8');

const oldSig = `  updateUser: (user: User) => void;`;
const newSig = `  updateUser: (user: User) => { success: boolean; error?: string };`;
if (!source.includes(newSig)) {
  if (!source.includes(oldSig)) throw new Error('updateUser interface signature not found');
  source = source.replace(oldSig, newSig);
}

const start = source.indexOf(`  const updateUser = (user: User) => {`);
const end = source.indexOf(`\n  const toggleUserActive = (uid: string) => {`, start);
if (start < 0 || end < 0) throw new Error('updateUser implementation boundaries not found');

const replacement = `  const updateUser = (user: User) => {\n    const previous = users.find((u) => u.uid === user.uid);\n    if (!previous) {\n      const error = 'המשתמש לא נמצא';\n      addToast(error, 'error');\n      return { success: false, error };\n    }\n\n    const cleanEmpNo = user.employeeNumber.trim();\n    const cleanEmail = user.email.trim().toLowerCase();\n    const duplicateEmpNo = users.some(\n      (u) => u.uid !== user.uid && u.employeeNumber.trim() === cleanEmpNo\n    );\n    if (duplicateEmpNo) {\n      const error = \`מספר עובד \${cleanEmpNo} כבר קיים במערכת\`;\n      addToast(error, 'error');\n      return { success: false, error };\n    }\n\n    const duplicateEmail = users.some(\n      (u) => u.uid !== user.uid && u.email.trim().toLowerCase() === cleanEmail\n    );\n    if (duplicateEmail) {\n      const error = \`כתובת מייל \${user.email} כבר קיימת במערכת\`;\n      addToast(error, 'error');\n      return { success: false, error };\n    }\n\n    const updatedAt = new Date().toISOString();\n    const normalizedUser: User = {\n      ...user,\n      employeeNumber: cleanEmpNo,\n      email: user.email.trim(),\n      updatedAt,\n    };\n\n    setUsers((prev) =>\n      prev.map((u) => (u.uid === normalizedUser.uid ? normalizedUser : u))\n    );\n\n    if (currentUser?.uid === normalizedUser.uid) {\n      setCurrentUser(normalizedUser);\n    }\n\n    // The linked Employee must be located using the PREVIOUS employee number.\n    // Otherwise changing employeeNumber disconnects the User from its Employee record.\n    setEmployees((prev) =>\n      prev.map((e) =>\n        e.employeeNumber === previous.employeeNumber\n          ? {\n              ...e,\n              employeeNumber: normalizedUser.employeeNumber,\n              name: normalizedUser.fullName,\n              email: normalizedUser.email,\n              phone: normalizedUser.phone,\n              role: normalizedUser.title || e.role,\n              teamId: normalizedUser.teamId,\n              isActive: normalizedUser.active,\n            }\n          : e\n      )\n    );\n\n    StorageService.logAudit({\n      user: currentUser?.fullName || 'מנהל מערכת',\n      action: 'עדכון משתמש',\n      entityType: 'User',\n      entityId: normalizedUser.uid,\n      entityLabel: normalizedUser.fullName,\n      fieldName: 'profile',\n      oldValue: previous.employeeNumber,\n      newValue: normalizedUser.employeeNumber,\n      details: previous.employeeNumber !== normalizedUser.employeeNumber\n        ? \`מספר עובד שונה מ-\${previous.employeeNumber} ל-\${normalizedUser.employeeNumber}\`\n        : 'פרטי משתמש עודכנו',\n      source: 'ui',\n    });\n    addToast(\`פרטי המשתמש \${normalizedUser.fullName} עודכנו\`);\n    return { success: true };\n  };`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source);
console.log('updateUser integrity and linked Employee synchronization patched.');
