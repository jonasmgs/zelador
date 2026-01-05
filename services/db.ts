
import { User, UserRole, Task, Condo, Message, Log, TaskStatus, TaskFrequency, Vendor, CondoDocument, Budget, Incident } from '../types';

const DB_KEYS = {
  USERS: 'cc_db_users',
  TASKS: 'cc_db_tasks',
  CONDOS: 'cc_db_condos',
  MESSAGES: 'cc_db_messages',
  LOGS: 'cc_db_logs',
  VENDORS: 'cc_db_vendors',
  DOCUMENTS: 'cc_db_documents',
  BUDGETS: 'cc_db_budgets',
  CATEGORIES: 'cc_db_categories',
  INCIDENTS: 'cc_db_incidents',
  USER_FUNCTIONS: 'cc_db_user_functions'
};

const initializeDB = () => {
  if (!localStorage.getItem(DB_KEYS.USERS)) {
    const defaultUsers: User[] = [
      { id: 'u1', name: 'Ricardo Alencar', role: UserRole.SINDICO, jobTitle: 'Síndico Geral', email: '', password: '123', active: true },
      { id: 'u2', name: 'Mariana Costa', role: UserRole.GESTOR, jobTitle: 'Gestora Predial', email: '', password: '123', active: true, condoId: 'c1' },
      { id: 'u3', name: 'João Silva', role: UserRole.ZELADOR, jobTitle: 'Zelador', email: '', password: '123', active: true, condoId: 'c1' },
      { id: 'u4', name: 'Marcos Souza', role: UserRole.LIMPEZA, jobTitle: 'Aux. Limpeza', email: '', password: '123', active: true, condoId: 'c1' },
      { id: 'u5', name: 'Carlos Porteiro', role: UserRole.PORTEIRO, jobTitle: 'Porteiro Noturno', email: '', password: '123', active: true, condoId: 'c1' }
    ];
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(defaultUsers));
  }
  if (!localStorage.getItem(DB_KEYS.CONDOS)) {
    localStorage.setItem(DB_KEYS.CONDOS, JSON.stringify([
      { id: 'c1', name: 'Residencial Aurora', address: 'Av. Brasil, 1500 - Centro', createdAt: new Date().toISOString() }
    ]));
  }
  if (!localStorage.getItem(DB_KEYS.CATEGORIES)) {
    localStorage.setItem(DB_KEYS.CATEGORIES, JSON.stringify(["Manutenção", "Limpeza", "Piscina", "Jardinagem", "Segurança", "Outros"]));
  }
  if (!localStorage.getItem(DB_KEYS.USER_FUNCTIONS)) {
    localStorage.setItem(DB_KEYS.USER_FUNCTIONS, JSON.stringify([
      { name: "Zelador", baseRole: UserRole.ZELADOR },
      { name: "Limpeza", baseRole: UserRole.LIMPEZA },
      { name: "Porteiro", baseRole: UserRole.PORTEIRO },
      { name: "Segurança", baseRole: UserRole.ZELADOR },
      { name: "Jardineiro", baseRole: UserRole.ZELADOR },
      { name: "Gestor", baseRole: UserRole.GESTOR }
    ]));
  }
  if (!localStorage.getItem(DB_KEYS.TASKS)) localStorage.setItem(DB_KEYS.TASKS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.MESSAGES)) localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.LOGS)) localStorage.setItem(DB_KEYS.LOGS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.VENDORS)) localStorage.setItem(DB_KEYS.VENDORS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.DOCUMENTS)) localStorage.setItem(DB_KEYS.DOCUMENTS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.BUDGETS)) localStorage.setItem(DB_KEYS.BUDGETS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.INCIDENTS)) localStorage.setItem(DB_KEYS.INCIDENTS, JSON.stringify([]));
};

initializeDB();

export const db = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]'),
  getTasks: (): Task[] => JSON.parse(localStorage.getItem(DB_KEYS.TASKS) || '[]'),
  getCondos: (): Condo[] => JSON.parse(localStorage.getItem(DB_KEYS.CONDOS) || '[]'),
  getMessages: (): Message[] => JSON.parse(localStorage.getItem(DB_KEYS.MESSAGES) || '[]'),
  getLogs: (): Log[] => JSON.parse(localStorage.getItem(DB_KEYS.LOGS) || '[]'),
  getVendors: (): Vendor[] => JSON.parse(localStorage.getItem(DB_KEYS.VENDORS) || '[]'),
  getCategories: (): string[] => JSON.parse(localStorage.getItem(DB_KEYS.CATEGORIES) || '[]'),
  getIncidents: (): Incident[] => JSON.parse(localStorage.getItem(DB_KEYS.INCIDENTS) || '[]'),
  getUserFunctions: (): { name: string, baseRole: UserRole }[] => JSON.parse(localStorage.getItem(DB_KEYS.USER_FUNCTIONS) || '[]'),
  
  getVendorsByCondo: (condoId: string): Vendor[] => db.getVendors().filter(v => v.condoId === condoId),
  getUsersByCondo: (condoId: string): User[] => db.getUsers().filter(u => u.condoId === condoId),
  getTasksByCondo: (condoId: string): Task[] => db.getTasks().filter(t => t.condoId === condoId),
  getIncidentsByCondo: (condoId: string): Incident[] => db.getIncidents().filter(i => i.condoId === condoId),
  getBudgets: (): Budget[] => JSON.parse(localStorage.getItem(DB_KEYS.BUDGETS) || '[]'),
  getBudgetsByCondo: (condoId: string): Budget[] => db.getBudgets().filter(b => b.condoId === condoId),
  getDocuments: (): CondoDocument[] => JSON.parse(localStorage.getItem(DB_KEYS.DOCUMENTS) || '[]'),

  saveUser: (user: User) => {
    const users = db.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) users[index] = user; else users.push(user);
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  },
  saveUserFunction: (func: { name: string, baseRole: UserRole }) => {
    const funcs = db.getUserFunctions();
    if (!funcs.find(f => f.name === func.name)) {
      funcs.push(func);
      localStorage.setItem(DB_KEYS.USER_FUNCTIONS, JSON.stringify(funcs));
    }
  },
  deleteUserFunction: (name: string) => {
    const funcs = db.getUserFunctions().filter(f => f.name !== name);
    localStorage.setItem(DB_KEYS.USER_FUNCTIONS, JSON.stringify(funcs));
  },
  saveTask: (task: Task) => {
    const tasks = db.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index >= 0) tasks[index] = task; else tasks.push(task);
    localStorage.setItem(DB_KEYS.TASKS, JSON.stringify(tasks));
  },
  saveIncident: (incident: Incident) => {
    const incidents = db.getIncidents();
    const index = incidents.findIndex(i => i.id === incident.id);
    if (index >= 0) incidents[index] = incident; else incidents.push(incident);
    localStorage.setItem(DB_KEYS.INCIDENTS, JSON.stringify(incidents));
  },
  saveCondo: (condo: Condo) => {
    const condos = db.getCondos();
    const index = condos.findIndex(c => c.id === condo.id);
    if (index >= 0) condos[index] = condo; else condos.push(condo);
    localStorage.setItem(DB_KEYS.CONDOS, JSON.stringify(condos));
  },
  saveLog: (log: Log) => {
    const logs = db.getLogs();
    logs.unshift(log);
    localStorage.setItem(DB_KEYS.LOGS, JSON.stringify(logs.slice(0, 1000)));
  },
  saveMessage: (msg: Message) => {
    const msgs = db.getMessages();
    msgs.push(msg);
    localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify(msgs));
  },
  saveVendor: (vendor: Vendor) => {
    const vendors = db.getVendors();
    const index = vendors.findIndex(v => v.id === vendor.id);
    if (index >= 0) vendors[index] = vendor; else vendors.push(vendor);
    localStorage.setItem(DB_KEYS.VENDORS, JSON.stringify(vendors));
  },
  saveBudget: (budget: Budget) => {
    const budgets = db.getBudgets();
    const index = budgets.findIndex(b => b.id === budget.id);
    if (index >= 0) budgets[index] = budget; else budgets.push(budget);
    localStorage.setItem(DB_KEYS.BUDGETS, JSON.stringify(budgets));
  },
  saveDocument: (doc: CondoDocument) => {
    const docs = db.getDocuments();
    docs.push(doc);
    localStorage.setItem(DB_KEYS.DOCUMENTS, JSON.stringify(docs));
  },
  saveCategory: (name: string) => {
    const cats = db.getCategories();
    if (name && !cats.includes(name)) {
      cats.push(name);
      localStorage.setItem(DB_KEYS.CATEGORIES, JSON.stringify(cats));
    }
  },
  updateCategory: (oldName: string, newName: string) => {
    if (!newName || oldName === newName) return;
    
    // 1. Update Categories list
    let cats = db.getCategories();
    const idx = cats.indexOf(oldName);
    if (idx !== -1) {
      cats[idx] = newName;
      localStorage.setItem(DB_KEYS.CATEGORIES, JSON.stringify(cats));
    }

    // 2. Update Vendors using this category
    const vendors = db.getVendors();
    vendors.forEach(v => {
      if (v.category === oldName) v.category = newName;
    });
    localStorage.setItem(DB_KEYS.VENDORS, JSON.stringify(vendors));

    // 3. Update Tasks using this category
    const tasks = db.getTasks();
    tasks.forEach(t => {
      if (t.category === oldName) t.category = newName;
    });
    localStorage.setItem(DB_KEYS.TASKS, JSON.stringify(tasks));
  },
  deleteCategory: (name: string) => {
    const cats = db.getCategories().filter(c => c !== name);
    localStorage.setItem(DB_KEYS.CATEGORIES, JSON.stringify(cats));
  },

  deleteTask: (id: string) => {
    const tasks = db.getTasks().filter(t => String(t.id) !== String(id));
    localStorage.setItem(DB_KEYS.TASKS, JSON.stringify(tasks));
  },
  deleteIncident: (id: string) => {
    const incidents = db.getIncidents().filter(i => String(i.id) !== String(id));
    localStorage.setItem(DB_KEYS.INCIDENTS, JSON.stringify(incidents));
  },
  deleteCondo: (id: string) => {
    const condos = db.getCondos().filter(c => String(c.id) !== String(id));
    localStorage.setItem(DB_KEYS.CONDOS, JSON.stringify(condos));
  },
  deleteUser: (id: string) => {
    const users = db.getUsers().filter(u => String(u.id) !== String(id));
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  },
  deleteMessage: (id: string) => {
    const msgs = db.getMessages().filter(m => String(m.id) !== String(id));
    localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify(msgs));
  },
  deleteLog: (id: string) => {
    const logs = db.getLogs().filter(l => String(l.id) !== String(id));
    localStorage.setItem(DB_KEYS.LOGS, JSON.stringify(logs));
  },
  deleteVendor: (id: string) => {
    const vendors = db.getVendors().filter(v => String(v.id) !== String(id));
    localStorage.setItem(DB_KEYS.VENDORS, JSON.stringify(vendors));
  },
  deleteBudget: (id: string) => {
    const budgets = db.getBudgets().filter(b => String(b.id) !== String(id));
    localStorage.setItem(DB_KEYS.BUDGETS, JSON.stringify(budgets));
  },
  deleteDocument: (id: string) => {
    const docs = db.getDocuments().filter(d => String(d.id) !== String(id));
    localStorage.setItem(DB_KEYS.DOCUMENTS, JSON.stringify(docs));
  },

  resetDB: () => {
    localStorage.clear();
    initializeDB();
    window.location.reload();
  }
};
