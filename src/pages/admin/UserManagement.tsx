import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, MoreVertical, CheckCircle, XCircle, UserCheck, UserX } from 'lucide-react';
import { 
  getAllUsers, 
  getUsersByRole, 
  updateUserStatus, 
  updateUserRole,
  verifyUser,
  deleteUser,
  formatUserForDisplay,
  getRoleBadgeColor,
  getStatusBadgeColor,
  type FirestoreUser
} from '@/services/userService';
import type { UserRole } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface DisplayUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending';
  joinDate: string;
  isVerified: boolean;
  country?: string;
  schoolName?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DisplayUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch users from Firebase on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users when search term or role filter changes
  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      let firestoreUsers: FirestoreUser[];
      
      if (filterRole !== 'all') {
        firestoreUsers = await getUsersByRole(filterRole as UserRole);
      } else {
        firestoreUsers = await getAllUsers();
      }
      
      const displayUsers = firestoreUsers.map(formatUserForDisplay);
      setUsers(displayUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(term) ||
        user.name.toLowerCase().includes(term) ||
        user.country?.toLowerCase().includes(term) ||
        user.schoolName?.toLowerCase().includes(term)
      );
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    setFilteredUsers(filtered);
  };

  const handleRoleFilterChange = async (role: string) => {
    setFilterRole(role);
    setLoading(true);
    
    try {
      let firestoreUsers: FirestoreUser[];
      if (role !== 'all') {
        firestoreUsers = await getUsersByRole(role as UserRole);
      } else {
        firestoreUsers = await getAllUsers();
      }
      const displayUsers = firestoreUsers.map(formatUserForDisplay);
      setUsers(displayUsers);
    } catch (error) {
      console.error('Error filtering users:', error);
      toast.error('Failed to filter users');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      await updateUserStatus(userId, 'suspended');
      toast.success('User suspended successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      await updateUserStatus(userId, 'active');
      toast.success('User activated successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      await verifyUser(userId);
      toast.success('User verified successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error verifying user:', error);
      toast.error('Failed to verify user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      setActionLoading(userId);
      await deleteUser(userId);
      toast.success('User deleted successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      setActionLoading(userId);
      await updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      await loadUsers();
    } catch (error) {
      console.error('Error changing user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const formatRoleName = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage all platform users from Firebase
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'student').length}</p>
            <p className="text-xs text-gray-500">Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'teacher').length}</p>
            <p className="text-xs text-gray-500">Teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === 'school_admin').length}</p>
            <p className="text-xs text-gray-500">Schools</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{users.filter(u => u.role === 'parent').length}</p>
            <p className="text-xs text-gray-500">Parents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{users.length}</p>
            <p className="text-xs text-gray-500">Total Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, country, or school..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="school_admin">School Admin</option>
              <option value="parent">Parent</option>
              <option value="platform_admin">Platform Admin</option>
            </select>
            <Button 
              variant="outline" 
              onClick={loadUsers}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Users ({filteredUsers.length} of {users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading users from Firebase...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || filterRole !== 'all' 
                ? 'No users match your search criteria.' 
                : 'No users found in the database.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div>
                          {user.name}
                          {!user.isVerified && user.role !== 'student' && user.role !== 'parent' && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Unverified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {formatRoleName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {user.joinDate}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.status === 'active' ? (
                              <DropdownMenuItem 
                                onClick={() => handleSuspendUser(user.id)}
                                className="text-red-600"
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleActivateUser(user.id)}
                                className="text-green-600"
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Activate User
                              </DropdownMenuItem>
                            )}
                            
                            {!user.isVerified && (user.role === 'teacher' || user.role === 'school_admin') && (
                              <DropdownMenuItem 
                                onClick={() => handleVerifyUser(user.id)}
                                className="text-blue-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify User
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem 
                              onClick={() => handleChangeRole(user.id, 'student')}
                              disabled={user.role === 'student'}
                            >
                              Change to Student
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleChangeRole(user.id, 'teacher')}
                              disabled={user.role === 'teacher'}
                            >
                              Change to Teacher
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleChangeRole(user.id, 'school_admin')}
                              disabled={user.role === 'school_admin'}
                            >
                              Change to School Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleChangeRole(user.id, 'parent')}
                              disabled={user.role === 'parent'}
                            >
                              Change to Parent
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
