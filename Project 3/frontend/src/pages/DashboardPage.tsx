import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Stack, Avatar, Chip, Button, Skeleton, Divider } from '@mui/material';
import { useQuery } from 'react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { analyticsClient, patientsClient, appointmentsClient } from '../utils/apiClient';
import { useAuthContext } from '../App';
import { MC_COLORS } from '../styles/theme';

// Build last 7 days date labels
function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

const QUICK_ACTIONS = [
  { label: 'New Patient', path: '/patients', icon: PeopleIcon, color: MC_COLORS.teal[500] },
  { label: 'Book Appointment', path: '/appointments', icon: CalendarMonthIcon, color: MC_COLORS.emerald[500] },
  { label: 'Clinical Records', path: '/clinical', icon: CheckCircleIcon, color: MC_COLORS.status.info },
  { label: 'View Analytics', path: '/analytics', icon: TrendingUpIcon, color: MC_COLORS.status.pending },
];

function StatCard({ title, value, subtitle, icon: Icon, color, loading }: { title: string; value: string | number; subtitle: string; icon: React.ElementType; color: string; loading?: boolean }) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>{title}</Typography>
            {loading ? <Skeleton width={80} height={40} /> : <Typography variant="h4" fontWeight={700}>{value}</Typography>}
            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">{subtitle}</Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}18`, width: 48, height: 48 }}>
            <Icon sx={{ color }} />
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const isAdmin = ['admin', 'superadmin', 'clinician'].includes(user?.role || '');

  // Real data from actual services
  const { data: patientsData, isLoading: pLoading } = useQuery(
    'dashboard-patients',
    () => patientsClient.get('/patients', { params: { limit: 1 } }).then((r: { data: any }) => r.data),
    { enabled: isAdmin, retry: false }
  );

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);

  const { data: todayAppts, isLoading: tLoading } = useQuery(
    'dashboard-today',
    () => appointmentsClient.get('/appointments', { params: { from: todayStart.toISOString(), limit: 1 } }).then((r: { data: any }) => r.data),
    { enabled: isAdmin, retry: false }
  );

  const { data: weekAppts, isLoading: wLoading } = useQuery(
    'dashboard-week',
    () => appointmentsClient.get('/appointments', { params: { from: weekStart.toISOString(), limit: 1 } }).then((r: { data: any }) => r.data),
    { enabled: isAdmin, retry: false }
  );

  const { data: completedAppts, isLoading: cLoading } = useQuery(
    'dashboard-completed',
    () => appointmentsClient.get('/appointments', { params: { status: 'completed', limit: 1 } }).then((r: { data: any }) => r.data),
    { enabled: isAdmin, retry: false }
  );

  // Trend: fetch last 7 days appointments for chart
  const { data: allAppts } = useQuery(
    'dashboard-trend',
    () => appointmentsClient.get('/appointments', { params: { from: weekStart.toISOString(), limit: 200 } }).then((r: { data: any }) => r.data),
    { enabled: isAdmin, retry: false }
  );

  const isLoading = pLoading || tLoading || wLoading || cLoading;

  const stats = {
    totalPatients: patientsData?.total ?? 0,
    todayAppointments: todayAppts?.total ?? 0,
    weeklyAppointments: weekAppts?.total ?? 0,
    completedAppointments: completedAppts?.total ?? 0,
  };

  // Build trend data from real appointments
  const trendData = last7Days().map((date) => {
    const appts = (allAppts?.appointments || []).filter((a: any) => a.scheduled_at?.startsWith(date));
    return {
      date: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(date)),
      scheduled: appts.filter((a: any) => !['completed', 'cancelled', 'no_show'].includes(a.status)).length,
      completed: appts.filter((a: any) => a.status === 'completed').length,
    };
  });

  const { data: demographicsData } = useQuery(
    'analytics-demographics',
    () => analyticsClient.get('/analytics/patients/demographics').then((r: { data: any }) => r.data),
    { enabled: isAdmin, retry: false }
  );

  const GENDER_COLORS: Record<string, string> = {
    male: MC_COLORS.teal[500],
    female: MC_COLORS.emerald[500],
    other: MC_COLORS.status.info,
  };

  const demographics = demographicsData?.genderBreakdown?.length
    ? demographicsData.genderBreakdown.map((g: { gender: string; count: string }) => ({
        name: g.gender.charAt(0).toUpperCase() + g.gender.slice(1),
        value: Number(g.count),
        color: GENDER_COLORS[g.gender] || MC_COLORS.status.pending,
      }))
    : [
        { name: 'Male', value: 0, color: MC_COLORS.teal[500] },
        { name: 'Female', value: 0, color: MC_COLORS.emerald[500] },
        { name: 'Other', value: 0, color: MC_COLORS.status.info },
      ];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700}>Welcome back, {user?.firstName} 👋</Typography>
        <Typography variant="body1" color="text.secondary" mt={0.5}>
          Here&apos;s an overview of your healthcare operations for today.
        </Typography>
      </Box>

      {isAdmin && (
        <Grid container spacing={3} mb={4}>
          {[
            { title: 'Total Patients', value: stats.totalPatients.toLocaleString(), subtitle: 'Active records', icon: PeopleIcon, color: MC_COLORS.teal[500] },
            { title: "Today's Appointments", value: stats.todayAppointments, subtitle: 'Scheduled for today', icon: CalendarMonthIcon, color: MC_COLORS.emerald[500] },
            { title: 'Weekly Appointments', value: stats.weeklyAppointments, subtitle: 'Last 7 days', icon: TrendingUpIcon, color: MC_COLORS.status.info },
            { title: 'Completed', value: stats.completedAppointments, subtitle: 'This month', icon: CheckCircleIcon, color: MC_COLORS.status.stable },
          ].map((s) => (
            <Grid item xs={12} sm={6} lg={3} key={s.title}>
              <StatCard {...s} loading={isLoading} />
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={3} mb={4}>
        {QUICK_ACTIONS.filter((a) => {
          if (a.path === '/patients' || a.path === '/clinical') return isAdmin;
          if (a.path === '/analytics') return ['admin', 'superadmin'].includes(user?.role || '');
          return true;
        }).map(({ label, path, icon: Icon, color }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Card sx={{ cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }} onClick={() => navigate(path)}>
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: `${color}18`, width: 48, height: 48, mx: 'auto', mb: 1.5 }}>
                  <Icon sx={{ color }} />
                </Avatar>
                <Typography variant="body2" fontWeight={600}>{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {isAdmin && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>Appointment Trends</Typography>
                    <Typography variant="body2" color="text.secondary">Last 7 days</Typography>
                  </Box>
                  <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/analytics')}>Full Report</Button>
                </Stack>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="scheduled" stroke={MC_COLORS.teal[500]} strokeWidth={2.5} dot={{ r: 4 }} name="Scheduled" />
                    <Line type="monotone" dataKey="completed" stroke={MC_COLORS.emerald[500]} strokeWidth={2.5} dot={{ r: 4 }} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} mb={0.5}>Patient Demographics</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>Gender distribution</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={demographics} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {demographics.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={10} />
                    <Tooltip formatter={(v) => [`${v}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  {demographics.map((d: any) => (
                    <Stack key={d.name} direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color }} />
                        <Typography variant="body2">{d.name}</Typography>
                      </Stack>
                      <Chip label={`${d.value}%`} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {user?.role === 'patient' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} mb={2}>Your Upcoming Appointments</Typography>
                <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                  <CalendarMonthIcon sx={{ fontSize: 48, mb: 1, color: MC_COLORS.teal[300] }} />
                  <Typography variant="body2">No upcoming appointments</Typography>
                  <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => navigate('/appointments')}>Book Now</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} mb={2}>Health Summary</Typography>
                <Typography variant="body2" color="text.secondary">Complete your profile to see your health summary.</Typography>
                <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={() => navigate('/profile')}>Complete Profile</Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
