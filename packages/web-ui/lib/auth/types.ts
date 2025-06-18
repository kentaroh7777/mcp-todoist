export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface Account {
  id: string;
  user: User;
  todoistToken: string;
  displayName: string;
  createdAt: Date;
  isActive: boolean;
  name: string;
  email: string;
}

export interface AccountData {
  preferences: Record<string, any>;
  lastSync: Date | null;
  cacheData: Record<string, any>;
  cache: Record<string, any>;
}