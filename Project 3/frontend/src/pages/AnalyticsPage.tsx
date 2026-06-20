import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Skeleton, Alert } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQuery } from 'react-query';
import { apiClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

const CONDITION_COLORS = [MC_COLORS.teal[500], MC_COLORS.emerald[500], MC_COLORS.status.info, MC_COLORS.status.warning, MC_COLORS.status.pending, MC_COLORS.status.critical];

export default function AnalyticsPage() {
  const { data: summary } = useQuery('analytics-summary', () => apiClient.get('/analytics/summary').then((r: { data: any }) => r.data), { retry: false });
  const { data: trend } = useQuery('analytics-trend', () => apiClient.get('/analytics/appointments/trend?days=30').then((r: { data: any }) => r.data), { retry: false });
  const { data: kpis } = useQuery('analytics-kpis', () => apiClient.get('/analytics/operational/kpis').then((r: { data: any }) => r.data), { retry: false });
  const { data: conditions } = useQuery('analytics-conditions', () => apiClient.get('/analytics/clinical/conditions').then((r: { data: any }) => r.data), { retry: false });
  const { data: demographics } = useQuery('analytics-demographics', () => apiClient.get('/analytics/patients/demographics').then((r: { data: any }) => r.data), { retry: false });

  const trendData = trend?.trend || [];
  const topConditions = conditions?.topConditions?.slice(0, 8) || [];
  const genderData = demographics?.genderBreakdown || [];
  const ageData = demographics?.ageGroups || [];

  const KPI_CARDS = [
    { label: 'Avg. Appointment Duration', value: `${Math.round(kpis?.avgAppointmentDurationMinutes || 30)} min`, color: MC_COLORS.teal[500] },
    { label: 'Completion Rate (30d)', value: `${kpis?.completionRate30Days || 0}%`, color: MC_COLORS.emerald[500] },
    { label: 'No-Show Rate (30d)', value: `${kpis?.noShowRate30Days || 0}%`, color: MC_COLORS.status.warning },
    { label: 'Total Patients', value: (summary?.totalPatients || 0).toLocaleString(), color: MC_COLORS.status.info },
  ];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700}>Healthcare Analytics</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Operational insights and clinical performance metrics</Typography>
      </Box>

      <Grid container spacing={3} mb={4}>
        {KPI_CARDS.map((k) => (
          <Grid item xs={6} md={3} key={k.label}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>{k.label}</Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: k.color }}>{k.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Appointment Trend (30 days)</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Daily scheduled vs. completed appointments</Typography>
              {trendData.length === 0 ? <Skeleton variant="rounded" height={260} /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice(5) || v} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke={MC_COLORS.teal[500]} strokeWidth={2.5} dot={false} name="Scheduled" />
                    <Line type="monotone" dataKey="completed" stroke={MC_COLORS.emerald[500]} strokeWidth={2.5} dot={false} name="Completed" />
                    <Line type="monotone" dataKey="no_show" stroke={MC_COLORS.status.warning} strokeWidth={1.5} dot={false} name="No-Show" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Gender Distribution</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Patient demographics</Typography>
              {genderData.length === 0 ? <Skeleton variant="rounded" height={260} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={genderData} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                      {genderData.map((_: unknown, i: number) => <Cell key={i} fill={CONDITION_COLORS[i % CONDITION_COLORS.length]} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={10} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Top Clinical Conditions</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Most prevalent active diagnoses (ICD-10)</Typography>
              {topConditions.length === 0
                ? <Alert severity="info">No condition data available yet.</Alert>
                : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={topConditions} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="icd10_code" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip formatter={(v, _n, props) => [v, props.payload?.description || '']} />
                      <Bar dataKey="count" fill={MC_COLORS.teal[500]} radius={[0, 4, 4, 0]} name="Patients" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Patient Age Groups</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Distribution across age brackets</Typography>
              {ageData.length === 0
                ? <Alert severity="info">No demographic data available yet.</Alert>
                : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="age_group" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.replace('_', ' ')} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Patients">
                        {ageData.map((_: unknown, i: number) => <Cell key={i} fill={CONDITION_COLORS[i % CONDITION_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
