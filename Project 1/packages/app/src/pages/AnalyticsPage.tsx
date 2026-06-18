import React from 'react';
import { useQuery } from 'react-query';
import {
  Box, Typography, Grid, Card, CardContent, Skeleton,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS, CHART_COLORS } from '../styles/theme';

interface SpendingItem { category: string; amount: string; percentage: string }
interface CashflowItem { month: string; income: string; expenses: string; net: string }

export default function AnalyticsPage() {
  const { data: spendingData, isLoading: spendingLoading } = useQuery<{ spending: SpendingItem[] }>(
    'analytics-spending',
    () => api.get('/analytics/spending') as Promise<{ spending: SpendingItem[] }>
  );

  const { data: cashflowData, isLoading: cashflowLoading } = useQuery<{ cashflow: CashflowItem[] }>(
    'analytics-cashflow',
    () => api.get('/analytics/cashflow') as Promise<{ cashflow: CashflowItem[] }>
  );

  // Parse string amounts to numbers for recharts
  const spendingChart = (spendingData?.spending ?? []).map(s => ({
    category: s.category.charAt(0).toUpperCase() + s.category.slice(1),
    amount: parseFloat(s.amount),
    percentage: parseFloat(s.percentage),
  }));

  const cashflowChart = (cashflowData?.cashflow ?? []).map(c => ({
    month: c.month,
    Income: parseFloat(c.income),
    Expenses: parseFloat(c.expenses),
    Net: parseFloat(c.net),
  }));

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark} mb={1}>Analytics</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Understand your financial patterns</Typography>

      <Grid container spacing={3}>
        {/* Spending Breakdown Pie */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>Spending Breakdown</Typography>
              {spendingLoading ? (
                <Skeleton variant="rectangular" height={260} />
              ) : spendingChart.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <Typography color="text.secondary">No spending data available</Typography>
                </Box>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={spendingChart} dataKey="amount" nameKey="category"
                        cx="50%" cy="50%" outerRadius={85} paddingAngle={3}
                        label={({ category, percentage }) => `${category} ${percentage}%`}
                        labelLine={false}>
                        {spendingChart.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box mt={1}>
                    {spendingChart.map((item, i) => (
                      <Box key={item.category} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box width={10} height={10} borderRadius="50%" bgcolor={CHART_COLORS[i % CHART_COLORS.length]} />
                          <Typography fontSize={13}>{item.category}</Typography>
                        </Box>
                        <Typography fontSize={13} fontWeight={600}>
                          ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({item.percentage}%)
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Cash Flow Bar Chart */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>Monthly Cash Flow</Typography>
              {cashflowLoading ? (
                <Skeleton variant="rectangular" height={260} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={cashflowChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, '']} />
                    <Legend />
                    <Bar dataKey="Income" fill={NEXUS_COLORS.emerald} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill={NEXUS_COLORS.redAlert} radius={[4, 4, 0, 0]} />
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
