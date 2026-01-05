
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TaskFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ONCE = 'ONCE'
}

export enum UserRole {
  SINDICO = 'SINDICO',
  GESTOR = 'GESTOR',
  ZELADOR = 'ZELADOR',
  LIMPEZA = 'LIMPEZA',
  PORTEIRO = 'PORTEIRO'
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  jobTitle?: string; // Título da função operacional personalizada
  email: string;
  password?: string;
  avatar?: string;
  active: boolean;
  condoId?: string;
}

export interface Condo {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  frequency: TaskFrequency;
  createdAt: string;
  scheduledFor: string;
  completedAt?: string;
  assignedTo: string; // User ID
  assignedUserName: string;
  photos?: string[];
  category: string;
  condoId?: string;
  completionObservation?: string;
}

export interface Incident {
  id: string;
  condoId: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  timestamp: string;
  status: IncidentStatus;
  photos?: string[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  uploadDate: string;
}

export interface Vendor {
  id: string;
  name: string;
  taxId: string; // CNPJ ou CPF
  phone: string;
  category: string;
  condoId: string;
  documents?: Attachment[];
}

export interface CondoDocument {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  uploadDate: string;
  condoId: string;
}

export interface BudgetItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Budget {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  vendorId?: string;
  value?: number;
  items?: BudgetItem[];
  condoId: string;
  createdAt: string;
  documents?: Attachment[];
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId?: string; 
  recipientName?: string; 
  text: string;
  timestamp: string;
  condoId: string;
  broadcast?: boolean;
}

export interface Log {
  id: string;
  userId: string;
  userName: string;
  action: string; 
  module: string; 
  targetName: string;
  timestamp: string;
  condoId: string;
}

export interface DashboardStats {
  pendingTasks: number;
  completedToday: number;
  activeIssues: number;
  scheduledMaintenance: number;
  totalCondos?: number;
}
