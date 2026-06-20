import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Stack, TextField, Button,
  Stepper, Step, StepLabel, Divider, Radio, RadioGroup, FormControlLabel,
  Avatar, Checkbox, FormGroup, StepConnector, stepConnectorClasses, alpha,
  styled,
} from '@mui/material';
import {
  LocalShipping, Payment, CheckCircle, Lock,
  CreditCard, AccountBalance, PhoneAndroid,
  Verified, Security, SupportAgent, ArrowForward, ArrowBack,
} from '@mui/icons-material';
import { useCartStore } from '../hooks/useCart';
import { toast } from 'react-toastify';
import { VV_COLORS } from '../styles/theme';
import { formatINR } from '../utils/currency';

const STEPS = ['Shipping', 'Payment', 'Confirm'];

const STEP_ICONS = [
  <LocalShipping key="ship" />,
  <Payment key="pay" />,
  <CheckCircle key="check" />,
];

// ── Custom Stepper connector ──────────────────────────────────────────────────
const VVConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 20 },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: `linear-gradient(90deg, ${VV_COLORS.violetMid} 0%, ${VV_COLORS.violetLight} 100%)`,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: `linear-gradient(90deg, ${VV_COLORS.violetMid} 0%, ${VV_COLORS.emerald} 100%)`,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: alpha(VV_COLORS.slate400, 0.2),
    borderRadius: 2,
  },
}));

function VVStepIcon({ active, completed, icon }: { active?: boolean; completed?: boolean; icon?: React.ReactNode }) {
  const idx = typeof icon === 'number' ? icon - 1 : 0;
  const iconEl = STEP_ICONS[idx];
  return (
    <Avatar
      sx={{
        width: 42, height: 42,
        borderRadius: '13px',
        bgcolor: completed
          ? alpha(VV_COLORS.emerald, 0.12)
          : active
          ? alpha(VV_COLORS.violetMid, 0.12)
          : alpha(VV_COLORS.slate400, 0.1),
        color: completed
          ? VV_COLORS.emerald
          : active
          ? VV_COLORS.violetMid
          : VV_COLORS.slate400,
        border: active
          ? `2px solid ${alpha(VV_COLORS.violetMid, 0.4)}`
          : completed
          ? `2px solid ${alpha(VV_COLORS.emerald, 0.4)}`
          : `2px solid ${alpha(VV_COLORS.slate400, 0.2)}`,
        boxShadow: active
          ? `0 4px 16px ${alpha(VV_COLORS.violetMid, 0.28)}`
          : completed
          ? `0 4px 12px ${alpha(VV_COLORS.emerald, 0.22)}`
          : 'none',
        transition: 'all 0.25s ease',
        fontSize: 18,
      }}
    >
      {iconEl}
    </Avatar>
  );
}

const paymentMethods = [
  {
    value: 'card',
    label: 'Credit / Debit Card',
    description: 'Visa, Mastercard, RuPay',
    icon: <CreditCard />,
    color: VV_COLORS.violetMid,
  },
  {
    value: 'upi',
    label: 'UPI',
    description: 'PhonePe, GPay, Paytm',
    icon: <PhoneAndroid />,
    color: VV_COLORS.emerald,
  },
  {
    value: 'paypal',
    label: 'PayPal',
    description: 'Pay via PayPal account',
    icon: <AccountBalance />,
    color: '#003087',
  },
  {
    value: 'stripe',
    label: 'Stripe',
    description: 'International cards',
    icon: <CreditCard />,
    color: '#635BFF',
  },
];

const trustBadges = [
  { icon: <Security sx={{ fontSize: 18 }} />,   label: 'SSL Encrypted',      sub: '256-bit security' },
  { icon: <Verified sx={{ fontSize: 18 }} />,    label: 'Buyer Protection',   sub: 'Full refund guarantee' },
  { icon: <SupportAgent sx={{ fontSize: 18 }} />, label: '24/7 Support',       sub: 'Always here to help' },
];

function getProductEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('headphone') || n.includes('audio') || n.includes('earphone')) return '🎧';
  if (n.includes('lamp') || n.includes('light') || n.includes('bulb')) return '💡';
  if (n.includes('bottle') || n.includes('water')) return '🫙';
  if (n.includes('shoe') || n.includes('sneaker')) return '👟';
  if (n.includes('shirt') || n.includes('jogger') || n.includes('cotton')) return '👕';
  if (n.includes('laptop') || n.includes('computer')) return '💻';
  if (n.includes('phone') || n.includes('mobile')) return '📱';
  return '📦';
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, total, clearCart } = useCartStore();
  const [step, setStep]       = useState(0);
  const [payment, setPayment] = useState('card');
  const [saveAddr, setSaveAddr] = useState(false);

  const shippingFee = subtotal() >= 4000 ? 0 : 99;
  const tax         = total() * 0.18;
  const grandTotal  = total() + shippingFee + tax;

  const handlePlaceOrder = () => {
    clearCart();
    toast.success('Order placed successfully!');
    navigate('/orders');
  };

  return (
    <Box>
      {/* ── Page title ────────────────────────────────────────────────── */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>Checkout</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Complete your purchase securely in a few steps
        </Typography>
      </Box>

      {/* ── Custom Stepper ────────────────────────────────────────────── */}
      <Card sx={{
        mb: 4, border: `1px solid ${alpha(VV_COLORS.violetMid, 0.15)}`,
        boxShadow: `0 4px 20px ${alpha(VV_COLORS.violetMid, 0.07)}`,
      }}>
        <CardContent sx={{ px: { xs: 2, md: 5 }, py: 3 }}>
          <Stepper activeStep={step} alternativeLabel connector={<VVConnector />}>
            {STEPS.map((label, i) => (
              <Step key={label} completed={i < step}>
                <StepLabel
                  StepIconComponent={VVStepIcon}
                  sx={{
                    '& .MuiStepLabel-label': {
                      mt: 1,
                      fontWeight: i === step ? 700 : 500,
                      color: i === step ? VV_COLORS.violetMid : i < step ? VV_COLORS.emerald : VV_COLORS.slate400,
                      fontSize: 13,
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* ── Main Form ──────────────────────────────────────────────── */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ minHeight: 400 }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>

              {/* ── Step 0: Shipping ─────────────────────────────────── */}
              {step === 0 && (
                <Box>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                    <Avatar sx={{
                      bgcolor: alpha(VV_COLORS.violetMid, 0.1), color: VV_COLORS.violetMid,
                      width: 40, height: 40, borderRadius: '12px',
                    }}>
                      <LocalShipping />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                        Shipping Address
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Where should we deliver your order?
                      </Typography>
                    </Box>
                  </Stack>

                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="First Name" size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Last Name" size="small" />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Street Address" size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Apartment / Suite (optional)" size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="City" size="small" />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField fullWidth label="State" size="small" />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField fullWidth label="PIN Code" size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth label="Country" size="small" defaultValue="India" />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        size="small"
                        placeholder="+91 98765 43210"
                        helperText="For delivery updates and OTP"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={saveAddr}
                              onChange={e => setSaveAddr(e.target.checked)}
                              sx={{
                                color: alpha(VV_COLORS.violetMid, 0.4),
                                '&.Mui-checked': { color: VV_COLORS.violetMid },
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2" fontWeight={600}>
                              Save this address for future orders
                            </Typography>
                          }
                        />
                      </FormGroup>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* ── Step 1: Payment ──────────────────────────────────── */}
              {step === 1 && (
                <Box>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                    <Avatar sx={{
                      bgcolor: alpha(VV_COLORS.violetMid, 0.1), color: VV_COLORS.violetMid,
                      width: 40, height: 40, borderRadius: '12px',
                    }}>
                      <Payment />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                        Payment Method
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        All transactions are 256-bit SSL encrypted
                      </Typography>
                    </Box>
                  </Stack>

                  <RadioGroup value={payment} onChange={e => setPayment(e.target.value)}>
                    <Stack spacing={1.5} mb={3}>
                      {paymentMethods.map(opt => {
                        const isSelected = payment === opt.value;
                        return (
                          <Card
                            key={opt.value}
                            variant="outlined"
                            onClick={() => setPayment(opt.value)}
                            sx={{
                              cursor: 'pointer',
                              border: isSelected
                                ? `2px solid ${opt.color}`
                                : `1.5px solid ${alpha(VV_COLORS.slate400, 0.2)}`,
                              background: isSelected
                                ? `linear-gradient(135deg, ${alpha(opt.color, 0.05)} 0%, transparent 70%)`
                                : 'transparent',
                              boxShadow: isSelected ? `0 4px 16px ${alpha(opt.color, 0.18)}` : 'none',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: isSelected ? opt.color : alpha(opt.color, 0.4),
                                boxShadow: `0 4px 14px ${alpha(opt.color, 0.14)}`,
                              },
                            }}
                          >
                            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Avatar sx={{
                                  bgcolor: alpha(opt.color, 0.12),
                                  color: opt.color,
                                  width: 38, height: 38,
                                  borderRadius: '11px',
                                  flexShrink: 0,
                                }}>
                                  {opt.icon}
                                </Avatar>
                                <Box flex={1}>
                                  <Typography variant="body2" fontWeight={700}>{opt.label}</Typography>
                                  <Typography variant="caption" color="text.secondary">{opt.description}</Typography>
                                </Box>
                                <Radio
                                  value={opt.value}
                                  checked={isSelected}
                                  sx={{
                                    color: alpha(opt.color, 0.4),
                                    '&.Mui-checked': { color: opt.color },
                                    flexShrink: 0,
                                  }}
                                />
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  </RadioGroup>

                  {payment === 'card' && (
                    <Box sx={{
                      p: 2.5, borderRadius: 2,
                      border: `1.5px solid ${alpha(VV_COLORS.violetMid, 0.2)}`,
                      bgcolor: alpha(VV_COLORS.violetMid, 0.025),
                    }}>
                      <Typography variant="body2" fontWeight={700} mb={2} sx={{ color: VV_COLORS.violetMid }}>
                        Card Details
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Card Number"
                            size="small"
                            placeholder="1234  5678  9012  3456"
                            InputProps={{ startAdornment: <CreditCard sx={{ fontSize: 16, color: 'text.disabled', mr: 1 }} /> }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth label="Expiry (MM/YY)" size="small" placeholder="08/27" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth label="CVV" size="small" placeholder="•••" />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField fullWidth label="Name on Card" size="small" />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {payment === 'upi' && (
                    <Box sx={{
                      p: 2.5, borderRadius: 2,
                      border: `1.5px solid ${alpha(VV_COLORS.emerald, 0.2)}`,
                      bgcolor: alpha(VV_COLORS.emerald, 0.025),
                    }}>
                      <Typography variant="body2" fontWeight={700} mb={2} sx={{ color: VV_COLORS.emerald }}>
                        UPI ID
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        label="UPI ID"
                        placeholder="yourname@upi"
                        InputProps={{ startAdornment: <PhoneAndroid sx={{ fontSize: 16, color: 'text.disabled', mr: 1 }} /> }}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {/* ── Step 2: Confirm ──────────────────────────────────── */}
              {step === 2 && (
                <Box>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                    <Avatar sx={{
                      bgcolor: alpha(VV_COLORS.emerald, 0.1), color: VV_COLORS.emerald,
                      width: 40, height: 40, borderRadius: '12px',
                    }}>
                      <CheckCircle />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                        Review Your Order
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Confirm items before placing the order
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Items table */}
                  <Box sx={{
                    border: `1px solid ${alpha(VV_COLORS.slate400, 0.15)}`,
                    borderRadius: 2, overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <Box sx={{ bgcolor: alpha(VV_COLORS.slate400, 0.06), px: 2.5, py: 1.25 }}>
                      <Grid container>
                        <Grid item xs={6}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10 }}>
                            Product
                          </Typography>
                        </Grid>
                        <Grid item xs={2} sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10 }}>
                            Qty
                          </Typography>
                        </Grid>
                        <Grid item xs={2} sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10 }}>
                            Price
                          </Typography>
                        </Grid>
                        <Grid item xs={2} sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10 }}>
                            Total
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    {items.map((item, idx) => (
                      <Box
                        key={item.id}
                        sx={{
                          px: 2.5, py: 2,
                          borderTop: idx > 0 ? `1px solid ${alpha(VV_COLORS.slate400, 0.12)}` : 'none',
                          transition: 'background 0.12s',
                          '&:hover': { bgcolor: alpha(VV_COLORS.violetMid, 0.025) },
                        }}
                      >
                        <Grid container alignItems="center">
                          <Grid item xs={6}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{
                                width: 36, height: 36, borderRadius: '10px', fontSize: 18,
                                bgcolor: alpha(VV_COLORS.violetMid, 0.07),
                                border: `1px solid ${alpha(VV_COLORS.violetMid, 0.1)}`,
                                flexShrink: 0,
                              }}>
                                {getProductEmoji(item.name)}
                              </Avatar>
                              <Box minWidth={0}>
                                <Typography variant="body2" fontWeight={700} noWrap>{item.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.vendorName}</Typography>
                              </Box>
                            </Stack>
                          </Grid>
                          <Grid item xs={2} sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" fontWeight={600} color="text.secondary">
                              × {item.quantity}
                            </Typography>
                          </Grid>
                          <Grid item xs={2} sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" fontWeight={600}>{formatINR(item.price)}</Typography>
                          </Grid>
                          <Grid item xs={2} sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight={800}>{formatINR(item.price * item.quantity)}</Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* ── Navigation buttons ───────────────────────────────── */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" mt={4} pt={3} sx={{ borderTop: `1px solid ${alpha(VV_COLORS.slate400, 0.15)}` }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => setStep(s => s - 1)}
                  disabled={step === 0}
                  sx={{ px: 3 }}
                >
                  Back
                </Button>

                {step < STEPS.length - 1 ? (
                  <Button
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={() => setStep(s => s + 1)}
                    sx={{ px: 4 }}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={<Lock sx={{ fontSize: 16 }} />}
                    endIcon={<ArrowForward />}
                    onClick={handlePlaceOrder}
                    sx={{
                      px: 4, py: 1.5,
                      fontSize: 15, fontWeight: 800,
                      background: `linear-gradient(135deg, ${VV_COLORS.coralLight} 0%, ${VV_COLORS.coral} 50%, ${VV_COLORS.coralDark} 100%)`,
                      boxShadow: `0 6px 20px ${alpha(VV_COLORS.coral, 0.4)}`,
                      '&:hover': {
                        boxShadow: `0 8px 28px ${alpha(VV_COLORS.coral, 0.52)}`,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    Place Order — {formatINR(grandTotal)}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Order Summary Sidebar ──────────────────────────────────── */}
        <Grid item xs={12} lg={4}>
          <Card sx={{
            position: { lg: 'sticky' },
            top: { lg: 24 },
            border: `1px solid ${alpha(VV_COLORS.violetMid, 0.16)}`,
            boxShadow: `0 8px 32px ${alpha(VV_COLORS.violetMid, 0.09)}`,
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={800} mb={2.5} sx={{ letterSpacing: '-0.01em' }}>
                Order Summary
              </Typography>

              {/* Items list */}
              <Stack spacing={1.5} mb={2.5}>
                {items.map(item => (
                  <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center" flex={1} minWidth={0}>
                      <Avatar sx={{
                        width: 30, height: 30, borderRadius: '8px', fontSize: 15,
                        bgcolor: alpha(VV_COLORS.violetMid, 0.07),
                        flexShrink: 0,
                      }}>
                        {getProductEmoji(item.name)}
                      </Avatar>
                      <Box minWidth={0}>
                        <Typography variant="caption" fontWeight={700} noWrap display="block">
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
                          Qty {item.quantity}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="caption" fontWeight={800} sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatINR(item.price * item.quantity)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {/* Pricing breakdown */}
              <Stack spacing={1.5} mb={2.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Subtotal ({items.length} items)</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatINR(subtotal())}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Shipping</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: shippingFee === 0 ? VV_COLORS.emerald : 'text.primary' }}>
                    {shippingFee === 0 ? 'FREE' : formatINR(shippingFee)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">GST 18%</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatINR(tax)}</Typography>
                </Stack>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={800}>Total</Typography>
                <Typography
                  variant="h6"
                  fontWeight={900}
                  sx={{
                    background: `linear-gradient(135deg, ${VV_COLORS.violetMid} 0%, ${VV_COLORS.violetDeep} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatINR(grandTotal)}
                </Typography>
              </Stack>

              {/* Trust badges */}
              <Divider sx={{ mb: 2.5 }} />
              <Stack spacing={1.5}>
                {trustBadges.map(({ icon, label, sub }) => (
                  <Stack key={label} direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{
                      bgcolor: alpha(VV_COLORS.emerald, 0.1),
                      color: VV_COLORS.emerald,
                      width: 34, height: 34,
                      borderRadius: '10px',
                      flexShrink: 0,
                    }}>
                      {icon}
                    </Avatar>
                    <Box>
                      <Typography variant="caption" fontWeight={700} display="block" sx={{ lineHeight: 1.2 }}>
                        {label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
                        {sub}
                      </Typography>
                    </Box>
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
