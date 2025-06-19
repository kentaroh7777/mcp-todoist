'use client';

import React from 'react';
import Card from 'antd/es/card';
import Button from 'antd/es/button';
import Avatar from 'antd/es/avatar';
import Typography from 'antd/es/typography';
import Divider from 'antd/es/divider';
import { UserOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AccountSwitcherProps {
  accounts: Array<{
    id: string;
    email: string;
    displayName?: string;
  }>;
  currentAccountId?: string;
  onAccountSwitch?: (accountId: string) => void;
  onAddAccount?: () => void;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({
  accounts,
  currentAccountId,
  onAccountSwitch,
  onAddAccount
}) => {
  const handleAccountClick = (accountId: string) => {
    if (onAccountSwitch && accountId !== currentAccountId) {
      onAccountSwitch(accountId);
    }
  };

  return (
    <Card title="Switch Account" style={{ width: 300 }}>
      <div className="space-y-2">
        {accounts.map((account) => (
          <div
            key={account.id}
            className={`p-3 rounded cursor-pointer transition-colors ${
              account.id === currentAccountId
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleAccountClick(account.id)}
          >
            <div className="flex items-center space-x-3">
              <Avatar icon={<UserOutlined />} />
              <div className="flex-1">
                <div className="font-medium">
                  {account.displayName || account.email}
                </div>
                <Text type="secondary" className="text-sm">
                  {account.email}
                </Text>
              </div>
              {account.id === currentAccountId && (
                <div className="text-blue-600 text-sm font-medium">
                  Current
                </div>
              )}
            </div>
          </div>
        ))}
        
        {accounts.length > 0 && <Divider style={{ margin: '12px 0' }} />}
        
        {onAddAccount && (
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={onAddAccount}
            block
          >
            Add Account
          </Button>
        )}
      </div>
    </Card>
  );
};