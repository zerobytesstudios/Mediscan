import { Users } from 'lucide-react';
import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { Badge, Card, SectionHeader } from '../../components/Card';
import { EmptyState, ErrorMessage, PageLoader } from '../../components/Feedback';
import { Select } from '../../components/Input';

const ROLE_TONE = { patient: 'blue', doctor: 'green', hospital: 'amber', admin: 'purple' };

export default function AdminUsersPage() {
  const [role, setRole] = useState('');
  const { data, loading, error, reload } = useFetch(() => services.admin.users(role || undefined), [
    role,
  ]);

  if (loading) return <PageLoader label="Loading users..." />;

  const users = data || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Users"
        subtitle="Everyone registered on the platform"
        action={
          <Select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-44"
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="patient">Patients</option>
            <option value="doctor">Doctors</option>
            <option value="hospital">Hospitals</option>
            <option value="admin">Admins</option>
          </Select>
        }
      />

      <ErrorMessage message={error} onRetry={reload} />

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users found." description="Try a different role filter." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">{user.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ROLE_TONE[user.role] || 'slate'}>{user.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={user.is_active ? 'green' : 'red'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
