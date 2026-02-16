import { useAuth } from '@/contexts/AuthContext';
import DocumentWorkspace from '@/pages/features/DocumentWorkspace';

export default function DocumentWorkspaceWrapper() {
  const { userRole } = useAuth();
  
  // Map parent role to student for DocumentWorkspace compatibility
  const mappedRole = userRole === 'parent' ? 'student' : (userRole || 'student');
  
  return <DocumentWorkspace userRole={mappedRole as 'student' | 'teacher' | 'school_admin'} />;
}
