'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

interface SignUpFormProps {
  onSignUp?: (email: string, password: string, confirmPassword: string) => Promise<void>;
  onSignIn?: () => void;
  loading?: boolean;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ 
  onSignUp, 
  onSignIn, 
  loading = false 
}) => {
  const [form] = Form.useForm();
  const [error, setError] = useState<string>('');

  const handleSubmit = async (values: { 
    email: string; 
    password: string; 
    confirmPassword: string;
  }) => {
    if (!values.email || !values.password || !values.confirmPassword) {
      return;
    }

    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError('');
      if (onSignUp) {
        await onSignUp(values.email, values.password, values.confirmPassword);
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
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
        name="signup"
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
            { required: true },
            { min: 6, message: 'Password must be at least 6 characters' }
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

        <Form.Item
          label="Confirm Password"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            placeholder="Confirm your password"
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </Form.Item>

        {onSignIn && (
          <Form.Item>
            <Button
              type="link"
              onClick={onSignIn}
              disabled={loading}
              block
            >
              Already have an account? Sign In
            </Button>
          </Form.Item>
        )}
      </Form>
    </div>
  );
};