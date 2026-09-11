import fs from 'node:fs';

const file = 'src/components/users/UsersManagementView.tsx';
let source = fs.readFileSync(file, 'utf8');

const oldBlock = `    if (editingUser) {\n      updateUser({\n        ...editingUser,\n        employeeNumber: formData.employeeNumber.trim(),\n        firstName: formData.firstName.trim(),\n        lastName: formData.lastName.trim(),\n        fullName,\n        email: formData.email.trim(),\n        phone: formData.phone.trim(),\n        title: formData.title.trim(),\n        role: formData.role,\n        teamId: formData.teamId,\n        active: formData.active,\n      });\n      setEditingUser(null);\n    } else {`;

const newBlock = `    if (editingUser) {\n      const result = updateUser({\n        ...editingUser,\n        employeeNumber: formData.employeeNumber.trim(),\n        firstName: formData.firstName.trim(),\n        lastName: formData.lastName.trim(),\n        fullName,\n        email: formData.email.trim(),\n        phone: formData.phone.trim(),\n        title: formData.title.trim(),\n        role: formData.role,\n        teamId: formData.teamId,\n        active: formData.active,\n      });\n      if (!result.success) {\n        setFormError(result.error || 'שגיאה בעדכון המשתמש');\n        return;\n      }\n      setEditingUser(null);\n    } else {`;

if (!source.includes(newBlock)) {
  if (!source.includes(oldBlock)) throw new Error('Edit user save block not found');
  source = source.replace(oldBlock, newBlock);
}

fs.writeFileSync(file, source);
console.log('Users edit form now keeps validation errors open.');
