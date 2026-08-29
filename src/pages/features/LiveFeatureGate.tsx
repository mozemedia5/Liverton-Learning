import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LiveFund from '@/pages/features/LiveFund';
import LiveFeatureUnderDevelopment from '@/pages/features/LiveFeatureUnderDevelopment';

/**
 * Liv Fund and Liv Mart are currently restricted to organization parents (school_admin)
 * and the platform administrator only. Other roles are redirected to the dashboard.
 */
export default function LiveFeatureGate({ feature }: { feature: 'mart' | 'fund' }) {
  const { userRole } = useAuth();

  // Only school_admin and platform_admin may access these features
  if (userRole === 'platform_admin') {
    return feature === 'fund' ? <LiveFund /> : <LiveFeatureUnderDevelopment feature="mart" />;
  }
  if (userRole === 'school_admin') {
    return feature === 'fund' ? <LiveFund /> : <LiveFeatureUnderDevelopment feature="mart" />;
  }

  // All other roles: redirect away (features under redevelopment)
  return <Navigate to="/login" replace />;
}
