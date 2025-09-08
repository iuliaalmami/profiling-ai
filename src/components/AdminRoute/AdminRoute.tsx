import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  
  // Show loading while checking authentication
  if (isLoading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '16px'
    }}>Loading...</div>;
  }
  
  // Check if user is authenticated and is admin
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h2>Access Denied</h2>
        <p>You need admin privileges to access this page.</p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }
  
  return <>{children}</>;
};

export default AdminRoute;
