import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Button, IconButton,
  Divider, TextField, Chip, Avatar, LinearProgress, alpha,
} from '@mui/material';
import {
  Add, Remove, Delete, ArrowForward,
  LocalOffer, LocalShipping, Receipt, Percent,
  Lock, CheckCircle, Star,
} from '@mui/icons-material';
import { useCartStore } from '../hooks/useCart';
import { VV_COLORS } from '../styles/theme';
import { formatINR } from '../utils/currency';

const FREE_SHIPPING_THRESHOLD = 4000;

const suggestedChips = [
  { label: 'AirPods Pro', emoji: '🎵' },
  { label: 'Yoga Mat',    emoji: '🧘' },
  { label: 'Kindle',      emoji: '📖' },
];

function getProductEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('headphone') || n.includes('audio') || n.includes('earphone') || n.includes('airpod')) return '🎧';
  if (n.includes('lamp') || n.includes('light') || n.includes('bulb')) return '💡';
  if (n.includes('bottle') || n.includes('water') || n.includes('hydrat')) return '🫙';
  if (n.includes('shoe') || n.includes('sneaker') || n.includes('boot')) return '👟';
  if (n.includes('shirt') || n.includes('jogger') || n.includes('tshirt') || n.includes('cotton')) return '👕';
  if (n.includes('laptop') || n.includes('computer') || n.includes('mac')) return '💻';
  if (n.includes('phone') || n.includes('mobile') || n.includes('iphone')) return '📱';
  if (n.includes('book') || n.includes('kindle')) return '📖';
  if (n.includes('bag') || n.includes('backpack')) return '🎒';
  if (n.includes('watch') || n.includes('band')) return '⌚';
  return '📦';
}

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, subtotal, total, couponCode, discount, setCoupon } = useCartStore();
  const [couponInput, setCouponInput] = React.useState('');
  const [couponError, setCouponError] = React.useState(false);

  const applyCoupon = () => {
    if (couponInput.toUpperCase() === 'SAVE10') {
      setCoupon('SAVE10', subtotal() * 0.10);
      setCouponError(false);
    } else {
      setCouponError(true);
    }
  };

  if (items.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', py: 12, textAlign: 'center',
        }}
      >
        <Box sx={{
          width: 120, height: 120, borderRadius: '36px',
          bgcolor: alpha(VV_COLORS.violetMid, 0.08),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mb: 3, mx: 'auto',
          border: `2px dashed ${alpha(VV_COLORS.violetMid, 0.2)}`,
        }}>
          <Typography sx={{ fontSize: 52 }}>🛒</Typography>
        </Box>
        <Typography variant="h5" fontWeight={800} mb={1} sx={{ letterSpacing: '-0.02em' }}>
          Your cart is empty
        </Typography>
        <Typography color="text.secondary" mb={4} sx={{ maxWidth: 320 }}>
          Looks like you haven&apos;t added anything yet. Explore thousands of products from verified vendors.
        </Typography>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={() => navigate('/catalog')}
          sx={{ px: 4 }}
        >
          Browse Products
        </Button>
      </Box>
    );
  }

  const shippingFee   = subtotal() >= FREE_SHIPPING_THRESHOLD ? 0 : 99;
  const tax           = total() * 0.08;
  const grandTotal    = total() + shippingFee + tax;
  const shippingProgress = Math.min((subtotal() / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountToFree  = FREE_SHIPPING_THRESHOLD - subtotal();

  return (
    <Box>
      {/* ── Page Header Banner ────────────────────────────────────────── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 60%, ${VV_COLORS.violetLight} 100%)`,
        borderRadius: 3, p: { xs: 2.5, md: 3 }, mb: 4, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: -30, right: -30, width: 160, height: 160,
          borderRadius: '50%', bgcolor: alpha('#fff', 0.05), pointerEvents: 'none',
        }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{
              bgcolor: alpha('#fff', 0.15), width: 52, height: 52,
              border: `2px solid ${alpha('#fff', 0.25)}`, fontSize: 24,
            }}>
              🛒
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', letterSpacing: '-0.02em' }}>
                  Shopping Cart
                </Typography>
                <Chip
                  label={`${items.length} item${items.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    bgcolor: alpha('#fff', 0.2),
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 11.5,
                  }}
                />
              </Stack>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), mt: 0.25 }}>
                Review your items before placing the order
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            onClick={() => navigate('/catalog')}
            sx={{
              color: '#fff', borderColor: alpha('#fff', 0.35), flexShrink: 0,
              '&:hover': { bgcolor: alpha('#fff', 0.12), borderColor: alpha('#fff', 0.6) },
            }}
          >
            Continue Shopping
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* ── Cart Items ───────────────────────────────────────────── */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {items.map((item, idx) => (
                <Box
                  key={item.id}
                  sx={{
                    borderBottom: idx < items.length - 1 ? `1px solid ${alpha(VV_COLORS.slate400, 0.12)}` : 'none',
                    borderLeft: `4px solid ${VV_COLORS.violetMid}`,
                    transition: 'background 0.15s ease',
                    '&:hover': { bgcolor: alpha(VV_COLORS.violetMid, 0.02) },
                    borderRadius: idx === 0 ? '18px 18px 0 0' : idx === items.length - 1 ? '0 0 18px 18px' : 0,
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                    px={3}
                    py={2.5}
                  >
                    {/* Product emoji avatar */}
                    <Avatar sx={{
                      width: 64, height: 64, borderRadius: '16px', fontSize: 28,
                      bgcolor: alpha(VV_COLORS.violetMid, 0.07),
                      border: `1px solid ${alpha(VV_COLORS.violetMid, 0.12)}`,
                      flexShrink: 0,
                    }}>
                      {getProductEmoji(item.name)}
                    </Avatar>

                    {/* Product details */}
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body1" fontWeight={700} noWrap sx={{ maxWidth: { xs: 200, md: 320 } }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                        Sold by: <strong>{item.vendorName}</strong>
                      </Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ color: VV_COLORS.emerald }}>
                        {formatINR(item.price)} / unit
                      </Typography>
                    </Box>

                    {/* Quantity pill stepper */}
                    <Stack direction="row" alignItems="center" sx={{
                      border: `1.5px solid ${alpha(VV_COLORS.violetMid, 0.22)}`,
                      borderRadius: '30px',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      <IconButton
                        size="small"
                        onClick={() => updateQty(item.productId, item.quantity - 1, item.variantId)}
                        sx={{
                          borderRadius: 0,
                          width: 34, height: 34,
                          color: VV_COLORS.violetMid,
                          '&:hover': { bgcolor: alpha(VV_COLORS.violetMid, 0.08) },
                        }}
                      >
                        <Remove sx={{ fontSize: 15 }} />
                      </IconButton>
                      <Typography fontWeight={800} sx={{ minWidth: 28, textAlign: 'center', fontSize: 14 }}>
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => updateQty(item.productId, item.quantity + 1, item.variantId)}
                        disabled={item.quantity >= item.maxStock}
                        sx={{
                          borderRadius: 0,
                          width: 34, height: 34,
                          color: VV_COLORS.violetMid,
                          '&:hover': { bgcolor: alpha(VV_COLORS.violetMid, 0.08) },
                          '&.Mui-disabled': { opacity: 0.35 },
                        }}
                      >
                        <Add sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Stack>

                    {/* Item subtotal */}
                    <Typography
                      fontWeight={800}
                      sx={{ minWidth: 90, textAlign: 'right', fontSize: 16, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}
                    >
                      {formatINR(item.price * item.quantity)}
                    </Typography>

                    {/* Delete button */}
                    <IconButton
                      size="small"
                      onClick={() => removeItem(item.productId, item.variantId)}
                      sx={{
                        color: 'text.disabled',
                        border: `1px solid ${alpha(VV_COLORS.slate400, 0.2)}`,
                        borderRadius: '10px',
                        width: 34, height: 34,
                        '&:hover': {
                          color: VV_COLORS.coral,
                          borderColor: alpha(VV_COLORS.coral, 0.3),
                          bgcolor: alpha(VV_COLORS.coral, 0.06),
                        },
                      }}
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* ── You Might Also Like ─────────────────────────────── */}
          <Box mt={3}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={1.5}>
              <Star sx={{ fontSize: 16, color: VV_COLORS.amber }} />
              <Typography variant="body2" fontWeight={700} color="text.secondary">
                You might also like
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {suggestedChips.map(({ label, emoji }) => (
                <Chip
                  key={label}
                  label={`${emoji}  ${label}`}
                  onClick={() => navigate('/catalog')}
                  variant="outlined"
                  sx={{
                    borderColor: alpha(VV_COLORS.violetMid, 0.25),
                    color: VV_COLORS.violetMid,
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: alpha(VV_COLORS.violetMid, 0.06),
                      borderColor: alpha(VV_COLORS.violetMid, 0.45),
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Grid>

        {/* ── Order Summary ────────────────────────────────────────── */}
        <Grid item xs={12} lg={4}>
          <Card sx={{
            position: { lg: 'sticky' },
            top: { lg: 24 },
            border: `1px solid ${alpha(VV_COLORS.violetMid, 0.18)}`,
            boxShadow: `0 8px 32px ${alpha(VV_COLORS.violetMid, 0.1)}`,
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={800} mb={3} sx={{ letterSpacing: '-0.01em' }}>
                Order Summary
              </Typography>

              {/* Free shipping progress */}
              <Box sx={{
                bgcolor: alpha(VV_COLORS.violetMid, 0.05),
                border: `1px solid ${alpha(VV_COLORS.violetMid, 0.13)}`,
                borderRadius: 2, p: 1.75, mb: 3,
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <LocalShipping sx={{ fontSize: 14, color: shippingFee === 0 ? VV_COLORS.emerald : VV_COLORS.violetMid }} />
                    <Typography variant="caption" fontWeight={700} color={shippingFee === 0 ? 'success.main' : 'primary'}>
                      {shippingFee === 0 ? 'You have free shipping!' : `Add ${formatINR(amountToFree)} for FREE shipping`}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {Math.round(shippingProgress)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={shippingProgress}
                  sx={{
                    height: 6, borderRadius: 3,
                    bgcolor: alpha(VV_COLORS.violetMid, 0.1),
                    '& .MuiLinearProgress-bar': {
                      background: shippingFee === 0
                        ? `linear-gradient(90deg, ${VV_COLORS.emerald} 0%, ${VV_COLORS.emeraldLight} 100%)`
                        : `linear-gradient(90deg, ${VV_COLORS.violetMid} 0%, ${VV_COLORS.violetLight} 100%)`,
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>

              {/* Promo code */}
              <Box mb={3}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10.5 }}>
                  Promo Code
                </Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder='Try "SAVE10"'
                    value={couponInput}
                    onChange={e => { setCouponInput(e.target.value); setCouponError(false); }}
                    error={couponError}
                    helperText={couponError ? 'Invalid coupon code' : couponCode ? `${couponCode} applied!` : ''}
                    InputProps={{
                      startAdornment: <LocalOffer sx={{ fontSize: 15, color: 'text.disabled', mr: 1 }} />,
                      sx: { fontSize: 13 },
                    }}
                    FormHelperTextProps={{
                      sx: { color: couponCode && !couponError ? VV_COLORS.emerald : undefined, fontWeight: 600 },
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={applyCoupon}
                    sx={{ whiteSpace: 'nowrap', px: 2, flexShrink: 0 }}
                    disabled={!!couponCode}
                  >
                    Apply
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {/* Line items */}
              <Stack spacing={1.75} mb={2.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Receipt sx={{ fontSize: 15, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={600}>{formatINR(subtotal())}</Typography>
                </Stack>

                {discount > 0 && (
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LocalOffer sx={{ fontSize: 15, color: VV_COLORS.emerald }} />
                      <Typography variant="body2" sx={{ color: VV_COLORS.emerald }}>Discount ({couponCode})</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={700} sx={{ color: VV_COLORS.emerald }}>
                      -{formatINR(discount)}
                    </Typography>
                  </Stack>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocalShipping sx={{ fontSize: 15, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">Shipping</Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={700} sx={{ color: shippingFee === 0 ? VV_COLORS.emerald : 'text.primary' }}>
                    {shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Percent sx={{ fontSize: 15, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">GST 8%</Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={600}>{formatINR(tax)}</Typography>
                </Stack>
              </Stack>

              <Divider sx={{ mb: 2.5 }} />

              {/* Grand total */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>Total</Typography>
                <Typography
                  variant="h5"
                  fontWeight={900}
                  sx={{
                    background: `linear-gradient(135deg, ${VV_COLORS.violetMid} 0%, ${VV_COLORS.violetDeep} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {formatINR(grandTotal)}
                </Typography>
              </Stack>

              {/* Checkout button */}
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<Lock sx={{ fontSize: 16 }} />}
                endIcon={<ArrowForward />}
                onClick={() => navigate('/checkout')}
                sx={{
                  py: 1.6,
                  fontSize: 15,
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${VV_COLORS.coralLight} 0%, ${VV_COLORS.coral} 50%, ${VV_COLORS.coralDark} 100%)`,
                  boxShadow: `0 6px 20px ${alpha(VV_COLORS.coral, 0.4)}`,
                  letterSpacing: '0.01em',
                  '&:hover': {
                    boxShadow: `0 8px 28px ${alpha(VV_COLORS.coral, 0.52)}`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Secure Checkout
              </Button>

              {/* Trust badges */}
              <Stack direction="row" justifyContent="center" spacing={3} mt={2.5}>
                {[
                  { icon: <Lock sx={{ fontSize: 13 }} />, label: 'SSL Secured' },
                  { icon: <CheckCircle sx={{ fontSize: 13 }} />, label: 'Buyer Protected' },
                ].map(({ icon, label }) => (
                  <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ color: VV_COLORS.emerald, display: 'flex' }}>{icon}</Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: 10.5 }}>
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box pb={4} />
    </Box>
  );
}
