import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Grid, Box, Typography, Card, CardContent,
  Button, Skeleton, Avatar, List,
  ListItem, ListItemText, ListItemAvatar, Divider,
} from '@mui/material';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import AddCircleIcon     from '@mui/icons-material/AddCircle';
import SendIcon          from '@mui/icons-material/Send';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

import { api } from '../utils/apiClient';
import { useAuth } from '../hooks/useAuth';
import { NEXUS_COLORS, CHART_COLORS } from '../styles/theme';

interface Summary {
  totalAssets: string;
  totalLiabilities: string;
  netWorth: string;
  netWorthChange: string;
  netWorthChangePct: string;
}

interface Account {
  id: string;
  account_type: string;
  nickname: string | null;
  balance: string;
  available_balance: string;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description: string;
  created_at: string;
}

interface SpendingItem {
  category: string;
  amount: string;
  percentage: string;
}

interface SpendingChartItem {
  category: string;
  amount: number;
  percentage: number;
}

interface SpendingResponse {
  spending: SpendingItem[];
  totalSpending: string;
  periodMonths: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: summary, isLoading: summaryLoading } = useQuery<Summary>(
    'analytics-summary',
    () => api.get('/analytics/summary') as Promise<Summary>,
    { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: true }
  );

  const { data: accountsData, isLoading: accountsLoading } = useQuery<{ accounts: Account[] }>(
    'accounts',
    () => api.get('/accounts') as Promise<{ accounts: Account[] }>,
    { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: true }
  );

  const { data: txData, isLoading: txLoading } = useQuery<{ transactions: Transaction[] }>(
    'recent-transactions',
    () => api.get('/transactions', { limit: 5 }) as Promise<{ transactions: Transaction[] }>,
    { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: true }
  );

  const { data: spendingData } = useQuery<SpendingResponse>(
    'spending-summary',
    () => api.get('/analytics/spending', { months: 1 }) as Promise<SpendingResponse>,
    { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: true }
  );

  const netWorthPositive = parseFloat(summary?.netWorthChange ?? '0') >= 0;

  return (
    <Box p={3}>
      <Box mb={3} display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={700} color={NEXUS_COLORS.navyDark}>
            Good morning, {user?.firstName ?? 'there'}
          </Typography>
          <Typography color="text.secondary" mt={0.5}>
            Here is your financial overview for today
          </Typography>
        </Box>
        <Box display="flex" gap={1.5}>
          <Button variant="outlined" startIcon={<AddCircleIcon />} onClick={() => navigate('/accounts')}>
            New Account
          </Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => navigate('/payments')}>
            Send Money
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>

        {/* Net Worth Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{
            background: `linear-gradient(135deg, ${NEXUS_COLORS.navyDark} 0%, ${NEXUS_COLORS.navyMid} 100%)`,
            color: '#fff',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)' }}>Net Worth</Typography>
              {summaryLoading ? (
                <Skeleton variant="text" width={180} height={50} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
              ) : (
                <>
                  <Typography variant="h3" fontWeight={700} mt={1}>
                    ${parseFloat(summary?.netWorth ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    {netWorthPositive
                      ? <TrendingUpIcon fontSize="small" sx={{ color: NEXUS_COLORS.emerald }} />
                      : <TrendingDownIcon fontSize="small" sx={{ color: NEXUS_COLORS.redAlert }} />}
                    <Typography fontSize={14} sx={{ color: netWorthPositive ? NEXUS_COLORS.emerald : NEXUS_COLORS.redAlert }}>
                      {netWorthPositive ? '+' : ''}{summary?.netWorthChangePct} this month
                    </Typography>
                  </Box>
                </>
              )}
              <Box display="flex" gap={3} mt={2.5} pt={2} borderTop="1px solid rgba(255,255,255,0.1)">
                <Box>
                  <Typography fontSize={11} sx={{ color: 'rgba(255,255,255,0.5)' }}>Total Assets</Typography>
                  <Typography fontWeight={600} fontSize={15}>
                    ${parseFloat(summary?.totalAssets ?? '0').toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography fontSize={11} sx={{ color: 'rgba(255,255,255,0.5)' }}>Liabilities</Typography>
                  <Typography fontWeight={600} fontSize={15} sx={{ color: NEXUS_COLORS.redAlert }}>
                    ${parseFloat(summary?.totalLiabilities ?? '0').toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Cards */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Your Accounts</Typography>
                <Button size="small" onClick={() => navigate('/accounts')}>View All</Button>
              </Box>
              {accountsLoading ? (
                [1, 2].map(i => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)
              ) : (
                <Grid container spacing={2}>
                  {(accountsData?.accounts ?? []).slice(0, 4).map((acc: Account) => (
                    <Grid item xs={12} sm={6} key={acc.id}>
                      <Box p={2} borderRadius={2} bgcolor={NEXUS_COLORS.gray50}
                        border={`1px solid ${NEXUS_COLORS.gray100}`}
                        sx={{ cursor: 'pointer', '&:hover': { borderColor: NEXUS_COLORS.electricBlue } }}
                        onClick={() => navigate(`/accounts/${acc.id}`)}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="caption" color="text.secondary" textTransform="uppercase">
                              {acc.account_type}
                            </Typography>
                            <Typography fontWeight={700} fontSize={18} mt={0.25}>
                              ${parseFloat(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {acc.nickname ?? acc.account_type}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: NEXUS_COLORS.electricBlue, width: 32, height: 32 }}>
                            <AccountBalanceIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent Transactions</Typography>
                <Button size="small" onClick={() => navigate('/transactions')}>View All</Button>
              </Box>
              {txLoading ? (
                [1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={56} sx={{ mb: 0.5 }} />)
              ) : (
                <List disablePadding>
                  {(txData?.transactions ?? []).map((tx: Transaction, index: number) => {
                    const isCredit = parseFloat(tx.amount) > 0;
                    return (
                      <React.Fragment key={tx.id}>
                        {index > 0 && <Divider />}
                        <ListItem disablePadding sx={{ py: 1 }}>
                          <ListItemAvatar>
                            <Avatar sx={{
                              width: 36, height: 36,
                              bgcolor: isCredit ? `${NEXUS_COLORS.emerald}20` : `${NEXUS_COLORS.redAlert}15`,
                            }}>
                              {isCredit
                                ? <TrendingUpIcon sx={{ fontSize: 18, color: NEXUS_COLORS.emerald }} />
                                : <TrendingDownIcon sx={{ fontSize: 18, color: NEXUS_COLORS.redAlert }} />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={tx.description || (tx.type.charAt(0).toUpperCase() + tx.type.slice(1))}
                            secondary={new Date(tx.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                            secondaryTypographyProps={{ fontSize: 12 }}
                          />
                          <Typography fontWeight={600} fontSize={14}
                            color={isCredit ? NEXUS_COLORS.emerald : NEXUS_COLORS.redAlert}>
                            {isCredit ? '+' : ''}
                            {parseFloat(tx.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                          </Typography>
                        </ListItem>
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Spending Breakdown */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>Spending This Month</Typography>
                <Typography variant="caption" color="text.secondary">
                  Total: ${parseFloat(spendingData?.totalSpending ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              {(spendingData?.spending ?? []).length > 0 ? (() => {
                const chartData = spendingData!.spending.map((s: SpendingItem) => ({
                  ...s,
                  amount: parseFloat(s.amount),
                  percentage: parseFloat(s.percentage),
                }));
                return (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={chartData} dataKey="amount" nameKey="category"
                          cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                          {chartData.map((_: SpendingChartItem, i: number) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Amount']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box mt={2} display="flex" flexDirection="column" gap={1}>
                      {chartData.map((item: SpendingChartItem, i: number) => (
                        <Box key={item.category} display="flex" justifyContent="space-between" alignItems="center">
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box width={12} height={12} borderRadius="50%" bgcolor={CHART_COLORS[i % CHART_COLORS.length]} flexShrink={0} />
                            <Typography fontSize={13} textTransform="capitalize" color="text.secondary">
                              {item.category}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Typography fontSize={13} fontWeight={600}>
                              ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Typography>
                            <Typography fontSize={12} color="text.secondary" width={40} textAlign="right">
                              {item.percentage.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </>
                );
              })() : (
                <Box textAlign="center" py={5}>
                  <Typography color="text.secondary" fontSize={14}>No spending data this month</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}
