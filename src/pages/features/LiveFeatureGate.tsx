import { useAuth } from '@/contexts/AuthContext';
import LiveFund from '@/pages/features/LiveFund';
import LiveFeatureUnderDevelopment from '@/pages/features/LiveFeatureUnderDevelopment';

export default function LiveFeatureGate({ feature }: { feature: 'mart' | 'fund' }) {
  const { userRole } = useAuth();
  if (userRole === 'platform_admin') return feature === 'fund' ? <LiveFund /> : <LiveFeatureUnderDevelopment feature="mart" />;
  return <LiveFeatureUnderDevelopment feature={feature} />;
}
