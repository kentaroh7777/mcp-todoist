import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthManager } from '@/lib/auth/auth-manager';
import { AccountManager } from '@/lib/auth/account-manager';
import { User } from '@/lib/auth/types';

// Mock Firebase Auth for integration testing
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(() => ({
    currentUser: null
  }))
}));

vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: null
  }
}));

describe('認証フロー統合テスト', () => {
  let authManager: AuthManager;
  let accountManager: AccountManager;
  
  beforeEach(() => {
    authManager = new AuthManager();
    accountManager = new AccountManager();
    
    // Clean up localStorage before each test
    localStorage.clear();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('完全な認証フロー', () => {
    it('サインアップ → アカウント追加 → 切り替え フローが動作する', async () => {
      // Mock Firebase responses
      const mockUser1 = {
        uid: 'user1_uid',
        email: 'user1@example.com',
        displayName: 'User 1',
        getIdToken: vi.fn().mockResolvedValue('token1')
      };
      
      const mockUser2 = {
        uid: 'user2_uid', 
        email: 'user2@example.com',
        displayName: 'User 2',
        getIdToken: vi.fn().mockResolvedValue('token2')
      };

      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(createUserWithEmailAndPassword)
        .mockResolvedValueOnce({ user: mockUser1 } as any)
        .mockResolvedValueOnce({ user: mockUser2 } as any);

      // 1. 新規ユーザー1作成
      const user1 = await authManager.signUpWithEmail('user1@example.com', 'Password123!');
      expect(user1.uid).toBe('user1_uid');
      expect(user1.email).toBe('user1@example.com');

      // 2. アカウント1追加
      const account1 = await accountManager.addAccount(user1, 'todoist_token_1');
      expect(account1.user.uid).toBe(user1.uid);
      expect(account1.todoistToken).toBe('todoist_token_1');
      expect(account1.isActive).toBe(true); // First account should be active

      // 3. 2つ目のユーザー作成
      const user2 = await authManager.signUpWithEmail('user2@example.com', 'Password456!');
      const account2 = await accountManager.addAccount(user2, 'todoist_token_2');
      expect(account2.user.uid).toBe('user2_uid');

      // 4. アカウント切り替え
      await accountManager.switchAccount(account2.id);
      const currentAccount = accountManager.getCurrentAccount();
      expect(currentAccount?.id).toBe(account2.id);
      expect(currentAccount?.isActive).toBe(true);

      // 5. 永続化確認
      const newAccountManager = new AccountManager();
      const persistedCurrentAccount = newAccountManager.getCurrentAccount();
      expect(persistedCurrentAccount?.id).toBe(account2.id);
      
      // 6. アカウントリスト確認
      const allAccounts = newAccountManager.listAccounts();
      expect(allAccounts).toHaveLength(2);
      expect(allAccounts.find(a => a.id === account1.id)?.isActive).toBe(false);
      expect(allAccounts.find(a => a.id === account2.id)?.isActive).toBe(true);
    });

    it('エラー発生時のリカバリーが動作する', async () => {
      // 無効なメールでサインアップ試行
      await expect(authManager.signUpWithEmail('invalid-email', 'password'))
        .rejects.toThrow('Invalid email format');

      // 正常なメールでリトライ
      const mockUser = {
        uid: 'user_uid',
        email: 'valid@example.com',
        displayName: null,
        getIdToken: vi.fn().mockResolvedValue('token')
      };

      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({ user: mockUser } as any);

      const user = await authManager.signUpWithEmail('valid@example.com', 'Password123!');
      expect(user.uid).toBe('user_uid');
    });

    it('localStorage破損時の復旧が動作する', async () => {
      // アカウント作成
      const mockUser = {
        uid: 'user_uid',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: vi.fn().mockResolvedValue('token')
      };

      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({ user: mockUser } as any);

      const user = await authManager.signUpWithEmail('test@example.com', 'Password123!');
      const account = await accountManager.addAccount(user, 'token');

      // Verify account was created
      expect(accountManager.listAccounts()).toHaveLength(1);

      // localStorage破損をシミュレート
      localStorage.setItem('mcp_todoist_accounts', 'invalid-json');

      // 新しいAccountManagerで復旧テスト
      const newAccountManager = new AccountManager();
      expect(newAccountManager.listAccounts()).toEqual([]);
      expect(newAccountManager.getCurrentAccount()).toBeNull();
    });
  });

  describe('並行処理テスト', () => {
    it('複数のアカウント操作が並行して動作する', async () => {
      const mockUser1 = {
        uid: 'user1_uid',
        email: 'user1@example.com',
        displayName: 'User 1',
        getIdToken: vi.fn().mockResolvedValue('token1')
      };
      
      const mockUser2 = {
        uid: 'user2_uid',
        email: 'user2@example.com', 
        displayName: 'User 2',
        getIdToken: vi.fn().mockResolvedValue('token2')
      };

      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(createUserWithEmailAndPassword)
        .mockResolvedValueOnce({ user: mockUser1 } as any)
        .mockResolvedValueOnce({ user: mockUser2 } as any);

      const user1 = await authManager.signUpWithEmail('user1@example.com', 'Password1!');
      const user2 = await authManager.signUpWithEmail('user2@example.com', 'Password2!');

      // 並行してアカウント追加
      const [account1, account2] = await Promise.all([
        accountManager.addAccount(user1, 'token1'),
        accountManager.addAccount(user2, 'token2')
      ]);

      expect(account1.id).not.toBe(account2.id);
      expect(accountManager.listAccounts()).toHaveLength(2);
    });

    it('複数のアカウント切り替えが正しく処理される', async () => {
      // Setup multiple accounts
      const mockUsers = [
        { uid: 'user1', email: 'user1@example.com', displayName: 'User 1', getIdToken: vi.fn().mockResolvedValue('token1') },
        { uid: 'user2', email: 'user2@example.com', displayName: 'User 2', getIdToken: vi.fn().mockResolvedValue('token2') },
        { uid: 'user3', email: 'user3@example.com', displayName: 'User 3', getIdToken: vi.fn().mockResolvedValue('token3') }
      ];

      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      mockUsers.forEach((mockUser, index) => {
        vi.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({ user: mockUser } as any);
      });

      const users = await Promise.all(
        mockUsers.map((mockUser, index) => 
          authManager.signUpWithEmail(mockUser.email, `Password${index + 1}!`)
        )
      );

      const accounts = await Promise.all(
        users.map((user, index) => 
          accountManager.addAccount(user, `token${index + 1}`)
        )
      );

      // Quick succession of account switches
      await accountManager.switchAccount(accounts[1].id);
      await accountManager.switchAccount(accounts[2].id);
      await accountManager.switchAccount(accounts[0].id);

      const finalCurrentAccount = accountManager.getCurrentAccount();
      expect(finalCurrentAccount?.id).toBe(accounts[0].id);

      // Verify only one account is active
      const allAccounts = accountManager.listAccounts();
      const activeAccounts = allAccounts.filter(acc => acc.isActive);
      expect(activeAccounts).toHaveLength(1);
      expect(activeAccounts[0].id).toBe(accounts[0].id);
    });
  });

  describe('データ永続化テスト', () => {
    it('アカウントデータの保存と取得が正しく動作する', async () => {
      const mockUser = {
        uid: 'user_uid',
        email: 'test@example.com', 
        displayName: 'Test User',
        getIdToken: vi.fn().mockResolvedValue('token')
      };

      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({ user: mockUser } as any);

      const user = await authManager.signUpWithEmail('test@example.com', 'Password123!');
      const account = await accountManager.addAccount(user, 'token');

      // Save account data
      const accountData = {
        preferences: { theme: 'dark', language: 'ja' },
        lastSync: new Date('2024-01-01'),
        cacheData: { projects: ['project1', 'project2'] },
        cache: { lastFetch: 'cached_data' }
      };

      await accountManager.saveAccountData(account.id, accountData);

      // Retrieve and verify
      const retrievedData = await accountManager.getAccountData(account.id);
      expect(retrievedData.preferences).toEqual(accountData.preferences);
      expect(retrievedData.lastSync?.toISOString()).toBe(accountData.lastSync.toISOString());
      expect(retrievedData.cacheData).toEqual(accountData.cacheData);
      expect(retrievedData.cache).toEqual(accountData.cache);
    });

    it('存在しないアカウントのデータ取得でデフォルト値を返す', async () => {
      const data = await accountManager.getAccountData('non_existent_account');
      
      expect(data).toEqual({
        preferences: {},
        lastSync: null,
        cacheData: {},
        cache: {}
      });
    });
  });

  describe('バリデーションテスト', () => {
    it('重複アカウント追加が正しく拒否される', async () => {
      const mockUser = {
        uid: 'user_uid',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: vi.fn().mockResolvedValue('token')
      };

      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user: mockUser } as any);

      const user = await authManager.signUpWithEmail('test@example.com', 'Password123!');
      
      // First account addition should succeed
      await accountManager.addAccount(user, 'token1');
      
      // Second account addition with same user should fail
      await expect(accountManager.addAccount(user, 'token2'))
        .rejects.toThrow('Account already exists');
    });

    it('存在しないアカウントへの切り替えが拒否される', async () => {
      await expect(accountManager.switchAccount('non_existent_account'))
        .rejects.toThrow('Account not found');
    });

    it('弱いパスワードでのサインアップが拒否される', async () => {
      await expect(authManager.signUpWithEmail('test@example.com', '12345'))
        .rejects.toThrow('Password too weak');
    });

    it('不正なメールフォーマットが拒否される', async () => {
      await expect(authManager.signUpWithEmail('invalid_email', 'Password123!'))
        .rejects.toThrow('Invalid email format');
        
      await expect(authManager.signInWithEmail('another_invalid', 'Password123!'))
        .rejects.toThrow('Invalid email format');
    });
  });

  describe('クリーンアップテスト', () => {
    it('アカウント削除時に関連データも削除される', async () => {
      const mockUser = {
        uid: 'user_uid',
        email: 'test@example.com',
        displayName: 'Test User', 
        getIdToken: vi.fn().mockResolvedValue('token')
      };

      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({ user: mockUser } as any);

      const user = await authManager.signUpWithEmail('test@example.com', 'Password123!');
      const account = await accountManager.addAccount(user, 'token');

      // Save some account data
      await accountManager.saveAccountData(account.id, {
        preferences: { theme: 'dark' },
        lastSync: new Date(),
        cacheData: { test: 'data' },
        cache: { cached: 'value' }
      });

      // Verify data exists
      const dataBefore = await accountManager.getAccountData(account.id);
      expect(dataBefore.preferences.theme).toBe('dark');

      // Remove account
      await accountManager.removeAccount(account.id);

      // Verify account is removed
      expect(accountManager.listAccounts()).toHaveLength(0);
      expect(accountManager.getCurrentAccount()).toBeNull();

      // Verify account data is cleaned up (should return defaults)
      const dataAfter = await accountManager.getAccountData(account.id);
      expect(dataAfter).toEqual({
        preferences: {},
        lastSync: null,
        cacheData: {},
        cache: {}
      });
    });
  });
});