import { StorageService } from '../src/services/storage';
class MemoryStorage {
  private data = new Map<string,string>();
  getItem(key:string){ return this.data.has(key) ? this.data.get(key)! : null; }
  setItem(key:string, value:string){ this.data.set(key, String(value)); }
  removeItem(key:string){ this.data.delete(key); }
  clear(){ this.data.clear(); }
  key(index:number){ return [...this.data.keys()][index] ?? null; }
  get length(){ return this.data.size; }
}

(globalThis as any).localStorage = new MemoryStorage();
(globalThis as any).window = {
  addEventListener(){},
  removeEventListener(){},
};


let passed = 0;
const assert = {
  equal(actual:any, expected:any){ if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`); },
};
function test(name:string, fn:()=>void){ fn(); passed++; console.log(`PASS ${passed}: ${name}`); }

const sampleHistory = [{
  id:'tsh-1', taskId:'tsk-1', fromStatusId:'new', toStatusId:'doing',
  changedAt:'2026-09-09T10:00:00.000Z', changedBy:'qa-user', comment:'בדיקת שחזור'
}];

test('full backup includes task status history', () => {
  StorageService.saveTaskStatusHistory(sampleHistory);
  const backup = JSON.parse(StorageService.exportFullBackup());
  assert.equal(backup.taskStatusHistory.length, 1);
  assert.equal(backup.taskStatusHistory[0].id, 'tsh-1');
});

test('full backup restore restores task status history', () => {
  const backup = StorageService.exportFullBackup();
  StorageService.saveTaskStatusHistory([]);
  assert.equal(StorageService.getTaskStatusHistory().length, 0);
  assert.equal(StorageService.importFullBackup(backup), true);
  assert.equal(StorageService.getTaskStatusHistory()[0].comment, 'בדיקת שחזור');
});

test('malformed collection fails before mutating existing data', () => {
  const before = [{ id:'emp-safe', name:'עובד קיים', role:'מיישם', jobPercentage:100, dailyWorkHours:9, weeklyWorkDays:5, isActive:true, startDate:'2026-01-01' }];
  StorageService.saveEmployees(before as any);
  const malformed = JSON.stringify({ employees:[{ id:'emp-new' }], clients:{ not:'an array' } });
  assert.equal(StorageService.importFullBackup(malformed), false);
  assert.equal(StorageService.getEmployees()[0].id, 'emp-safe');
});

test('older backup without new planning collections remains backward compatible', () => {
  const oldStyle = JSON.stringify({ employees:[], clients:[], tasks:[], settings:{ defaultDailyHours:9 } });
  assert.equal(StorageService.importFullBackup(oldStyle), true);
  assert.equal(StorageService.getEmployees().length, 0);
  assert.equal(StorageService.getClients().length, 0);
  assert.equal(StorageService.getTasks().length, 0);
});

console.log(`Backup regression: ${passed}/${passed} PASS`);

export {};
