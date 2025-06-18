import { Account, AccountData, User } from './types';

export class AccountManager {
  private static readonly ACCOUNTS_KEY = 'mcp_todoist_accounts';
  private static readonly CURRENT_ACCOUNT_KEY = 'mcp_todoist_current_account';
  private static readonly ACCOUNT_DATA_PREFIX = 'mcp_todoist_account_data_';

  async addAccount(user: User, todoistToken: string): Promise<Account> {
    const accounts = this.listAccounts();
    
    // Check for duplicate account
    const existingAccount = accounts.find(account => account.user.uid === user.uid);
    if (existingAccount) {
      throw new Error('Account already exists');
    }

    const account: Account = {
      id: `account_${user.uid}_${Date.now()}`,
      user,
      todoistToken,
      displayName: user.displayName || user.email || 'Unknown User',
      name: user.displayName || user.email || 'Unknown User',
      email: user.email || '',
      createdAt: new Date(),
      isActive: accounts.length === 0, // First account is active by default
    };

    accounts.push(account);
    localStorage.setItem(AccountManager.ACCOUNTS_KEY, JSON.stringify(accounts));

    // If this is the first account, set it as current
    if (accounts.length === 1) {
      localStorage.setItem(AccountManager.CURRENT_ACCOUNT_KEY, account.id);
    }

    return account;
  }

  async removeAccount(accountId: string): Promise<void> {
    const accounts = this.listAccounts();
    const filteredAccounts = accounts.filter(account => account.id !== accountId);
    
    localStorage.setItem(AccountManager.ACCOUNTS_KEY, JSON.stringify(filteredAccounts));
    
    // Remove account data
    localStorage.removeItem(AccountManager.ACCOUNT_DATA_PREFIX + accountId);
    
    // If removed account was current, clear current account
    const currentAccountId = localStorage.getItem(AccountManager.CURRENT_ACCOUNT_KEY);
    if (currentAccountId === accountId) {
      localStorage.removeItem(AccountManager.CURRENT_ACCOUNT_KEY);
    }
  }

  async switchAccount(accountId: string): Promise<void> {
    const accounts = this.listAccounts();
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    // Update active status
    accounts.forEach(acc => {
      acc.isActive = acc.id === accountId;
    });
    
    localStorage.setItem(AccountManager.ACCOUNTS_KEY, JSON.stringify(accounts));
    localStorage.setItem(AccountManager.CURRENT_ACCOUNT_KEY, accountId);
  }

  getCurrentAccount(): Account | null {
    const currentAccountId = localStorage.getItem(AccountManager.CURRENT_ACCOUNT_KEY);
    if (!currentAccountId) return null;

    const accounts = this.listAccounts();
    return accounts.find(account => account.id === currentAccountId) || null;
  }

  listAccounts(): Account[] {
    const accountsJson = localStorage.getItem(AccountManager.ACCOUNTS_KEY);
    if (!accountsJson) return [];

    try {
      const accounts = JSON.parse(accountsJson);
      // Convert date strings back to Date objects
      return accounts.map((account: any) => ({
        ...account,
        createdAt: new Date(account.createdAt),
      }));
    } catch {
      return [];
    }
  }

  async getAccountData(accountId: string): Promise<AccountData> {
    const dataJson = localStorage.getItem(AccountManager.ACCOUNT_DATA_PREFIX + accountId);
    
    if (!dataJson) {
      return {
        preferences: {},
        lastSync: null,
        cacheData: {},
        cache: {},
      };
    }

    try {
      const data = JSON.parse(dataJson);
      return {
        ...data,
        lastSync: data.lastSync ? new Date(data.lastSync) : null,
      };
    } catch {
      return {
        preferences: {},
        lastSync: null,
        cacheData: {},
        cache: {},
      };
    }
  }

  async saveAccountData(accountId: string, data: AccountData): Promise<void> {
    const dataToSave = {
      ...data,
      lastSync: data.lastSync ? data.lastSync.toISOString() : null,
    };
    
    localStorage.setItem(AccountManager.ACCOUNT_DATA_PREFIX + accountId, JSON.stringify(dataToSave));
  }
}