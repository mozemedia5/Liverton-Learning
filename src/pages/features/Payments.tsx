// Payments component
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  ArrowLeft, 
  CreditCard, 
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
// import { toast } from 'sonner';

interface Payment {
  id: string;
  item: string;
  type: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  date: string;
  reference: string;
}

const mockPayments: Payment[] = [
  { id: '1', item: 'Advanced Mathematics Course', type: 'Course Purchase', amount: 50, status: 'completed', date: '2026-02-08', reference: 'PAY-001234' },
  { id: '2', item: 'Physics Fundamentals', type: 'Course Purchase', amount: 45, status: 'completed', date: '2026-02-05', reference: 'PAY-001233' },
  { id: '3', item: 'English Literature', type: 'Course Purchase', amount: 35, status: 'pending', date: '2026-02-10', reference: 'PAY-001235' },
  { id: '4', item: 'Chemistry Basics', type: 'Course Purchase', amount: 40, status: 'failed', date: '2026-02-01', reference: 'PAY-001230' },
  { id: '5', item: 'Computer Science 101', type: 'Course Purchase', amount: 60, status: 'refunded', date: '2026-01-28', reference: 'PAY-001225' },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
    case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
    case 'refunded': return <DollarSign className="w-5 h-5 text-blue-500" />;
    default: return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
    case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
    case 'failed': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</Badge>;
    case 'refunded': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Refunded</Badge>;
    default: return null;
  }
};

export default function Payments() {
  const navigate = useNavigate();
  useAuth();

  const totalSpent = mockPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = mockPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Payments</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
                  <p className="text-xl font-bold">${totalSpent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-xl font-bold">${pendingAmount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
                  <p className="text-xl font-bold">{mockPayments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockPayments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(payment.status)}
                    <div>
                      <p className="font-medium">{payment.item}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {payment.type} • {payment.date}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ref: {payment.reference}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${payment.amount}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(payment.status)}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Flutterwave</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Secure card & mobile money payments</p>
                  </div>
                </div>
                <Badge>Default</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
