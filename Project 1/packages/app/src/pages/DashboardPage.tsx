import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Grid, Box, Typography, Card, CardContent,
  Button, Skeleton, Avatar, List,
  ListItem, ListItemText, ListItemAvatar, Divider, Chip,
} from '@mui/material';
import TrendingUpIcon     from '@mui/icons-material/TrendingUp';
import TrendingDownIcon   from '@mui/icons-material/TrendingDown';
import AddCircleIcon      from '@mui/icons-material/AddCircle';
import SendIcon           from '@mui/icons-material/Send';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon            from '@mui/icons-material/Add';
import PaymentIcon        from '@mui/icons-material/Payment';
import ReceiptIcon        from '@mui/icons-material/Receipt';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';

import { api }              from '../utils/apiClient';
import { useAuth }          from '../hooks/useAuth';
import { useCountUp }       from '../hooks/useCountUp';
import { NEXUS_COLORS, CHART_COLORS } from '../styles/theme';

interface Summary {
  totalAssets: string; totalLiabilities: string;
  netWorth: string; netWorthChange: string; netWorthChangePct: string;
}
interface Account {
  id: string; account_type: string; nickname: string | null;
  balance: string; available_balance: string; currency: string;
}
interface Transaction {
  id: string; type: string; amount: string;
  description: string; created_at: string;
}
interface SpendingItem    { category: string; amount: string; percentage: string }
interface SpendingChartItem { category: string; amount: number; percentage: number }
interface SpendingResponse  { spending: SpendingItem[]; totalSpending: string; periodMonths: number }

// Animated balance number
function AnimatedAmount({ value, prefix = '$' }: { value: number; prefix?: string }) {
  const count = useCountUp(value, 1400);
  return <>{prefix}{count.toLocaleString('en-US', { minimumFractionDigits: 2 })}</>;
}

// Group transactions by date label
function groupByDate(txs: Transaction[]) {
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo   = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const groups: Record<string, Transaction[]> = {};
  txs.forEach(tx => {
    const d = new Date(tx.created_at); d.setHours(0,0,0,0);
    const label = d.getTime() === today.getTime()     ? 'Today'
                : d.getTime() === yesterday.getTime() ? 'Yesterday'
                : d >= weekAgo                         ? 'This Week'
                :                                       'Earlier';
    (groups[label] = groups[label] ?? []).push(tx);
  });
  return groups;
}

// Empty state SVG illustration
function EmptyTransactions() {
  return (
    <Box textAlign="center" py={5}>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={{ marginBottom: 12 }}>
        <circle cx="40" cy="40" r="40" fill="#F1F5F9"/>
        <rect x="22" y="28" width="36" height="24" rx="4" fill="#CBD5E1"/>
        <rect x="26" y="34" width="20" height="3" rx="1.5" fill="#94A3B8"/>
        <rect x="26" y="40" width="14" height="3" rx="1.5" fill="#CBD5E1"/>
        <circle cx="54" cy="52" r="8" fill="#1B6EF3"/>
        <rect x="50" y="51" width="8" height="2" rx="1" fill="white"/>
        <rect x="53" y="48" width="2" height="8" rx="1" fill="white"/>
      </svg>
      <Typography color="text.secondary" fontSize={14} fontWeight={500}>No transactions yet</Typography>
      <Typography color="text.disabled" fontSize={13} mt={0.5}>Your recent activity will appear here</Typography>
    </Box>
  );
}

const QUICK_ACTIONS = [
  { label: 'Add Money',   icon: <AddIcon />,     color: NEXUS_COLORS.electricBlue, path: '/accounts' },
  { label: 'Send Money',  icon: <SendIcon />,    color: NEXUS_COLORS.emerald,      path: '/payments' },
  { label: 'Pay Bill',    icon: <PaymentIcon />, color: NEXUS_COLORS.amber,        path: '/payments?tab=bill' },
  { label: 'Statements',  icon: <ReceiptIcon />, color: '#8B5CF6',                 path: '/transactions' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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
    () => api.get('/transactions', { limit: 8 }) as Promise<{ transactions: Transaction[] }>,
    { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: true }
  );

  const { data: spendingData } = useQuery<SpendingResponse>(
    'spending-summary',
    () => api.get('/analytics/spending', { months: 1 }) as Promise<SpendingResponse>,
    { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: true }
  );

  const { data: cashflowData } = useQuery<{ cashflow: { month: string; net: string }[] }>(
    'cashflow-sparkline',
    () => api.get('/analytics/cashflow') as Promise<{ cashflow: { month: string; net: string }[] }>,
    { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: true }
  );

  const netWorthValue = parseFloat(summary?.netWorth ?? '0');
  const netWorthPositive = parseFloat(summary?.netWorthChange ?? '0') >= 0;
  const groupedTx = useMemo(() => groupByDate(txData?.transactions ?? []), [txData]);
  const sparklineData = (cashflowData?.cashflow ?? []).map(c => ({ month: c.month, value: parseFloat(c.net) }));

  const spendingChart: SpendingChartItem[] = (spendingData?.spending ?? []).map(s => ({
    category: s.category, amount: parseFloat(s.amount), percentage: parseFloat(s.percentage),
  }));

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{greeting}, {user?.firstName ?? 'there'}</Typography>
          <Typography color="text.secondary" mt={0.5}>Here is your financial overview for today</Typography>
        </Box>
        <Box display="flex" gap={1.5}>
          <Button variant="outlined" startIcon={<AddCircleIcon />} onClick={() => navigate('/accounts')}>New Account</Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => navigate('/payments')}>Send Money</Button>
        </Box>
      </Box>

      <Grid container spacing={3}>

        {/* ── Net Worth Card with Sparkline ── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.navyDark} 0%, ${NEXUS_COLORS.navyMid} 100%)`, color: '#fff', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 }}>Net Worth</Typography>
              {summaryLoading ? (
                <Skeleton variant="text" width={180} height={50} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
              ) : (
                <>
                  <Typography variant="h3" fontWeight={800} mt={0.5}>
                    <AnimatedAmount value={netWorthValue} />
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5} mt={1} mb={2}>
                    {netWorthPositive
                      ? <TrendingUpIcon fontSize="small" sx={{ color: NEXUS_COLORS.emerald }} />
                      : <TrendingDownIcon fontSize="small" sx={{ color: NEXUS_COLORS.redAlert }} />}
                    <Typography fontSize={13} sx={{ color: netWorthPositive ? NEXUS_COLORS.emerald : NEXUS_COLORS.redAlert }}>
                      {netWorthPositive ? '+' : ''}{summary?.netWorthChangePct} this month
                    </Typography>
                  </Box>
                </>
              )}

              {/* 6-month sparkline */}
              {sparklineData.length > 0 && (
                <Box mt={1} mb={2}>
                  <Typography fontSize={11} sx={{ color: 'rgba(255,255,255,0.4)', mb: 1 }}>6-MONTH NET WORTH TREND</Typography>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={sparklineData}>
                      <Line type="monotone" dataKey="value" stroke={NEXUS_COLORS.electricBlue}
                        strokeWidth={2} dot={false} />
                      <XAxis dataKey="month" hide />
                      <YAxis hide />
                      <Tooltip
                        formatter={(v: number) => [`$${v.toLocaleString()}`, 'Net']}
                        contentStyle={{ background: NEXUS_COLORS.navyDark, border: 'none', borderRadius: 8, fontSize: 12 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}

              <Box display="flex" gap={3} pt={2} borderTop="1px solid rgba(255,255,255,0.1)">
                <Box>
                  <Typography fontSize={11} sx={{ color: 'rgba(255,255,255,0.4)' }}>Total Assets</Typography>
                  <Typography fontWeight={600} fontSize={14}>
                    ${parseFloat(summary?.totalAssets ?? '0').toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography fontSize={11} sx={{ color: 'rgba(255,255,255,0.4)' }}>Liabilities</Typography>
                  <Typography fontWeight={600} fontSize={14} sx={{ color: NEXUS_COLORS.redAlert }}>
                    ${parseFloat(summary?.totalLiabilities ?? '0').toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Accounts + Quick Actions ── */}
        <Grid item xs={12} md={8}>
          {/* Quick Actions */}
          <Grid container spacing={2} mb={2}>
            {QUICK_ACTIONS.map(a => (
              <Grid item xs={6} sm={3} key={a.label}>
                <Card sx={{ cursor: 'pointer', textAlign: 'center', p: 2,
                  transition: 'all 0.2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 } }}
                  onClick={() => navigate(a.path)}>
                  <Avatar sx={{ bgcolor: `${a.color}18`, width: 44, height: 44, mx: 'auto', mb: 1 }}>
                    {React.cloneElement(a.icon, { sx: { color: a.color, fontSize: 22 } })}
                  </Avatar>
                  <Typography fontSize={13} fontWeight={600}>{a.label}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Account Cards */}
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>Your Accounts</Typography>
                <Button size="small" onClick={() => navigate('/accounts')}>View All</Button>
              </Box>
              {accountsLoading ? (
                <Grid container spacing={2}>
                  {[1,2].map(i => <Grid item xs={12} sm={6} key={i}><Skeleton height={80} sx={{ borderRadius: 2 }} /></Grid>)}
                </Grid>
              ) : (accountsData?.accounts ?? []).length === 0 ? (
                <Box textAlign="center" py={3}>
                  <Typography color="text.secondary" fontSize={14}>No accounts yet</Typography>
                  <Button size="small" onClick={() => navigate('/accounts')} sx={{ mt: 1 }}>Open Account</Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {(accountsData?.accounts ?? []).slice(0, 4).map((acc: Account) => (
                    <Grid item xs={12} sm={6} key={acc.id}>
                      <Box p={2} borderRadius={2} sx={{ bgcolor: 'background.default', border: '1px solid', borderColor: 'divider',
                        cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: NEXUS_COLORS.electricBlue, boxShadow: 2 } }}
                        onClick={() => navigate(`/accounts/${acc.id}`)}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.8}>
                              {acc.account_type}
                            </Typography>
                            <Typography fontWeight={700} fontSize={18} mt={0.25}>
                              <AnimatedAmount value={parseFloat(acc.balance)} />
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {acc.nickname ?? acc.account_type}
                            </Typography>
                          </Box>
                          <Avatar sx={{ bgcolor: `${NEXUS_COLORS.electricBlue}18`, width: 32, height: 32 }}>
                            <AccountBalanceIcon sx={{ fontSize: 16, color: NEXUS_COLORS.electricBlue }} />
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

        {/* ── Recent Transactions (grouped by date) ── */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>Recent Transactions</Typography>
                <Button size="small" onClick={() => navigate('/transactions')}>View All</Button>
              </Box>
              {txLoading ? (
                [1,2,3,4,5].map(i => <Skeleton key={i} height={56} sx={{ mb: 0.5 }} />)
              ) : (txData?.transactions ?? []).length === 0 ? (
                <EmptyTransactions />
              ) : (
                Object.entries(groupedTx).map(([label, txs]) => (
                  <Box key={label} mb={1.5}>
                    <Chip label={label} size="small" sx={{ mb: 1, fontWeight: 600, fontSize: 11,
                      bgcolor: label === 'Today' ? `${NEXUS_COLORS.electricBlue}15` : 'action.hover',
                      color: label === 'Today' ? NEXUS_COLORS.electricBlue : 'text.secondary' }} />
                    <List disablePadding>
                      {txs.map((tx: Transaction, idx: number) => {
                        const isCredit = parseFloat(tx.amount) > 0;
                        return (
                          <React.Fragment key={tx.id}>
                            {idx > 0 && <Divider />}
                            <ListItem disablePadding sx={{ py: 1 }}>
                              <ListItemAvatar>
                                <Avatar sx={{ width: 36, height: 36,
                                  bgcolor: isCredit ? `${NEXUS_COLORS.emerald}18` : `${NEXUS_COLORS.redAlert}12` }}>
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
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Spending Breakdown ── */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>Spending This Month</Typography>
                <Typography variant="caption" color="text.secondary">
                  Total: ${parseFloat(spendingData?.totalSpending ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              {spendingChart.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: 8 }}>
                    <circle cx="32" cy="32" r="32" fill="#F1F5F9"/>
                    <path d="M32 16 A16 16 0 0 1 48 32" stroke="#CBD5E1" strokeWidth="8" strokeLinecap="round" fill="none"/>
                    <path d="M48 32 A16 16 0 0 1 32 48" stroke="#94A3B8" strokeWidth="8" strokeLinecap="round" fill="none"/>
                    <path d="M32 48 A16 16 0 0 1 16 32" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" fill="none"/>
                    <path d="M16 32 A16 16 0 0 1 32 16" stroke="#CBD5E1" strokeWidth="8" strokeLinecap="round" fill="none"/>
                  </svg>
                  <Typography color="text.secondary" fontSize={14}>No spending data this month</Typography>
                </Box>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={spendingChart} dataKey="amount" nameKey="category"
                        cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                        {spendingChart.map((_: SpendingChartItem, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box mt={2} display="flex" flexDirection="column" gap={1}>
                    {spendingChart.map((item: SpendingChartItem, i: number) => (
                      <Box key={item.category} display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Box width={10} height={10} borderRadius="50%" bgcolor={CHART_COLORS[i % CHART_COLORS.length]} flexShrink={0} />
                          <Typography fontSize={13} textTransform="capitalize" color="text.secondary">{item.category}</Typography>
                        </Box>
                        <Box display="flex" gap={1.5} alignItems="center">
                          <Typography fontSize={13} fontWeight={600}>
                            ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Typography>
                          <Typography fontSize={12} color="text.secondary" width={38} textAlign="right">
                            {item.percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}
