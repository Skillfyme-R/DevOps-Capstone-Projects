import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Select,
  MenuItem, FormControl, InputLabel, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Avatar, alpha,
} from '@mui/material';
import {
  TrendingUp, ShoppingCart, Store, LocalOffer,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { VV_COLORS } from '../styles/theme';
import { formatINR, formatINRShort } from '../utils/currency';

const salesTrend = [
  { month: 'Jan', orders: 320,  revenue: 2419200  },
  { month: 'Feb', orders: 280,  revenue: 2116800  },
  { month: 'Mar', orders: 450,  revenue: 3402000  },
  { month: 'Apr', orders: 390,  revenue: 2948400  },
  { month: 'May', orders: 520,  revenue: 3931200  },
  { month: 'Jun', orders: 610,  revenue: 4611600  },
];

const totalGMV = 19428600;

const categoryRevenue = [
  { name: 'Electronics', value: 48, amount: Math.round(totalGMV * 0.48) },
  { name: 'Fashion',     value: 22, amount: Math.round(totalGMV * 0.22) },
  { name: 'Home',        value: 15, amount: Math.round(totalGMV * 0.15) },
  { name: 'Sports',      value: 9,  amount: Math.round(totalGMV * 0.09) },
  { name: 'Other',       value: 6,  amount: Math.round(totalGMV * 0.06) },
];

const topVendors = [
  { rank: 1, name: 'SoundWave Store', orders: 1240, revenue: 15624000, rating: 4.9 },
  { rank: 2, name: 'EcoThreads',      orders: 980,  revenue: 4939200,  rating: 4.7 },
  { rank: 3, name: 'LuminaHome',      orders: 870,  revenue: 3069360,  rating: 4.8 },
  { rank: 4, name: 'PureHydration',   orders: 760,  revenue: 1564080,  rating: 4.6 },
  { rank: 5, name: 'KeyTech',         orders: 640,  revenue: 4838400,  rating: 4.5 },
];

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

const MEDAL_LABEL: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const kpis = [
  {
    label: 'Gross Merchandise Value',
    value: '₹1,94,28,600',
    change: '+24%',
    positive: true,
    icon: <TrendingUp />,
    color: VV_COLORS.violetMid,
  },
  {
    label: 'Total Orders',
    value: '2,570',
    change: '+18%',
    positive: true,
    icon: <ShoppingCart />,
    color: VV_COLORS.emerald,
  },
  {
    label: 'Active Vendors',
    value: '1,240',
    change: '+32%',
    positive: true,
    icon: <Store />,
    color: '#3B82F6',
  },
  {
    label: 'Avg Order Value',
    value: '₹7,560',
    change: '+5%',
    positive: true,
    icon: <LocalOffer />,
    color: VV_COLORS.amber,
  },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const RevenueTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${VV_COLORS.slate200}`,
      borderRadius: 2,
      p: 1.5,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      minWidth: 160,
    }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {label}
      </Typography>
      {payload.map((entry) => (
        <Stack key={entry.name} direction="row" justifyContent="space-between" spacing={2} mb={0.5}>
          <Typography variant="caption" sx={{ color: entry.color, fontWeight: 600 }}>
            {entry.name}
          </Typography>
          <Typography variant="caption" fontWeight={700}>
            {entry.name === 'Revenue' ? formatINR(entry.value) : entry.value.toLocaleString()}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
};

const PieTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: `1px solid ${VV_COLORS.slate200}`,
      borderRadius: 2,
      p: 1.5,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    }}>
      <Typography variant="caption" fontWeight={700}>{d.name}</Typography>
      <Typography variant="caption" display="block" color="text.secondary">{d.value}% of revenue</Typography>
    </Box>
  );
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('6m');

  return (
    <Box>
      {/* Page Header Banner */}
      <Box sx={{
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 60%, ${VV_COLORS.violetLight} 100%)`,
        borderRadius: 3,
        p: { xs: 3, md: 4 },
        mb: 4,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: alpha('#ffffff', 0.06),
        }} />
        <Box sx={{
          position: 'absolute', bottom: -60, right: 120,
          width: 160, height: 160, borderRadius: '50%',
          background: alpha('#ffffff', 0.04),
        }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{
              bgcolor: alpha('#ffffff', 0.2),
              width: 56, height: 56,
              backdropFilter: 'blur(8px)',
            }}>
              <TrendingUp sx={{ fontSize: 28, color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#fff" sx={{ letterSpacing: '-0.02em' }}>
                Marketplace Analytics
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.75), mt: 0.25 }}>
                Platform-wide performance insights · Real-time data
              </Typography>
            </Box>
          </Stack>
          <FormControl size="small" sx={{
            minWidth: 160,
            '& .MuiOutlinedInput-root': {
              bgcolor: alpha('#fff', 0.15),
              backdropFilter: 'blur(8px)',
              color: '#fff',
              borderRadius: 2,
              '& fieldset': { borderColor: alpha('#fff', 0.3) },
              '&:hover fieldset': { borderColor: alpha('#fff', 0.6) },
            },
            '& .MuiInputLabel-root': { color: alpha('#fff', 0.8) },
            '& .MuiSelect-icon': { color: '#fff' },
          }}>
            <InputLabel>Period</InputLabel>
            <Select value={period} label="Period" onChange={e => setPeriod(e.target.value)}>
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="1m">Last month</MenuItem>
              <MenuItem value="3m">Last 3 months</MenuItem>
              <MenuItem value="6m">Last 6 months</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Mini stat strip */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} mt={3}>
          {[
            { label: 'GMV', value: '₹19.4 Cr' },
            { label: 'Orders', value: '2,570' },
            { label: 'Vendors', value: '1,240' },
            { label: 'AOV', value: '₹7,560' },
          ].map(s => (
            <Box key={s.label}>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.65), fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {s.label}
              </Typography>
              <Typography variant="h6" fontWeight={800} color="#fff">{s.value}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        {kpis.map(({ label, value, change, positive, icon, color }) => (
          <Grid item xs={12} sm={6} lg={3} key={label}>
            <Card sx={{
              background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.03)} 100%)`,
              border: `1px solid ${alpha(color, 0.2)}`,
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
                    <Chip
                      label={`↑ ${change} vs last period`}
                      size="small"
                      sx={{
                        mt: 1.5,
                        height: 22,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: alpha(positive ? VV_COLORS.emerald : VV_COLORS.coral, 0.12),
                        color: positive ? VV_COLORS.emerald : VV_COLORS.coral,
                      }}
                    />
                  </Box>
                  <Avatar sx={{
                    bgcolor: alpha(color, 0.15),
                    width: 52, height: 52,
                    boxShadow: `0 4px 14px ${alpha(color, 0.25)}`,
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
        {/* Revenue & Orders Trend Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Revenue & Orders Trend</Typography>
                  <Typography variant="caption" color="text.secondary">Jan – Jun 2024</Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 12, height: 3, bgcolor: VV_COLORS.violetMid, borderRadius: 1 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Revenue</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 12, height: 3, bgcolor: VV_COLORS.coral, borderRadius: 1 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Orders</Typography>
                  </Stack>
                </Stack>
              </Stack>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={salesTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revGradFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={VV_COLORS.violetMid} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={VV_COLORS.violetMid} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ordGradFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={VV_COLORS.coral} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={VV_COLORS.coral} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={VV_COLORS.slate100} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: VV_COLORS.slate400, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: VV_COLORS.slate400 }}
                    tickFormatter={v => formatINRShort(v as number)}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: VV_COLORS.coral }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={VV_COLORS.violetMid}
                    fill="url(#revGradFill)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, fill: VV_COLORS.violetMid, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke={VV_COLORS.coral}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: VV_COLORS.coral, stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Pie Chart */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Revenue by Category</Typography>
              <Typography variant="caption" color="text.secondary" mb={2} display="block">
                Share of total GMV
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryRevenue}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {categoryRevenue.map((_, i) => (
                      <Cell key={i} fill={VV_COLORS.chart[i % VV_COLORS.chart.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <Stack spacing={1.5} mt="auto">
                {categoryRevenue.map(({ name, value, amount }, i) => (
                  <Stack key={name} direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{
                        width: 10, height: 10, borderRadius: '50%',
                        bgcolor: VV_COLORS.chart[i],
                        flexShrink: 0,
                      }} />
                      <Typography variant="body2" fontWeight={500}>{name}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {formatINRShort(amount)}
                      </Typography>
                      <Chip
                        label={`${value}%`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: alpha(VV_COLORS.chart[i], 0.12),
                          color: VV_COLORS.chart[i],
                        }}
                      />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Vendors Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Top Performing Vendors</Typography>
                  <Typography variant="caption" color="text.secondary">Ranked by total revenue this period</Typography>
                </Box>
                <Chip
                  label="Top 5"
                  size="small"
                  sx={{
                    bgcolor: alpha(VV_COLORS.violetMid, 0.1),
                    color: VV_COLORS.violetMid,
                    fontWeight: 700,
                  }}
                />
              </Stack>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: VV_COLORS.slate50, borderBottom: `2px solid ${VV_COLORS.slate200}` } }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', width: 72 }}>
                        Rank
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Vendor
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }} align="right">
                        Orders
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }} align="right">
                        Revenue
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }} align="center">
                        Rating
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topVendors.map(v => (
                      <TableRow
                        key={v.rank}
                        hover
                        sx={{
                          transition: 'background 0.15s',
                          '&:hover': { bgcolor: alpha(VV_COLORS.violetMid, 0.04) },
                          '& td': { borderBottom: `1px solid ${VV_COLORS.slate100}` },
                        }}
                      >
                        <TableCell>
                          {v.rank <= 3 ? (
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 36, height: 36, borderRadius: '50%',
                              bgcolor: alpha(MEDAL_COLORS[v.rank], 0.15),
                              border: `2px solid ${alpha(MEDAL_COLORS[v.rank], 0.4)}`,
                              fontSize: 18,
                            }}>
                              {MEDAL_LABEL[v.rank]}
                            </Box>
                          ) : (
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 36, height: 36, borderRadius: '50%',
                              bgcolor: VV_COLORS.slate100,
                            }}>
                              <Typography variant="body2" fontWeight={700} color="text.secondary">
                                {v.rank}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{
                              width: 38, height: 38,
                              bgcolor: alpha(VV_COLORS.violetMid, 0.12),
                              color: VV_COLORS.violetMid,
                              fontSize: 14,
                              fontWeight: 700,
                            }}>
                              {v.name.slice(0, 2).toUpperCase()}
                            </Avatar>
                            <Typography fontWeight={600}>{v.name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} color="text.secondary">
                            {v.orders.toLocaleString('en-IN')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={800} sx={{ color: VV_COLORS.violetMid }}>
                            {formatINR(v.revenue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`⭐ ${v.rating}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: alpha(VV_COLORS.emerald, 0.12),
                              color: VV_COLORS.emeraldDark,
                              fontSize: 12,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
