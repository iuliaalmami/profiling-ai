import { useState } from 'react';
import { Button, Input, Form, Typography, message, Card, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.scss';

const { Title, Text } = Typography;

interface AuthFormData {
  email: string;
  password: string;
}

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleAuth = async (values: AuthFormData, isSignup = false) => {
    setLoading(true);
    try {
      const endpoint = isSignup ? '/signup' : '/login';
      const response = await fetch(`http://127.0.0.1:8000/api/v1${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        message.success(isSignup ? 'Account created successfully!' : 'Login successful!');
        
        // Store auth token if provided
        const token = data.token || data.access_token || 'dummy_token';
        login(token);
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        message.error(errorData.message || `${isSignup ? 'Signup' : 'Login'} failed. Please try again.`);
      }
    } catch (error) {
      message.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginForm = (
    <Form
      name="login"
      onFinish={(values) => handleAuth(values, false)}
      autoComplete="off"
      size="large"
    >
      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Please input your email!' },
          { type: 'email', message: 'Please enter a valid email!' }
        ]}
      >
        <Input 
          prefix={<MailOutlined />} 
          placeholder="Email" 
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Please input your password!' }]}
      >
        <Input.Password 
          prefix={<LockOutlined />} 
          placeholder="Password" 
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Sign In
        </Button>
      </Form.Item>
    </Form>
  );

  const signupForm = (
    <Form
      name="signup"
      onFinish={(values) => handleAuth(values, true)}
      autoComplete="off"
      size="large"
    >
      <Form.Item
        name="email"
        rules={[
          { required: true, message: 'Please input your email!' },
          { type: 'email', message: 'Please enter a valid email!' }
        ]}
      >
        <Input 
          prefix={<MailOutlined />} 
          placeholder="Email" 
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: 'Please input your password!' },
          { min: 6, message: 'Password must be at least 6 characters!' }
        ]}
      >
        <Input.Password 
          prefix={<LockOutlined />} 
          placeholder="Password" 
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Create Account
        </Button>
      </Form.Item>
    </Form>
  );

  const tabItems = [
    {
      key: 'login',
      label: 'Sign In',
      children: loginForm,
    },
    {
      key: 'signup',
      label: 'Sign Up',
      children: signupForm,
    },
  ];

  return (
    <div className="login-page">
      <div className="login-container">
        <Card className="login-card">
          <div className="login-header">
            <Title level={2}>Welcome to Profiling AI</Title>
            <Text type="secondary">
              {activeTab === 'login' 
                ? 'Sign in to access your profile management dashboard' 
                : 'Create an account to get started'
              }
            </Text>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            centered
            size="large"
          />
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;