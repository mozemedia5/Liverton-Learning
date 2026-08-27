import { useAuth } from '@/contexts/AuthContext';
import LiveFund from '@/pages/features/LiveFund';
import LiveFeatureUnderDevelopment from '@/pages/features/LiveFeatureUnderDevelopment';

export default function LiveFeatureGate({ feature }: { feature: 'match' | 'fund' }) {
  const { userRole } = useAuth();
  if (userRole === 'platform_admin') return feature === 'fund' ? <LiveFund /> : <LiveFeatureUnderDevelopment feature="match" />;
  return <LiveFeatureUnderDevelopment feature={feature} />;
}
