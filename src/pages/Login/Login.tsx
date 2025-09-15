import { useState } from 'react';
import { Button, Input, Form, Typography, message, Card, Tabs, Alert } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_BASE_URL } from '../../utils/api';
import './Login.scss';

const { Title, Text } = Typography;

interface AuthFormData {
  email: string;
  password: string;
  timezone?: string;
}

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleAuth = async (values: AuthFormData, isSignup = false) => {
    setLoading(true);
    setErrorMessage(null); // Clear previous errors
    setSuccessMessage(null); // Clear previous success messages
    
    try {
      const endpoint = isSignup ? '/signup' : '/login';
      
      // Add user's timezone to the request
      const requestData = {
        ...values,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      
      //const response = await api.public.post(`${API_BASE_URL}/api/v1${endpoint}`, requestData);
      const response = await api.public.post(endpoint, requestData);

      if (response.ok) {
        const data = await response.json();
        const successMsg = isSignup ? 'Account created successfully!' : 'Login successful!';
        setSuccessMessage(successMsg);
        message.success(successMsg);
        
        // Store auth token if provided
        const token = data.token || data.access_token || 'dummy_token';
        login(token);
        
        // Navigate to intended page or dashboard
        const redirectPath = sessionStorage.getItem('redirect_after_login') || '/dashboard';
        sessionStorage.removeItem('redirect_after_login'); // Clean up
        navigate(redirectPath);
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // Use 'detail' field from FastAPI error responses
        const errorMsg = errorData.detail || errorData.message || `${isSignup ? 'Signup' : 'Login'} failed. Please try again.`;
        setErrorMessage(errorMsg);
        message.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a network error or API error
      let displayError;
      if (errorMsg.includes('fetch')) {
        displayError = 'Network error. Please check your connection and try again.';
      } else {
        displayError = 'An unexpected error occurred. Please try again.';
      }
      
      setErrorMessage(displayError);
      message.error(displayError);
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

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setErrorMessage(null); // Clear error when switching tabs
    setSuccessMessage(null); // Clear success when switching tabs
  };

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
                ? 'Test Account: admin@admin.com / admin123' 
                : 'Create an account to get started'
              }
            </Text>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <Alert
              message={errorMessage}
              type="error"
              showIcon
              closable
              onClose={() => setErrorMessage(null)}
            />
          )}

          {/* Success Message */}
          {successMessage && (
            <Alert
              message={successMessage}
              type="success"
              showIcon
              closable
              onClose={() => setSuccessMessage(null)}
            />
          )}

          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
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