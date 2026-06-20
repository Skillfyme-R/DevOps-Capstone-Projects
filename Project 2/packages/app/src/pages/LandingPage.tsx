import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Typography, Grid, Card,
  Chip, Stack, Avatar, AppBar, Toolbar, alpha,
} from '@mui/material';
import {
  Storefront, LocalShipping, Shield, TrendingUp,
  ShoppingBag, CheckCircle, Star, ArrowForward,
  FlashOn, Verified,
} from '@mui/icons-material';
import { VV_COLORS } from '../styles/theme';

const FEATURES = [
  { icon: <Storefront />,    title: 'Multi-Vendor Marketplace',  desc: 'Shop from 50,000+ verified vendors across every category imaginable.', color: VV_COLORS.violetMid },
  { icon: <LocalShipping />, title: 'Fast & Reliable Shipping',  desc: 'Real-time tracking via FedEx, UPS, DHL. Guaranteed delivery or refund.', color: VV_COLORS.emerald },
  { icon: <Shield />,        title: 'Buyer Protection',          desc: '30-day easy returns and full purchase protection on every single order.', color: VV_COLORS.coral },
  { icon: <TrendingUp />,    title: 'Powerful Vendor Analytics', desc: 'Live dashboards, revenue insights, and tools to help your store grow.', color: VV_COLORS.amber },
];

const STATS = [
  { value: '50K+',  label: 'Verified Vendors',  icon: <Verified /> },
  { value: '2M+',   label: 'Products Listed',   icon: <Storefront /> },
  { value: '8M+',   label: 'Happy Customers',   icon: <Star /> },
  { value: '99.9%', label: 'Platform Uptime',   icon: <FlashOn /> },
];

const CATEGORIES = [
  { name: 'Electronics', emoji: '📱', color: '#6C3DE0' },
  { name: 'Fashion',     emoji: '👗', color: '#FF5C5C' },
  { name: 'Home',        emoji: '🏡', color: '#10B981' },
  { name: 'Sports',      emoji: '⚽', color: '#F59E0B' },
  { name: 'Beauty',      emoji: '💄', color: '#EC4899' },
  { name: 'Books',       emoji: '📚', color: '#3B82F6' },
  { name: 'Toys',        emoji: '🧸', color: '#14B8A6' },
  { name: 'Food',        emoji: '🍎', color: '#EF4444' },
];

const TESTIMONIALS = [
  { name: 'Priya S.',    role: 'Regular Shopper',  text: 'VendorVault has the best product variety. I find everything in one place!', avatar: 'P', color: VV_COLORS.violetMid },
  { name: 'Marcus L.',   role: 'Electronics Vendor', text: 'My revenue tripled in 3 months. The analytics dashboard is incredible.', avatar: 'M', color: VV_COLORS.emerald },
  { name: 'Anjali K.',   role: 'Fashion Seller',   text: 'Setup was instant and payouts are always on time. Best platform ever.', avatar: 'A', color: VV_COLORS.coral },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: 'background.default', overflowX: 'hidden' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <AppBar position="sticky" elevation={0} sx={{
        bgcolor: alpha('#fff', 0.92),
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${VV_COLORS.slate200}`,
        color: 'text.primary',
      }}>
        <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 2, md: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: '8px',
              background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.violetDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Storefront sx={{ color: 'white', fontSize: 17 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{
              background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.coral})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              VendorVault
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button variant="text" sx={{ color: 'text.secondary', fontWeight: 500 }} onClick={() => navigate('/catalog')}>Browse</Button>
            <Button variant="text" sx={{ color: 'text.secondary', fontWeight: 500 }} onClick={() => navigate('/vendors')}>Vendors</Button>
            <Button variant="outlined" color="primary" sx={{ ml: 1, borderWidth: 1.5 }} onClick={() => navigate('/login')}>Sign In</Button>
            <Button variant="contained" color="primary" sx={{ ml: 1 }} onClick={() => navigate('/register')}>Get Started</Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative',
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, #4A2BB5 45%, #7C3AED 75%, #9333EA 100%)`,
        color: 'white',
        py: { xs: 10, md: 16 },
        overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(VV_COLORS.coral, 0.3)} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -120, left: -60, width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(VV_COLORS.violetLight, 0.25)} 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Chip
            icon={<Star sx={{ color: '#FCD34D !important', fontSize: '14px !important' }} />}
            label="Rated #1 Multi-Vendor Marketplace — 2025"
            sx={{
              mb: 4, bgcolor: alpha('#fff', 0.12), color: 'white', fontWeight: 600,
              border: `1px solid ${alpha('#fff', 0.2)}`, backdropFilter: 'blur(8px)',
            }}
          />

          <Typography variant="h2" fontWeight={800} sx={{
            mb: 3,
            fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' },
            lineHeight: 1.1,
            textShadow: '0 2px 20px rgba(0,0,0,0.2)',
          }}>
            Where Vendors Thrive,
            <Box component="span" sx={{
              display: 'block',
              background: `linear-gradient(135deg, #FCD34D, ${VV_COLORS.coralLight})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Shoppers Discover
            </Box>
          </Typography>

          <Typography variant="h6" sx={{ mb: 5, opacity: 0.82, maxWidth: 560, mx: 'auto', fontWeight: 400, lineHeight: 1.7 }}>
            Access over 2 million products from 50,000 verified vendors worldwide.
            Sell more. Buy smarter. All in one place.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<ShoppingBag />}
              endIcon={<ArrowForward />}
              onClick={() => navigate('/register')}
              sx={{
                background: `linear-gradient(135deg, ${VV_COLORS.coral}, #FF8C42)`,
                color: 'white', fontWeight: 800,
                px: 4, py: 1.6, fontSize: '1rem',
                boxShadow: `0 8px 32px ${alpha(VV_COLORS.coral, 0.5)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, #FF8C42, ${VV_COLORS.coral})`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 14px 40px ${alpha(VV_COLORS.coral, 0.6)}`,
                },
              }}
            >
              Start Shopping Free
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<Storefront />}
              onClick={() => navigate('/register?role=vendor')}
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                color: 'white', fontWeight: 700,
                px: 4, py: 1.6, fontSize: '1rem',
                border: '2px solid rgba(255,255,255,0.7)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.28)',
                  border: '2px solid white',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.2)',
                },
              }}
            >
              Become a Vendor
            </Button>
          </Stack>

          <Stack direction="row" spacing={3} justifyContent="center" mt={5} flexWrap="wrap">
            {['No setup fees', 'Instant payouts', '24/7 support'].map(t => (
              <Stack key={t} direction="row" spacing={0.5} alignItems="center">
                <CheckCircle sx={{ fontSize: 16, color: VV_COLORS.emeraldLight }} />
                <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 500 }}>{t}</Typography>
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: 'white', borderBottom: `1px solid ${VV_COLORS.slate200}` }}>
        <Container maxWidth="lg">
          <Grid container>
            {STATS.map(({ value, label, icon }, i) => (
              <Grid item xs={6} md={3} key={label}>
                <Box sx={{
                  py: 4, px: 3, textAlign: 'center',
                  borderRight: i < 3 ? `1px solid ${VV_COLORS.slate200}` : 'none',
                  '&:hover .stat-icon': { transform: 'scale(1.15)' },
                }}>
                  <Box className="stat-icon" sx={{
                    display: 'inline-flex', mb: 1.5, p: 1.2, borderRadius: '12px',
                    bgcolor: alpha(VV_COLORS.violetMid, 0.08), color: VV_COLORS.violetMid,
                    transition: 'transform 0.2s',
                  }}>
                    {icon}
                  </Box>
                  <Typography variant="h4" fontWeight={800} sx={{
                    background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.violetDeep})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Categories ─────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box textAlign="center" mb={6}>
          <Chip label="Browse by Category" color="primary" variant="outlined" sx={{ mb: 2, fontWeight: 600 }} />
          <Typography variant="h4" fontWeight={800} mb={1}>Shop Every Category</Typography>
          <Typography color="text.secondary" maxWidth={480} mx="auto">
            From the latest electronics to handmade crafts — discover millions of products.
          </Typography>
        </Box>
        <Grid container spacing={2} justifyContent="center">
          {CATEGORIES.map(({ name, emoji, color }) => (
            <Grid item xs={6} sm={4} md={3} lg={1.5} key={name}>
              <Card
                onClick={() => navigate(`/catalog?category=${name}`)}
                sx={{
                  cursor: 'pointer', p: 2.5, textAlign: 'center',
                  border: `1px solid ${VV_COLORS.slate200}`,
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 12px 32px ${alpha(color, 0.2)}`,
                    borderColor: color,
                  },
                }}
              >
                <Typography fontSize={36} mb={1}>{emoji}</Typography>
                <Typography variant="caption" fontWeight={700} color="text.primary">{name}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: VV_COLORS.slate50, py: { xs: 6, md: 10 }, borderTop: `1px solid ${VV_COLORS.slate200}`, borderBottom: `1px solid ${VV_COLORS.slate200}` }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Chip label="Why VendorVault" color="secondary" variant="outlined" sx={{ mb: 2, fontWeight: 600 }} />
            <Typography variant="h4" fontWeight={800} mb={1}>Built for Buyers & Sellers</Typography>
            <Typography color="text.secondary" maxWidth={460} mx="auto">
              Everything you need to shop confidently or build a thriving online business.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {FEATURES.map(({ icon, title, desc, color }) => (
              <Grid item xs={12} md={6} key={title}>
                <Card sx={{ p: 3.5, height: '100%', '&:hover': { borderColor: color } }}>
                  <Stack direction="row" spacing={2.5} alignItems="flex-start">
                    <Avatar sx={{
                      bgcolor: alpha(color, 0.12), color, width: 52, height: 52,
                      borderRadius: '14px', boxShadow: `0 4px 14px ${alpha(color, 0.2)}`,
                    }}>
                      {icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700} mb={0.8}>{title}</Typography>
                      <Typography variant="body2" color="text.secondary" lineHeight={1.7}>{desc}</Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box textAlign="center" mb={6}>
          <Chip label="Testimonials" color="primary" variant="outlined" sx={{ mb: 2, fontWeight: 600 }} />
          <Typography variant="h4" fontWeight={800}>Loved by Millions</Typography>
        </Box>
        <Grid container spacing={3}>
          {TESTIMONIALS.map(({ name, role, text, avatar, color }) => (
            <Grid item xs={12} md={4} key={name}>
              <Card sx={{ p: 3.5, height: '100%', position: 'relative', overflow: 'visible' }}>
                <Typography variant="h4" sx={{ color: alpha(color, 0.15), fontFamily: 'Georgia', position: 'absolute', top: 12, left: 20, fontSize: '4rem', lineHeight: 1 }}>&ldquo;</Typography>
                <Stack spacing={1} mt={3}>
                  <Stack direction="row" spacing={0.5}>
                    {[1,2,3,4,5].map(i => <Star key={i} sx={{ fontSize: 16, color: '#FCD34D' }} />)}
                  </Stack>
                  <Typography variant="body1" color="text.secondary" lineHeight={1.7} fontStyle="italic">
                    &ldquo;{text}&rdquo;
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" mt={1}>
                    <Avatar sx={{ bgcolor: color, width: 38, height: 38, fontWeight: 700 }}>{avatar}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{name}</Typography>
                      <Typography variant="caption" color="text.secondary">{role}</Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 60%, #9333EA 100%)`,
        py: { xs: 8, md: 12 }, textAlign: 'center', color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 50%, ${alpha(VV_COLORS.coral, 0.2)} 0%, transparent 60%)`, pointerEvents: 'none' }} />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" fontWeight={800} mb={2}>
            Ready to Open Your Store?
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, mb: 5, fontWeight: 400 }}>
            Join 50,000+ vendors already growing with VendorVault. No setup fees, ever.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<Storefront />}
              onClick={() => navigate('/register?role=vendor')}
              sx={{
                background: `linear-gradient(135deg, ${VV_COLORS.coral}, #FF8C42)`,
                color: 'white', fontWeight: 800, px: 5, py: 1.6,
                fontSize: '1rem', boxShadow: `0 8px 24px ${alpha(VV_COLORS.coral, 0.5)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, #FF8C42, ${VV_COLORS.coral})`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 14px 36px ${alpha(VV_COLORS.coral, 0.6)}`,
                },
              }}
            >
              Open Your Store Free
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/catalog')}
              sx={{
                bgcolor: 'rgba(255,255,255,0.18)',
                color: 'white', fontWeight: 700, px: 5, py: 1.6,
                fontSize: '1rem',
                border: '2px solid rgba(255,255,255,0.7)',
                backdropFilter: 'blur(12px)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.28)',
                  border: '2px solid white',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              Browse Products
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: VV_COLORS.slate900, py: 4, textAlign: 'center' }}>
        <Stack direction="row" alignItems="center" spacing={1} justifyContent="center" mb={1}>
          <Box sx={{
            width: 26, height: 26, borderRadius: '7px',
            background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.violetDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Storefront sx={{ color: 'white', fontSize: 14 }} />
          </Box>
          <Typography variant="body2" fontWeight={700} sx={{ color: 'white' }}>VendorVault</Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: alpha('#fff', 0.35) }}>
          © 2025 VendorVault Inc. · Privacy Policy · Terms of Service · Sitemap
        </Typography>
      </Box>
    </Box>
  );
}
