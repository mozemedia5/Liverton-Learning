import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * AdminLayout Component
 * 
 * Now a wrapper around AuthenticatedLayout to ensure consistent
 * navigation and layout across all dashboard types.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AuthenticatedLayout>
      <div className="p-4 lg:p-8">
        {children}
      </div>
    </AuthenticatedLayout>
  );
}
