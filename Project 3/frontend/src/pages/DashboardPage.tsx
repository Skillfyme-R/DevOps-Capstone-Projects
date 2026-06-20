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
import { apiClient } from '../utils/apiClient';
import { useAuthContext } from '../App';
import { MC_COLORS } from '../styles/theme';

const DEMO_TREND = [
  { date: 'Jun 14', total: 24, completed: 20 },
  { date: 'Jun 15', total: 31, completed: 28 },
  { date: 'Jun 16', total: 18, completed: 15 },
  { date: 'Jun 17', total: 27, completed: 22 },
  { date: 'Jun 18', total: 35, completed: 30 },
  { date: 'Jun 19', total: 29, completed: 25 },
  { date: 'Jun 20', total: 22, completed: 18 },
];

const DEMO_DEMOGRAPHICS = [
  { name: 'Male', value: 45, color: MC_COLORS.teal[500] },
  { name: 'Female', value: 48, color: MC_COLORS.emerald[500] },
  { name: 'Other', value: 7, color: MC_COLORS.status.info },
];

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

  const { data: summary, isLoading } = useQuery(
    'analytics-summary',
    () => apiClient.get('/analytics/summary').then((r: { data: any }) => r.data),
    { enabled: isAdmin, retry: false }
  );

  const stats = summary || { totalPatients: 1284, todayAppointments: 22, weeklyAppointments: 147, completedAppointments: 89 };

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
                  <LineChart data={DEMO_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke={MC_COLORS.teal[500]} strokeWidth={2.5} dot={{ r: 4 }} name="Scheduled" />
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
                    <Pie data={DEMO_DEMOGRAPHICS} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {DEMO_DEMOGRAPHICS.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={10} />
                    <Tooltip formatter={(v) => [`${v}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  {DEMO_DEMOGRAPHICS.map((d) => (
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
