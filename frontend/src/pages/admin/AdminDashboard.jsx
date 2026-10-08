import { useEffect, useState } from 'react';
import {
  Activity,
  CalendarDays,
  FileText,
  HeartPulse,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useFetch from '../../hooks/useFetch';
import { services } from '../../services/api';
import { Card, CardBody, SectionHeader, StatCard } from '../../components/Card';
import { ErrorMessage, PageLoader } from '../../components/Feedback';

const PIE_COLORS = ['#2547eb', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AdminDashboardPage() {
  const { data: stats, loading, error, reload } = useFetch(() => services.admin.stats());

  const [chartData, setChartData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  useEffect(() => {
    services.admin
      .appointments()
      .then((appointments) => {
        const byStatus = {};
        appointments.forEach((item) => {
          byStatus[item.status] = (byStatus[item.status] || 0) + 1;
        });
        setStatusData(
          Object.entries(byStatus).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
          }))
        );
      })
      .catch(() => setStatusData([]));
  }, []);

  useEffect(() => {
    if (!stats) return;
    setChartData([
      { name: 'Patients', value: stats.patients },
      { name: 'Doctors', value: stats.doctors },
      { name: 'Hospitals', value: stats.hospitals },
      { name: 'Documents', value: stats.documents },
      { name: 'Appointments', value: stats.appointments },
    ]);
  }, [stats]);

  if (loading) return <PageLoader label="Loading admin dashboard..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform-wide overview of users, documents and appointments.
        </p>
      </div>

      <ErrorMessage message={error} onRetry={reload} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={stats?.total_users} icon={Users} tone="blue" />
        <StatCard label="Doctors" value={stats?.doctors} icon={Stethoscope} tone="green" />
        <StatCard label="Hospitals" value={stats?.hospitals} icon={HeartPulse} tone="purple" />
        <StatCard label="Documents" value={stats?.documents} icon={FileText} tone="amber" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Patients" value={stats?.patients} icon={Activity} tone="blue" />
        <StatCard label="Appointments" value={stats?.appointments} icon={CalendarDays} tone="green" />
        <StatCard label="Pending Verifications" value={stats?.pending_doctor_approvals} icon={Stethoscope} tone="amber" />
        <StatCard label="Unread Notifications" value={stats?.unread_notifications} icon={Users} tone="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <SectionHeader title="Platform entities" subtitle="Counts across the platform" />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2547eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <SectionHeader title="Appointments by status" />
            {statusData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No appointment data yet.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
