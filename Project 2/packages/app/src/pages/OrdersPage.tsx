import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Chip, Button,
  TextField, InputAdornment, Avatar, Grid,
  alpha,
} from '@mui/material';
import {
  Search, Visibility, LocalShipping, ShoppingBag,
  CheckCircle, HourglassEmpty, CancelOutlined, Replay,
  Inventory2,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatINR } from '../utils/currency';
import { VV_COLORS } from '../styles/theme';

const ORDERS = [
  { id: 'VV-10421', date: '2025-06-10', items: 2, total: 12599, status: 'Delivered',  vendor: 'SoundWave Store' },
  { id: 'VV-10389', date: '2025-06-08', items: 1, total: 4999,  status: 'Shipped',    vendor: 'EcoThreads' },
  { id: 'VV-10371', date: '2025-06-05', items: 3, total: 10697, status: 'Processing', vendor: 'LuminaHome' },
  { id: 'VV-10350', date: '2025-05-29', items: 1, total: 1999,  status: 'Delivered',  vendor: 'PureHydration' },
  { id: 'VV-10322', date: '2025-05-20', items: 4, total: 26196, status: 'Cancelled',  vendor: 'KeyTech' },
  { id: 'VV-10301', date: '2025-05-15', items: 1, total: 2699,  status: 'Returned',   vendor: 'GlowLab' },
];

const STATUS_META: Record<string, {
  color: 'success' | 'info' | 'warning' | 'error' | 'default';
  borderColor: string;
  icon: React.ReactNode;
}> = {
  Delivered:  { color: 'success', borderColor: VV_COLORS.emerald,      icon: <CheckCircle fontSize="small" /> },
  Shipped:    { color: 'info',    borderColor: '#3B82F6',               icon: <LocalShipping fontSize="small" /> },
  Processing: { color: 'warning', borderColor: VV_COLORS.amber,         icon: <HourglassEmpty fontSize="small" /> },
  Cancelled:  { color: 'error',   borderColor: VV_COLORS.coral,         icon: <CancelOutlined fontSize="small" /> },
  Returned:   { color: 'default', borderColor: VV_COLORS.slate400,      icon: <Replay fontSize="small" /> },
};

const VENDOR_COLORS: Record<string, string> = {
  'SoundWave Store': VV_COLORS.violetMid,
  'EcoThreads':      VV_COLORS.emerald,
  'LuminaHome':      VV_COLORS.amber,
  'PureHydration':   '#3B82F6',
  'KeyTech':         VV_COLORS.coral,
  'GlowLab':         '#EC4899',
};

const TOTAL_SPENT = ORDERS.reduce((sum, o) => sum + o.total, 0);
const THIS_MONTH_COUNT = ORDERS.filter(o => o.date.startsWith('2025-06')).length;

const STATUS_COUNTS: Record<string, number> = ORDERS.reduce((acc, o) => {
  acc[o.status] = (acc[o.status] ?? 0) + 1;
  return acc;
}, {} as Record<string, number>);

export default function OrdersPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');

  const filtered = ORDERS.filter(o =>
    (activeStatus === 'All' || o.status === activeStatus) &&
    (o.id.toLowerCase().includes(query.toLowerCase()) ||
      o.vendor.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <Box>
      {/* ── Hero Banner ── */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 60%, ${VV_COLORS.violetLight} 100%)`,
          borderRadius: 3,
          p: { xs: 3, md: 4 },
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -60,
            right: -60,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: alpha('#fff', 0.05),
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -80,
            right: 80,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: alpha('#fff', 0.04),
          },
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3}>
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Box
              sx={{
                width: 56, height: 56, borderRadius: 2.5,
                background: alpha('#fff', 0.15),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ShoppingBag sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#fff" letterSpacing="-0.5px">
                My Orders
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.75), mt: 0.25 }}>
                Track, manage, and review all your purchases
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap">
            {[
              { label: 'Total Orders', value: ORDERS.length },
              { label: 'Total Spent', value: formatINR(TOTAL_SPENT) },
              { label: 'This Month', value: THIS_MONTH_COUNT },
            ].map(stat => (
              <Box
                key={stat.label}
                sx={{
                  bgcolor: alpha('#fff', 0.12),
                  borderRadius: 2,
                  px: 2.5,
                  py: 1.5,
                  minWidth: 100,
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${alpha('#fff', 0.15)}`,
                }}
              >
                <Typography variant="h6" fontWeight={800} color="#fff">
                  {stat.value}
                </Typography>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.7), fontWeight: 500 }}>
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Box>

      {/* ── Status Summary Filter Chips ── */}
      <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap" sx={{ rowGap: 1 }}>
        <Chip
          label={`All  ${ORDERS.length}`}
          onClick={() => setActiveStatus('All')}
          variant={activeStatus === 'All' ? 'filled' : 'outlined'}
          sx={{
            fontWeight: 700,
            bgcolor: activeStatus === 'All' ? VV_COLORS.violetMid : 'transparent',
            color: activeStatus === 'All' ? '#fff' : VV_COLORS.slate700,
            borderColor: VV_COLORS.violetMid,
            '&:hover': { bgcolor: activeStatus === 'All' ? VV_COLORS.violetMid : alpha(VV_COLORS.violetMid, 0.08) },
            cursor: 'pointer',
          }}
        />
        {Object.entries(STATUS_COUNTS).map(([status, count]) => {
          const meta = STATUS_META[status];
          const isActive = activeStatus === status;
          return (
            <Chip
              key={status}
              icon={meta?.icon as React.ReactElement}
              label={`${status}  ${count}`}
              color={meta?.color}
              onClick={() => setActiveStatus(status)}
              variant={isActive ? 'filled' : 'outlined'}
              sx={{
                fontWeight: 700,
                cursor: 'pointer',
                opacity: isActive ? 1 : 0.75,
                '&:hover': { opacity: 1 },
              }}
            />
          );
        })}
      </Stack>

      {/* ── Search + Filter Row ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={4}>
        <TextField
          placeholder="Search by order ID or vendor…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: VV_COLORS.slate400 }} />
              </InputAdornment>
            ),
          }}
          size="small"
          sx={{ flex: 1 }}
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
        >
          {filtered.length} of {ORDERS.length} orders
        </Typography>
      </Stack>

      {/* ── Order Cards ── */}
      {filtered.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center', py: 12,
            border: `2px dashed ${VV_COLORS.slate200}`,
            borderRadius: 3,
            bgcolor: VV_COLORS.slate50,
          }}
        >
          <Typography fontSize={56} mb={1}>📦</Typography>
          <Typography variant="h5" fontWeight={700} mb={1}>No orders found</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Try adjusting your search term or status filter.
          </Typography>
          <Button
            variant="contained"
            onClick={() => { setQuery(''); setActiveStatus('All'); }}
          >
            Clear Filters
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {filtered.map(order => {
            const meta = STATUS_META[order.status];
            const vendorColor = VENDOR_COLORS[order.vendor] ?? VV_COLORS.violetMid;
            const isShipped = order.status === 'Shipped' || order.status === 'Processing';

            return (
              <Card
                key={order.id}
                sx={{
                  borderLeft: `4px solid ${meta?.borderColor ?? VV_COLORS.slate300}`,
                  transition: 'all 0.22s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 32px ${alpha(meta?.borderColor ?? VV_COLORS.violetMid, 0.18)}`,
                  },
                }}
              >
                <CardContent sx={{ py: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Grid container alignItems="center" spacing={2}>
                    {/* Left: vendor avatar + order info */}
                    <Grid item xs={12} sm={5}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          sx={{
                            width: 46, height: 46,
                            bgcolor: alpha(vendorColor, 0.12),
                            color: vendorColor,
                            fontWeight: 800,
                            fontSize: 18,
                            border: `2px solid ${alpha(vendorColor, 0.25)}`,
                          }}
                        >
                          {order.vendor[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight={700} color={VV_COLORS.violetMid}>
                            {order.id}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            {order.vendor}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(order.date).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Center: items chip + amount */}
                    <Grid item xs={6} sm={3}>
                      <Stack spacing={0.75}>
                        <Chip
                          icon={<Inventory2 sx={{ fontSize: '14px !important' }} />}
                          label={`${order.items} item${order.items > 1 ? 's' : ''}`}
                          size="small"
                          sx={{
                            width: 'fit-content',
                            bgcolor: alpha(VV_COLORS.violetMid, 0.08),
                            color: VV_COLORS.violetMid,
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: VV_COLORS.violetMid },
                          }}
                        />
                        <Typography variant="h6" fontWeight={800} color={VV_COLORS.slate800}>
                          {formatINR(order.total)}
                        </Typography>
                      </Stack>
                    </Grid>

                    {/* Right: status chip + action buttons */}
                    <Grid item xs={6} sm={4}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-end', md: 'center' }} justifyContent={{ md: 'flex-end' }}>
                        <Chip
                          icon={meta?.icon as React.ReactElement}
                          label={order.status}
                          color={meta?.color}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                        <Stack direction="row" spacing={0.75}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => navigate(`/orders/${order.id}`)}
                            sx={{ fontSize: '0.75rem', py: 0.625 }}
                          >
                            View
                          </Button>
                          {isShipped && (
                            <Button
                              size="small"
                              variant="contained"
                              color="info"
                              startIcon={<LocalShipping />}
                              onClick={() => navigate(`/orders/${order.id}`)}
                              sx={{ fontSize: '0.75rem', py: 0.625 }}
                            >
                              Track
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
