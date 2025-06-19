'use client';

import React, { useState } from 'react';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Alert from 'antd/es/alert';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

interface SignInFormProps {
  onSignIn?: (email: string, password: string) => Promise<void>;
  onSignUp?: () => void;
  loading?: boolean;
}

export const SignInForm: React.FC<SignInFormProps> = ({ 
  onSignIn, 
  onSignUp, 
  loading = false 
}) => {
  const [form] = Form.useForm();
  const [error, setError] = useState<string>('');

  const handleSubmit = async (values: { email: string; password: string }) => {
    if (!values.email || !values.password) {
      return;
    }

    try {
      setError('');
      if (onSignIn) {
        await onSignIn(values.email, values.password);
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    }
  };

  const validateMessages = {
    required: '${label} is required!',
    types: {
      email: '${label} is not a valid email!',
    },
  };

  return (
    <div className="max-w-md mx-auto">
      <Form
        form={form}
        name="signin"
        onFinish={handleSubmit}
        validateMessages={validateMessages}
        layout="vertical"
      >
        {error && (
          <Alert
            message={error}
            type="error"
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true },
            { type: 'email' }
          ]}
        >
          <Input 
            placeholder="Enter your email"
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true }
          ]}
        >
          <Input.Password
            placeholder="Enter your password"
            disabled={loading}
            iconRender={(visible) =>
              visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={loading}
            block
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </Form.Item>

        {onSignUp && (
          <Form.Item>
            <Button
              type="link"
              onClick={onSignUp}
              disabled={loading}
              block
            >
              Don't have an account? Sign Up
            </Button>
          </Form.Item>
        )}
      </Form>
    </div>
  );
};
