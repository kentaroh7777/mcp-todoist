// User & Account Types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  provider: "todoist";
  apiToken: string;
  settings: AccountSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountSettings {
  timezone?: string;
  language?: string;
  dateFormat?: string;
  weekStart?: number; // 0 = Sunday, 1 = Monday
  syncEnabled?: boolean;
  syncInterval?: number; // minutes
}

// Authentication Types
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  accountIds: string[];
  iat: number;
  exp: number;
}

// Session Types
export interface UserSession {
  user: User;
  accounts: Account[];
  activeAccountId?: string;
  token: AuthToken;
}

// API Request Context
export interface RequestContext {
  userId: string;
  accountId?: string;
  account?: Account;
  permissions: string[];
}

// Login/Register Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: AuthToken;
  accounts: Account[];
}

// Account Management
export interface CreateAccountRequest {
  name: string;
  provider: "todoist";
  apiToken: string;
  settings?: Partial<AccountSettings>;
}

export interface UpdateAccountRequest {
  name?: string;
  apiToken?: string;
  settings?: Partial<AccountSettings>;
  isActive?: boolean;
}

// Permission Types
export enum Permission {
  READ_TASKS = "tasks:read",
  WRITE_TASKS = "tasks:write",
  READ_PROJECTS = "projects:read", 
  WRITE_PROJECTS = "projects:write",
  MANAGE_ACCOUNTS = "accounts:manage",
  ADMIN = "admin"
}

export interface PermissionCheck {
  userId: string;
  accountId?: string;
  permission: Permission;
} 