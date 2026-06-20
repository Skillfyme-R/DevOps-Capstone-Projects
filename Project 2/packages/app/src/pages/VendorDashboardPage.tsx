import React from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Avatar, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, LinearProgress, alpha,
} from '@mui/material';
import {
  TrendingUp, Inventory2, ShoppingBag, Star, ArrowUpward, Add, Storefront,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { VV_COLORS } from '../styles/theme';
import { formatINR, formatINRShort } from '../utils/currency';

const revenueData = [
  { day: 'Mon', revenue: 104160 },
  { day: 'Tue', revenue: 82320  },
  { day: 'Wed', revenue: 131040 },
  { day: 'Thu', revenue: 176400 },
  { day: 'Fri', revenue: 158760 },
  { day: 'Sat', revenue: 268800 },
  { day: 'Sun', revenue: 231000 },
];

const topProducts = [
  { name: 'Wireless Headphones XR1', emoji: '🎧', sales: 234, revenue: 2936466, stock: 87,  maxStock: 120 },
  { name: 'Smart Speaker Pro',        emoji: '🔊', sales: 188, revenue: 1895040, stock: 43,  maxStock: 100 },
  { name: 'USB-C Hub 7-Port',         emoji: '🔌', sales: 312, revenue: 1310400, stock: 210, maxStock: 250 },
  { name: 'Webcam HD 1080p',          emoji: '📷', sales: 98,  revenue: 740880,  stock: 12,  maxStock: 80  },
];

const recentOrders = [
  { id: 'VV-10421', customer: 'Priya S.',  initials: 'PS', product: 'Wireless Headphones XR1', amount: 12549, status: 'Processing' },
  { id: 'VV-10410', customer: 'James T.',  initials: 'JT', product: 'Smart Speaker Pro',        amount: 10080, status: 'Shipped'    },
  { id: 'VV-10399', customer: 'Maria G.',  initials: 'MG', product: 'USB-C Hub 7-Port',         amount: 4199,  status: 'Delivered'  },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  Processing: { color: VV_COLORS.amber,    bg: alpha(VV_COLORS.amber,   0.12) },
  Shipped:    { color: '#3B82F6',           bg: alpha('#3B82F6',         0.12) },
  Delivered:  { color: VV_COLORS.emerald,  bg: alpha(VV_COLORS.emerald, 0.12) },
};

const AVATAR_COLORS = ['#6C3DE0', '#10B981', '#FF5C5C', '#F59E0B', '#3B82F6', '#EC4899', '#14B8A6'];

interface RevTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const RevTooltip = ({ active, payload, label }: RevTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${VV_COLORS.slate200}`,
      borderRadius: 2,
      p: 1.5,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      minWidth: 140,
    }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={800} sx={{ color: VV_COLORS.violetMid }}>
        {formatINR(payload[0].value)}
      </Typography>
    </Box>
  );
};

export default function VendorDashboardPage() {
  const vendor = (() => {
    try { return JSON.parse(localStorage.getItem('vv-user') ?? '{}'); } catch { return {}; }
  })();
  const storeName: string = vendor?.storeName ?? 'TechVault Electronics';

  const kpis = [
    {
      label: 'Revenue (this month)',
      value: '₹15,47,280',
      sub: '+24% vs last month',
      trend: true,
      icon: <TrendingUp />,
      color: VV_COLORS.violetMid,
    },
    {
      label: 'Total Orders',
      value: '342',
      sub: '+18 this week',
      trend: true,
      icon: <ShoppingBag />,
      color: VV_COLORS.emerald,
    },
    {
      label: 'Active Listings',
      value: '89',
      sub: '12 low stock',
      trend: false,
      icon: <Inventory2 />,
      color: VV_COLORS.amber,
    },
    {
      label: 'Avg Rating',
      value: '4.82',
      sub: '1,240 reviews',
      trend: true,
      icon: <Star />,
      color: VV_COLORS.coral,
    },
  ];

  return (
    <Box>
      {/* Page Header Banner */}
      <Box sx={{
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 55%, #5B6EF5 100%)`,
        borderRadius: 3,
        p: { xs: 3, md: 4 },
        mb: 4,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: -50, right: -50,
          width: 220, height: 220, borderRadius: '50%',
          background: alpha('#fff', 0.05),
        }} />
        <Box sx={{
          position: 'absolute', bottom: -30, right: 100,
          width: 140, height: 140, borderRadius: '50%',
          background: alpha('#fff', 0.04),
        }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{
              bgcolor: alpha('#fff', 0.2),
              width: 60, height: 60,
              backdropFilter: 'blur(8px)',
              border: `2px solid ${alpha('#fff', 0.3)}`,
            }}>
              <Storefront sx={{ fontSize: 30, color: '#fff' }} />
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h5" fontWeight={800} color="#fff" sx={{ letterSpacing: '-0.02em' }}>
                  {storeName}
                </Typography>
                <Chip
                  label="✓ Verified"
                  size="small"
                  sx={{
                    bgcolor: alpha(VV_COLORS.emerald, 0.25),
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 11,
                    height: 22,
                    border: `1px solid ${alpha(VV_COLORS.emerald, 0.5)}`,
                  }}
                />
              </Stack>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), mt: 0.25 }}>
                Vendor Dashboard · Performance overview
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              size="small"
              sx={{
                color: '#fff',
                borderColor: alpha('#fff', 0.4),
                '&:hover': {
                  borderColor: '#fff',
                  bgcolor: alpha('#fff', 0.1),
                },
              }}
            >
              Add Product
            </Button>
            <Button
              variant="contained"
              startIcon={<Storefront />}
              size="small"
              sx={{
                bgcolor: alpha('#fff', 0.2),
                color: '#fff',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${alpha('#fff', 0.3)}`,
                '&:hover': { bgcolor: alpha('#fff', 0.3) },
                boxShadow: 'none',
              }}
            >
              View Store
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        {kpis.map(({ label, value, sub, trend, icon, color }) => (
          <Grid item xs={12} sm={6} lg={3} key={label}>
            <Card sx={{
              background: `linear-gradient(135deg, ${alpha(color, 0.09)} 0%, ${alpha(color, 0.03)} 100%)`,
              border: `1px solid ${alpha(color, 0.18)}`,
              transition: 'all 0.25s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: `0 12px 32px ${alpha(color, 0.2)}`,
              },
            }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 0.5 }}>
                      {label}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                      {value}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5} mt={1}>
                      {trend && <ArrowUpward sx={{ fontSize: 13, color: VV_COLORS.emerald }} />}
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {sub}
                      </Typography>
                    </Stack>
                  </Box>
                  <Avatar sx={{
                    bgcolor: alpha(color, 0.15),
                    width: 50, height: 50,
                    boxShadow: `0 4px 16px ${alpha(color, 0.3)}`,
                  }}>
                    <Box sx={{ color, display: 'flex' }}>{icon}</Box>
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Revenue Bar Chart */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Daily Revenue</Typography>
                  <Typography variant="caption" color="text.secondary">This week · Mon – Sun</Typography>
                </Box>
                <Chip
                  label={`Total: ${formatINRShort(revenueData.reduce((s, d) => s + d.revenue, 0))}`}
                  size="small"
                  sx={{
                    bgcolor: alpha(VV_COLORS.violetMid, 0.1),
                    color: VV_COLORS.violetMid,
                    fontWeight: 700,
                  }}
                />
              </Stack>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    {revenueData.map((_, i) => (
                      <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={VV_COLORS.violetLight} stopOpacity={1} />
                        <stop offset="100%" stopColor={VV_COLORS.violetMid}   stopOpacity={0.8} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={VV_COLORS.slate100} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: VV_COLORS.slate400, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: VV_COLORS.slate400 }}
                    tickFormatter={v => formatINRShort(v as number)}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip content={<RevTooltip />} cursor={{ fill: alpha(VV_COLORS.violetMid, 0.06) }} />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {revenueData.map((_, i) => (
                      <Cell key={i} fill={`url(#barGrad${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={700} mb={2.5}>Top Products</Typography>
              <TableContainer sx={{ flex: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: VV_COLORS.slate50, borderBottom: `2px solid ${VV_COLORS.slate200}` } }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Product
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }} align="right">
                        Sales
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }} align="right">
                        Stock
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topProducts.map((p, i) => (
                      <TableRow
                        key={p.name}
                        hover
                        sx={{
                          '&:hover': { bgcolor: alpha(VV_COLORS.violetMid, 0.04) },
                          '& td': { borderBottom: `1px solid ${VV_COLORS.slate100}`, py: 1.5 },
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <Avatar sx={{
                              width: 36, height: 36,
                              bgcolor: alpha(AVATAR_COLORS[i % AVATAR_COLORS.length], 0.12),
                              fontSize: 18,
                            }}>
                              {p.emoji}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 130 }}>
                                {p.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: VV_COLORS.emerald, fontWeight: 700 }}>
                                {formatINR(p.revenue)}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="text.secondary">
                            {p.sales}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Chip
                              label={p.stock}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: 11,
                                height: 22,
                                bgcolor: p.stock < 20
                                  ? alpha(VV_COLORS.coral, 0.12)
                                  : alpha(VV_COLORS.emerald, 0.12),
                                color: p.stock < 20 ? VV_COLORS.coral : VV_COLORS.emerald,
                              }}
                            />
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, (p.stock / p.maxStock) * 100)}
                              sx={{
                                mt: 0.75,
                                height: 4,
                                borderRadius: 2,
                                bgcolor: VV_COLORS.slate100,
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: p.stock < 20 ? VV_COLORS.coral : VV_COLORS.emerald,
                                },
                              }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Orders — Card-based */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Recent Orders to Fulfill</Typography>
                  <Typography variant="caption" color="text.secondary">Latest orders requiring action</Typography>
                </Box>
                <Button
                  variant="text"
                  size="small"
                  sx={{ color: VV_COLORS.violetMid, fontWeight: 600 }}
                >
                  View all orders
                </Button>
              </Stack>
              <Stack spacing={2}>
                {recentOrders.map((o, i) => {
                  const statusCfg = STATUS_CONFIG[o.status] ?? { color: VV_COLORS.slate600, bg: VV_COLORS.slate100 };
                  return (
                    <Box
                      key={o.id}
                      sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        border: `1px solid ${VV_COLORS.slate200}`,
                        bgcolor: VV_COLORS.slate50,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha(VV_COLORS.violetMid, 0.04),
                          borderColor: alpha(VV_COLORS.violetMid, 0.25),
                          transform: 'translateX(3px)',
                        },
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
                        <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                          <Avatar sx={{
                            bgcolor: alpha(AVATAR_COLORS[i % AVATAR_COLORS.length], 0.15),
                            color: AVATAR_COLORS[i % AVATAR_COLORS.length],
                            width: 44, height: 44,
                            fontWeight: 700,
                            fontSize: 14,
                          }}>
                            {o.initials}
                          </Avatar>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={700} sx={{ color: VV_COLORS.violetMid }}>
                                {o.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">·</Typography>
                              <Typography variant="body2" fontWeight={600}>{o.customer}</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{o.product}</Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="h6" fontWeight={800} sx={{ color: VV_COLORS.slate800 }}>
                            {formatINR(o.amount)}
                          </Typography>
                          <Chip
                            label={o.status}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: 12,
                              bgcolor: statusCfg.bg,
                              color: statusCfg.color,
                              border: `1px solid ${alpha(statusCfg.color, 0.3)}`,
                            }}
                          />
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{
                              borderColor: alpha(VV_COLORS.violetMid, 0.4),
                              color: VV_COLORS.violetMid,
                              fontWeight: 600,
                              '&:hover': {
                                borderColor: VV_COLORS.violetMid,
                                bgcolor: alpha(VV_COLORS.violetMid, 0.06),
                              },
                            }}
                          >
                            Manage
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
