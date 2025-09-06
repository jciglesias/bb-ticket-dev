import { User, Repository, Ticket, DevelopmentTask } from '../entities/index.js';

// User Repository Interface
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

// Repository Repository Interface (for GitHub repositories)
export interface RepositoryRepository {
  findById(id: string): Promise<Repository | null>;
  findByUserId(userId: string): Promise<Repository[]>;
  findByUserIdAndName(userId: string, owner: string, name: string): Promise<Repository | null>;
  create(repository: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>): Promise<Repository>;
  update(id: string, updates: Partial<Repository>): Promise<Repository>;
  delete(id: string): Promise<void>;
  findActiveByUserId(userId: string): Promise<Repository[]>;
}

// Ticket Repository Interface
export interface TicketRepository {
  findById(id: string): Promise<Ticket | null>;
  findByUserId(userId: string): Promise<Ticket[]>;
  findByRepositoryId(repositoryId: string): Promise<Ticket[]>;
  findByUserIdAndStatus(userId: string, status: string): Promise<Ticket[]>;
  create(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ticket>;
  update(id: string, updates: Partial<Ticket>): Promise<Ticket>;
  delete(id: string): Promise<void>;
  findPendingTickets(): Promise<Ticket[]>;
}

// Development Task Repository Interface
export interface DevelopmentTaskRepository {
  findById(id: string): Promise<DevelopmentTask | null>;
  findByTicketId(ticketId: string): Promise<DevelopmentTask[]>;
  findByUserId(userId: string): Promise<DevelopmentTask[]>;
  findByStatus(status: string): Promise<DevelopmentTask[]>;
  create(task: Omit<DevelopmentTask, 'id'>): Promise<DevelopmentTask>;
  update(id: string, updates: Partial<DevelopmentTask>): Promise<DevelopmentTask>;
  delete(id: string): Promise<void>;
  findActiveTasks(): Promise<DevelopmentTask[]>;
}
