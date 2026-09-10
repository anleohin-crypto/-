import { User, AppRole } from '../types';
import { DataLayer } from './db';

export const AuthService = {
  /**
   * Determine identifier type and find corresponding user
   */
  login(identifier: string, _password?: string): { success: boolean; user?: User; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      return { success: false, error: 'נא להזין מייל, טלפון או מספר עובד' };
    }

    const users = DataLayer.getUsers();

    // 1. Search by exact employee number
    let matchedUser = users.find((u) => u.employeeNumber.toLowerCase() === cleanId);

    // 2. Search by email if not found
    if (!matchedUser && cleanId.includes('@')) {
      matchedUser = users.find((u) => u.email.toLowerCase() === cleanId);
    }

    // 3. Search by phone if not found
    if (!matchedUser) {
      const numericOnly = cleanId.replace(/\D/g, '');
      if (numericOnly.length >= 7) {
        matchedUser = users.find((u) => u.phone.replace(/\D/g, '').includes(numericOnly));
      }
    }

    // 4. Fallback search by email or name
    if (!matchedUser) {
      matchedUser = users.find(
        (u) =>
          u.email.toLowerCase() === cleanId ||
          u.fullName.toLowerCase().includes(cleanId) ||
          u.firstName.toLowerCase() === cleanId
      );
    }

    if (!matchedUser) {
      return {
        success: false,
        error: 'לא נמצא משתמש במערכת התואם את המזהה שהוזן. נא לוודא את הפרטים.',
      };
    }

    // Check if account is active
    if (!matchedUser.active) {
      return {
        success: false,
        error: 'חשבון משתמש זה מושבת על ידי מנהל המערכת. פנה למנהל לצורך הפעלה מחדש.',
      };
    }

    // Save session
    DataLayer.setCurrentUserSession(matchedUser);

    // Audit log
    DataLayer.logAudit({
      user: matchedUser.fullName,
      action: 'LOGIN',
      entityType: 'User',
      entityId: matchedUser.uid,
      fieldName: 'session',
      oldValue: null,
      newValue: 'ACTIVE',
    });

    return { success: true, user: matchedUser };
  },

  getCurrentUser(): User | null {
    return DataLayer.getCurrentUserSession();
  },

  logout(): void {
    const user = this.getCurrentUser();
    if (user) {
      DataLayer.logAudit({
        user: user.fullName,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: user.uid,
        fieldName: 'session',
        oldValue: 'ACTIVE',
        newValue: 'TERMINATED',
      });
    }
    DataLayer.setCurrentUserSession(null);
  },

  switchUser(uid: string): User | null {
    const user = DataLayer.getUserById(uid);
    if (user && user.active) {
      DataLayer.setCurrentUserSession(user);
      return user;
    }
    return null;
  },

  hasRole(user: User | null, allowedRoles: AppRole[]): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  },
};
