import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Avatar,
  LinearProgress, Button, Divider, alpha, IconButton,
} from '@mui/material';
import {
  ShoppingCart, LocalShipping, Favorite, TrendingUp,
  ArrowUpward, Storefront, ArrowForward,
  GridView, Person, ArrowDownward, CalendarToday,
  OpenInNew, Inventory2,
} from '@mui/icons-material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { VV_COLORS } from '../styles/theme';
import { formatINR, formatINRShort } from '../utils/currency';

const spendData = [
  { month: 'Jan', spend: 26800 },
  { month: 'Feb', spend: 15100 },
  { month: 'Mar', spend: 45350 },
  { month: 'Apr', spend: 24350 },
  { month: 'May', spend: 56280 },
  { month: 'Jun', spend: 35280 },
];

const recentOrders = [
  { id: 'VV-10421', product: 'Wireless Noise-Cancelling Headphones', vendor: 'SoundWave Store', status: 'Delivered',  amount: 12499, color: 'success' as const, emoji: '🎧' },
  { id: 'VV-10389', product: 'Organic Cotton Joggers (M)',           vendor: 'EcoThreads',     status: 'Shipped',    amount: 4999,  color: 'info'    as const, emoji: '👕' },
  { id: 'VV-10371', product: 'Smart LED Desk Lamp',                  vendor: 'LuminaHome',     status: 'Processing', amount: 3499,  color: 'warning' as const, emoji: '💡' },
  { id: 'VV-10350', product: 'Steel Water Bottle 32oz',              vendor: 'PureHydration',  status: 'Delivered',  amount: 1999,  color: 'success' as const, emoji: '🫙' },
];

const categories = [
  { name: 'Electronics', pct: 42, color: VV_COLORS.violetMid,  amount: '₹85,327' },
  { name: 'Fashion',     pct: 28, color: VV_COLORS.coral,      amount: '₹56,885' },
  { name: 'Home',        pct: 18, color: VV_COLORS.emerald,    amount: '₹36,569' },
  { name: 'Other',       pct: 12, color: VV_COLORS.amber,      amount: '₹24,379' },
];

const quickActions = [
  { label: 'Browse Catalog', icon: <GridView />,   color: VV_COLORS.violetMid, route: '/catalog' },
  { label: 'My Orders',      icon: <Inventory2 />, color: VV_COLORS.emerald,   route: '/orders'  },
  { label: 'Wishlist',       icon: <Favorite />,   color: VV_COLORS.coral,     route: '/wishlist' },
  { label: 'Profile',        icon: <Person />,     color: VV_COLORS.amber,     route: '/profile'  },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  Delivered:  { bg: alpha(VV_COLORS.emerald, 0.12), text: VV_COLORS.emerald   },
  Shipped:    { bg: alpha('#3B82F6',          0.12), text: '#3B82F6'           },
  Processing: { bg: alpha(VV_COLORS.amber,    0.12), text: VV_COLORS.amberDark },
};

const user = JSON.parse(localStorage.getItem('vv-user') ?? '{"name":"Shopper"}');

const todayLabel = new Date().toLocaleDateString('en-IN', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  up: boolean;
  trend?: string;
}

const StatCard = ({ label, value, sub, icon, color, up, trend }: StatCardProps) => (
  <Card sx={{
    borderLeft: `4px solid ${color}`,
    background: `linear-gradient(135deg, ${alpha(color, 0.06)} 0%, transparent 60%)`,
    border: `1px solid ${alpha(color, 0.18)}`,
    borderLeftWidth: 4,
    borderLeftColor: color,
    transition: 'all 0.22s ease',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: `0 12px 32px ${alpha(color, 0.22)}`,
      borderColor: alpha(color, 0.35),
      borderLeftColor: color,
    },
  }}>
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5 }}
          >
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800} mt={0.5} mb={0.75} sx={{ letterSpacing: '-0.02em' }}>
            {value}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Chip
              size="small"
              icon={up
                ? <ArrowUpward sx={{ fontSize: '11px !important' }} />
                : <ArrowDownward sx={{ fontSize: '11px !important' }} />
              }
              label={trend ?? sub}
              sx={{
                height: 20,
                fontSize: 10.5,
                fontWeight: 700,
                bgcolor: up ? alpha(VV_COLORS.emerald, 0.12) : alpha(VV_COLORS.slate400, 0.12),
                color: up ? VV_COLORS.emerald : VV_COLORS.slate600,
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
            {!trend && (
              <Typography variant="caption" color="text.secondary">{sub}</Typography>
            )}
          </Stack>
        </Box>
        <Avatar sx={{
          bgcolor: alpha(color, 0.13),
          color,
          width: 50,
          height: 50,
          borderRadius: '15px',
          boxShadow: `0 4px 16px ${alpha(color, 0.28)}`,
          flexShrink: 0,
        }}>
          {icon}
        </Avatar>
      </Stack>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${VV_COLORS.slate200}`,
      borderRadius: 2,
      p: 1.5,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      minWidth: 130,
    }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={800} color={VV_COLORS.violetMid} mt={0.25}>
        {formatINR(payload[0].value)}
      </Typography>
    </Box>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] ?? 'Shopper';

  return (
    <Box>
      {/* ── Welcome Hero Banner ───────────────────────────────────────── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 55%, ${VV_COLORS.violetLight} 100%)`,
        borderRadius: 3,
        p: { xs: 3, md: 4 },
        mb: 4,
        position: 'relative',
        overflow: 'visible',
      }}>
        {/* Decorative orbs — clipped separately so they don't bleed outside */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: 3,
          overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
        }}>
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', bgcolor: alpha('#fff', 0.07) }} />
          <Box sx={{ position: 'absolute', bottom: -60, right: 120, width: 160, height: 160, borderRadius: '50%', bgcolor: alpha('#fff', 0.05) }} />
          <Box sx={{ position: 'absolute', top: '20%', left: '55%', width: 100, height: 100, borderRadius: '50%', bgcolor: alpha('#fff', 0.03) }} />
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={3}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          {/* Left: user info */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
              <Avatar sx={{
                bgcolor: alpha('#fff', 0.18),
                width: 50, height: 50, fontSize: 22, fontWeight: 800,
                border: `2px solid ${alpha('#fff', 0.35)}`,
                boxShadow: `0 4px 16px ${alpha(VV_COLORS.violetDeep, 0.4)}`,
              }}>
                {firstName.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{
                  color: alpha('#fff', 0.65), fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10,
                }}>
                  Welcome back
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {firstName}!
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.75} mt={0.5} mb={0.75}>
              <CalendarToday sx={{ fontSize: 13, color: alpha('#fff', 0.55) }} />
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.65) }}>{todayLabel}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: alpha('#fff', 0.78), lineHeight: 1.5 }}>
              You have <strong style={{ color: '#fff' }}>2 shipments</strong> arriving this week and{' '}
              <strong style={{ color: '#fff' }}>4 wishlist items</strong> on sale.
            </Typography>
          </Box>

          {/* Right: action buttons */}
          <Stack direction="row" spacing={1.5} flexShrink={0} flexWrap="wrap" sx={{ rowGap: 1 }}>
            <Button
              variant="outlined"
              endIcon={<GridView />}
              onClick={() => navigate('/catalog')}
              sx={{
                color: '#fff',
                borderColor: alpha('#fff', 0.45),
                borderWidth: '1.5px',
                fontWeight: 700,
                px: 2.5,
                backdropFilter: 'blur(8px)',
                bgcolor: alpha('#fff', 0.1),
                '&:hover': {
                  bgcolor: alpha('#fff', 0.2),
                  borderColor: '#fff',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.18s ease',
              }}
            >
              Browse
            </Button>
            <Button
              variant="contained"
              endIcon={<Inventory2 />}
              onClick={() => navigate('/orders')}
              sx={{
                background: '#ffffff !important',
                color: `${VV_COLORS.violetMid} !important`,
                fontWeight: 700,
                px: 2.5,
                boxShadow: `0 4px 20px ${alpha('#000', 0.25)} !important`,
                '&:hover': {
                  background: '#f0ebff !important',
                  transform: 'translateY(-1px)',
                  boxShadow: `0 6px 28px ${alpha('#000', 0.32)} !important`,
                },
                transition: 'all 0.18s ease',
              }}
            >
              View Orders
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} mb={4}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Total Orders" value="24" sub="+3 this month" trend="+14.3%" icon={<ShoppingCart />} color={VV_COLORS.violetMid} up />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="In Transit" value="2" sub="Expected by Friday" icon={<LocalShipping />} color={VV_COLORS.emerald} up={false} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Wishlist" value="17" sub="4 items on sale" icon={<Favorite />} color={VV_COLORS.coral} up={false} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Total Spent" value={formatINRShort(203160)} sub="+18% vs last month" trend="+18%" icon={<TrendingUp />} color={VV_COLORS.amber} up />
        </Grid>
      </Grid>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <Box mb={4}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="body1" fontWeight={700} color="text.primary" sx={{ letterSpacing: '-0.01em' }}>
            Quick Actions
          </Typography>
          <Divider sx={{ flex: 1, mx: 2 }} />
        </Stack>
        <Grid container spacing={2}>
          {quickActions.map(({ label, icon, color, route }) => (
            <Grid item xs={6} sm={3} key={label}>
              <Card
                onClick={() => navigate(route)}
                sx={{
                  cursor: 'pointer',
                  border: `1px solid ${alpha(color, 0.15)}`,
                  background: `linear-gradient(135deg, ${alpha(color, 0.06)} 0%, transparent 70%)`,
                  transition: 'all 0.22s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 10px 28px ${alpha(color, 0.22)}`,
                    borderColor: alpha(color, 0.35),
                  },
                }}
              >
                <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                  <Avatar sx={{
                    bgcolor: alpha(color, 0.13),
                    color,
                    width: 44,
                    height: 44,
                    borderRadius: '13px',
                    mx: 'auto',
                    mb: 1,
                    boxShadow: `0 4px 12px ${alpha(color, 0.22)}`,
                  }}>
                    {icon}
                  </Avatar>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: 12.5 }}>{label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Charts Row ────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="body1" fontWeight={700} color="text.primary" sx={{ letterSpacing: '-0.01em' }}>
          Spending Analytics
        </Typography>
        <Divider sx={{ flex: 1, mx: 2 }} />
      </Stack>
      <Grid container spacing={2.5} mb={4}>
        {/* Area Chart */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: '100%', '&:hover': { boxShadow: `0 12px 36px ${alpha(VV_COLORS.violetMid, 0.12)}` } }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                    Monthly Spending
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Jan – Jun 2025 · All categories</Typography>
                </Box>
                <Chip
                  label="+18% vs last period"
                  size="small"
                  icon={<ArrowUpward sx={{ fontSize: '11px !important' }} />}
                  sx={{
                    bgcolor: alpha(VV_COLORS.emerald, 0.1),
                    color: VV_COLORS.emerald,
                    fontWeight: 700,
                    fontSize: 11,
                    '& .MuiChip-icon': { color: VV_COLORS.emerald },
                  }}
                />
              </Stack>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={spendData} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={VV_COLORS.violetMid} stopOpacity={0.30} />
                      <stop offset="60%"  stopColor={VV_COLORS.violetMid} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={VV_COLORS.violetMid} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(VV_COLORS.slate400, 0.18)} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: VV_COLORS.slate600, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11.5, fill: VV_COLORS.slate600 }}
                    tickFormatter={v => formatINRShort(v as number)}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke={VV_COLORS.violetMid}
                    fill="url(#spendGrad)"
                    strokeWidth={2.5}
                    dot={{ r: 4.5, fill: '#fff', strokeWidth: 2.5, stroke: VV_COLORS.violetMid }}
                    activeDot={{ r: 6, fill: VV_COLORS.violetMid, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Category breakdown */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%', '&:hover': { boxShadow: `0 12px 36px ${alpha(VV_COLORS.violetMid, 0.10)}` } }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                    By Category
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Based on your order history</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <OpenInNew fontSize="small" />
                </IconButton>
              </Stack>
              <Stack spacing={2.75}>
                {categories.map(({ name, pct, color, amount }) => (
                  <Box key={name}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{
                          width: 10, height: 10, borderRadius: '3px',
                          bgcolor: color,
                          boxShadow: `0 0 6px ${alpha(color, 0.5)}`,
                        }} />
                        <Typography variant="body2" fontWeight={600}>{name}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{pct}%</Typography>
                        <Typography variant="body2" fontWeight={700}>{amount}</Typography>
                      </Stack>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 7,
                        borderRadius: 4,
                        bgcolor: alpha(color, 0.10),
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(90deg, ${alpha(color, 0.7)} 0%, ${color} 100%)`,
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Recent Orders ─────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="body1" fontWeight={700} color="text.primary" sx={{ letterSpacing: '-0.01em' }}>
          Recent Orders
        </Typography>
        <Divider sx={{ flex: 1, mx: 2 }} />
        <Button
          variant="outlined"
          size="small"
          endIcon={<ArrowForward />}
          onClick={() => navigate('/orders')}
          sx={{ flexShrink: 0 }}
        >
          View all
        </Button>
      </Stack>

      <Card sx={{ '&:hover': { boxShadow: `0 12px 36px ${alpha(VV_COLORS.violetMid, 0.08)}` } }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {recentOrders.map((order, idx) => (
            <Box
              key={order.id}
              sx={{
                borderBottom: idx < recentOrders.length - 1 ? `1px solid ${alpha(VV_COLORS.slate400, 0.12)}` : 'none',
                transition: 'background 0.15s ease',
                '&:hover': { bgcolor: alpha(VV_COLORS.violetMid, 0.025) },
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                px={3}
                py={2.25}
                spacing={2}
              >
                {/* Left: emoji avatar + order info */}
                <Stack direction="row" spacing={2} alignItems="center" flex={1} minWidth={0}>
                  <Avatar sx={{
                    bgcolor: alpha(VV_COLORS.violetMid, 0.08),
                    width: 44,
                    height: 44,
                    borderRadius: '13px',
                    fontSize: 20,
                    flexShrink: 0,
                    border: `1px solid ${alpha(VV_COLORS.violetMid, 0.12)}`,
                  }}>
                    {order.emoji}
                  </Avatar>
                  <Box minWidth={0} flex={1}>
                    <Stack direction="row" spacing={1.25} alignItems="center" mb={0.3} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={700} color={VV_COLORS.violetMid}>
                        {order.id}
                      </Typography>
                      <Box sx={{
                        px: 1, py: 0.25, borderRadius: '6px',
                        bgcolor: statusColors[order.status]?.bg ?? alpha(VV_COLORS.slate400, 0.1),
                        display: 'inline-block',
                      }}>
                        <Typography sx={{
                          fontSize: 10.5, fontWeight: 700,
                          color: statusColors[order.status]?.text ?? VV_COLORS.slate600,
                          lineHeight: 1,
                        }}>
                          {order.status}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: { xs: 220, md: 380 } }}>
                      {order.product}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" mt={0.2}>
                      <Storefront sx={{ fontSize: 11, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">{order.vendor}</Typography>
                    </Stack>
                  </Box>
                </Stack>

                {/* Right: amount + action */}
                <Stack direction="row" alignItems="center" spacing={2} flexShrink={0}>
                  <Typography variant="h6" fontWeight={800} sx={{ color: VV_COLORS.slate800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                    {formatINR(order.amount)}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    endIcon={<ArrowForward sx={{ fontSize: '12px !important' }} />}
                    sx={{ fontSize: 11.5, py: 0.5, px: 1.5, whiteSpace: 'nowrap' }}
                    onClick={() => navigate('/orders')}
                  >
                    Details
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* ── Bottom spacer ─────────────────────────────────────────────── */}
      <Box pb={4} />
    </Box>
  );
}
