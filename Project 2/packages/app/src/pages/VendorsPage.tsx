import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Stack,
  Chip, Button, TextField, InputAdornment, Avatar, alpha,
  LinearProgress, Divider, IconButton,
} from '@mui/material';
import {
  Search, Verified, Storefront, Star, TrendingUp,
  GridView, ViewList, ArrowForward, WorkspacePremium,
  LocalShipping, Schedule, CheckCircle,
} from '@mui/icons-material';
import { VV_COLORS } from '../styles/theme';

/* ─── Data ────────────────────────────────────────────────────────────── */
const VENDORS = [
  {
    id: 'v1', name: 'SoundWave Store', category: 'Electronics',
    rating: 4.9, reviews: 12400, products: 234, revenue: '₹1.56 Cr',
    color: VV_COLORS.violetMid, emoji: '🎧', initials: 'SW',
    verified: true, badge: 'Top Seller', featured: true,
    desc: 'Premium audio equipment, headphones, and smart home devices trusted by audiophiles worldwide.',
    tags: ['Headphones', 'Speakers', 'Smart Home'],
    responseTime: '< 1 hr', fulfillment: 98,
  },
  {
    id: 'v2', name: 'EcoThreads', category: 'Fashion',
    rating: 4.7, reviews: 8760, products: 189, revenue: '₹49.4 L',
    color: VV_COLORS.emerald, emoji: '👗', initials: 'ET',
    verified: true, badge: 'Eco Certified', featured: true,
    desc: 'Sustainable, ethically sourced fashion for the conscious shopper. 100% organic materials.',
    tags: ['Organic', 'Sustainable', 'Casual'],
    responseTime: '< 2 hr', fulfillment: 96,
  },
  {
    id: 'v3', name: 'LuminaHome', category: 'Home & Living',
    rating: 4.8, reviews: 5400, products: 312, revenue: '₹30.7 L',
    color: VV_COLORS.amber, emoji: '🏡', initials: 'LH',
    verified: true, badge: null, featured: false,
    desc: 'Curated home décor and smart lighting solutions to transform every living space.',
    tags: ['Decor', 'Lighting', 'Furniture'],
    responseTime: '< 3 hr', fulfillment: 95,
  },
  {
    id: 'v4', name: 'PureHydration', category: 'Sports',
    rating: 4.6, reviews: 3100, products: 45, revenue: '₹15.6 L',
    color: '#3B82F6', emoji: '🍶', initials: 'PH',
    verified: false, badge: null, featured: false,
    desc: 'High-performance hydration gear for athletes, hikers, and outdoor enthusiasts.',
    tags: ['Bottles', 'Gym', 'Outdoor'],
    responseTime: '< 4 hr', fulfillment: 93,
  },
  {
    id: 'v5', name: 'GlowLab', category: 'Beauty',
    rating: 4.5, reviews: 6700, products: 98, revenue: '₹48.4 L',
    color: '#EC4899', emoji: '✨', initials: 'GL',
    verified: true, badge: 'Award Winner', featured: true,
    desc: 'Science-backed skincare formulated by dermatologists. Cruelty-free and vegan certified.',
    tags: ['Skincare', 'Vegan', 'Dermatologist'],
    responseTime: '< 2 hr', fulfillment: 97,
  },
  {
    id: 'v6', name: 'BookHaven', category: 'Books',
    rating: 4.9, reviews: 21000, products: 5400, revenue: '₹1.04 Cr',
    color: '#8B5CF6', emoji: '📚', initials: 'BH',
    verified: true, badge: 'Bestsellers', featured: false,
    desc: 'Your destination for bestsellers, rare finds, and curated reading lists across every genre.',
    tags: ['Fiction', 'Non-fiction', 'Academic'],
    responseTime: '< 1 hr', fulfillment: 99,
  },
];

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Home & Living', 'Sports', 'Beauty', 'Books'];

export default function VendorsPage() {
  const navigate = useNavigate();
  const [query, setQ]       = useState('');
  const [catFilter, setCat] = useState('All');
  const [viewMode, setView] = useState<'grid' | 'list'>('grid');

  const filtered = VENDORS.filter(v => {
    const matchQ = v.name.toLowerCase().includes(query.toLowerCase()) ||
                   v.category.toLowerCase().includes(query.toLowerCase()) ||
                   v.tags.some(t => t.toLowerCase().includes(query.toLowerCase()));
    return matchQ && (catFilter === 'All' || v.category === catFilter);
  });

  const featured = VENDORS.filter(v => v.featured);

  return (
    <Box>

      {/* ══ HERO BANNER ══════════════════════════════════════════════════ */}
      <Box sx={{
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 60%, ${VV_COLORS.violetLight} 100%)`,
        borderRadius: 3, p: { xs: 3, md: 4 }, mb: 4,
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 240, height: 240, borderRadius: '50%', background: alpha('#fff', 0.05), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 140, width: 180, height: 180, borderRadius: '50%', background: alpha('#fff', 0.04), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: '40%', left: '35%', width: 100, height: 100, borderRadius: '50%', background: alpha('#fff', 0.03), pointerEvents: 'none' }} />

        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{
              width: 58, height: 58, borderRadius: 2.5,
              background: alpha('#fff', 0.14), backdropFilter: 'blur(8px)',
              border: `1.5px solid ${alpha('#fff', 0.25)}`,
            }}>
              <Storefront sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#fff" sx={{ letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                Vendor Marketplace
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.72), mt: 0.5 }}>
                {VENDORS.length} verified vendors · 6,278+ products · Trusted by 8M+ shoppers
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} flexShrink={0}>
            {[
              { value: '50K+', label: 'Vendors' },
              { value: '4.8★', label: 'Avg Rating' },
              { value: '99%',  label: 'On-Time' },
            ].map(s => (
              <Box key={s.label} sx={{
                bgcolor: alpha('#fff', 0.12), backdropFilter: 'blur(8px)',
                border: `1px solid ${alpha('#fff', 0.18)}`,
                borderRadius: 2, px: 2.5, py: 1.5, textAlign: 'center', minWidth: 84,
              }}>
                <Typography variant="h6" fontWeight={800} color="#fff" sx={{ lineHeight: 1.2 }}>{s.value}</Typography>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.68), fontWeight: 500 }}>{s.label}</Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Box>

      {/* ══ FEATURED VENDORS ═════════════════════════════════════════════ */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
        <WorkspacePremium sx={{ color: VV_COLORS.amber, fontSize: 22 }} />
        <Typography variant="h6" fontWeight={700}>Featured Vendors</Typography>
        <Chip label="Hand-picked" size="small" sx={{
          bgcolor: alpha(VV_COLORS.amber, 0.12), color: VV_COLORS.amber,
          fontWeight: 700, fontSize: 10, height: 22,
        }} />
        <Divider sx={{ flex: 1, ml: 0.5 }} />
      </Stack>

      <Grid container spacing={2} mb={4}>
        {featured.map(v => (
          <Grid item xs={12} sm={6} md={4} key={v.id}>
            <Card onClick={() => navigate(`/vendors/${v.id}`)} sx={{
              cursor: 'pointer', p: 0,
              border: `1.5px solid ${alpha(v.color, 0.2)}`,
              background: `linear-gradient(135deg, ${alpha(v.color, 0.07)}, ${alpha(v.color, 0.02)})`,
              transition: 'all 0.22s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 14px 36px ${alpha(v.color, 0.22)}`,
                borderColor: alpha(v.color, 0.45),
              },
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{
                    width: 54, height: 54, fontSize: 26,
                    bgcolor: alpha(v.color, 0.15), color: v.color,
                    borderRadius: '15px',
                    border: `2px solid ${alpha(v.color, 0.3)}`,
                    boxShadow: `0 4px 14px ${alpha(v.color, 0.22)}`,
                    flexShrink: 0,
                  }}>
                    {v.emoji}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={0.5} mb={0.3}>
                      <Typography variant="body1" fontWeight={800} noWrap>{v.name}</Typography>
                      {v.verified && <Verified sx={{ fontSize: 15, color: VV_COLORS.violetMid, flexShrink: 0 }} />}
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Stack direction="row" alignItems="center" spacing={0.4}>
                        <Star sx={{ fontSize: 13, color: '#FBBF24' }} />
                        <Typography variant="caption" fontWeight={700}>{v.rating}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.disabled">·</Typography>
                      <Typography variant="caption" color="text.secondary">{v.reviews.toLocaleString()} reviews</Typography>
                    </Stack>
                  </Box>
                  <Box sx={{
                    width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
                    bgcolor: alpha(v.color, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ArrowForward sx={{ fontSize: 16, color: v.color }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ══ FILTER BAR ═══════════════════════════════════════════════════ */}
      <Card sx={{ mb: 3, border: `1px solid ${alpha(VV_COLORS.slate400, 0.18)}` }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField
              placeholder="Search vendors, categories, tags…"
              value={query} onChange={e => setQ(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>,
                sx: { borderRadius: 2 },
              }}
              sx={{ flex: 1, maxWidth: { sm: 300 } }}
            />

            {/* Category chips inline */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap flex={1}>
              {CATEGORIES.map(cat => (
                <Chip key={cat} label={cat} size="small"
                  onClick={() => setCat(cat)}
                  sx={{
                    height: 30, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    bgcolor: catFilter === cat ? VV_COLORS.violetMid : 'transparent',
                    color: catFilter === cat ? '#fff' : VV_COLORS.slate600,
                    border: `1.5px solid ${catFilter === cat ? VV_COLORS.violetMid : alpha(VV_COLORS.slate400, 0.3)}`,
                    boxShadow: catFilter === cat ? `0 4px 12px ${alpha(VV_COLORS.violetMid, 0.3)}` : 'none',
                    '&:hover': {
                      bgcolor: catFilter === cat ? VV_COLORS.violetMid : alpha(VV_COLORS.violetMid, 0.08),
                      borderColor: VV_COLORS.violetMid,
                      color: catFilter === cat ? '#fff' : VV_COLORS.violetMid,
                    },
                  }}
                />
              ))}
            </Stack>

            {/* View toggle */}
            <Stack direction="row" sx={{ border: `1.5px solid ${alpha(VV_COLORS.slate400, 0.25)}`, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0 }}>
              {(['grid', 'list'] as const).map(mode => (
                <IconButton key={mode} size="small" onClick={() => setView(mode)} sx={{
                  borderRadius: 0, px: 1.25, py: 0.75,
                  bgcolor: viewMode === mode ? VV_COLORS.violetMid : 'transparent',
                  color: viewMode === mode ? '#fff' : 'text.secondary',
                  '&:hover': { bgcolor: viewMode === mode ? VV_COLORS.violetMid : alpha(VV_COLORS.violetMid, 0.07) },
                }}>
                  {mode === 'grid' ? <GridView fontSize="small" /> : <ViewList fontSize="small" />}
                </IconButton>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Results label */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Showing <strong style={{ color: VV_COLORS.violetMid }}>{filtered.length}</strong> vendor{filtered.length !== 1 ? 's' : ''}
          {catFilter !== 'All' && <> in <strong>{catFilter}</strong></>}
          {query && <> matching &ldquo;<strong>{query}</strong>&rdquo;</>}
        </Typography>
        {(query || catFilter !== 'All') && (
          <Button size="small" variant="text" onClick={() => { setQ(''); setCat('All'); }}
            sx={{ color: 'text.secondary', fontSize: 12, textDecoration: 'underline', p: 0 }}>
            Clear filters
          </Button>
        )}
      </Stack>

      {/* ══ EMPTY STATE ══════════════════════════════════════════════════ */}
      {filtered.length === 0 && (
        <Box textAlign="center" py={14}>
          <Typography fontSize={64} mb={2}>🔍</Typography>
          <Typography variant="h6" fontWeight={700} mb={1}>No vendors found</Typography>
          <Typography color="text.secondary" mb={3} maxWidth={360} mx="auto">
            Try a different search term or browse all categories to discover great vendors.
          </Typography>
          <Button variant="contained" onClick={() => { setQ(''); setCat('All'); }}
            sx={{ background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.violetLight})`, px: 4, borderRadius: 2 }}>
            Clear Filters
          </Button>
        </Box>
      )}

      {/* ══ GRID VIEW ════════════════════════════════════════════════════ */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <Grid container spacing={3}>
          {filtered.map(vendor => (
            <Grid item xs={12} sm={6} lg={4} key={vendor.id}>
              <Card
                onClick={() => navigate(`/vendors/${vendor.id}`)}
                sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  cursor: 'pointer', overflow: 'hidden',
                  border: `1px solid ${alpha(vendor.color, 0.15)}`,
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 20px 50px ${alpha(vendor.color, 0.2)}`,
                    borderColor: alpha(vendor.color, 0.4),
                  },
                }}
              >
                {/* ── Banner ── */}
                <Box sx={{
                  height: 108,
                  background: `linear-gradient(135deg, ${alpha(vendor.color, 0.15)} 0%, ${alpha(vendor.color, 0.32)} 100%)`,
                  position: 'relative', overflow: 'hidden', flexShrink: 0,
                }}>
                  {/* Orb decoration */}
                  <Box sx={{
                    position: 'absolute', width: 160, height: 160, borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(vendor.color, 0.22)} 0%, transparent 70%)`,
                    top: -40, right: -20,
                  }} />
                  <Box sx={{
                    position: 'absolute', width: 80, height: 80, borderRadius: '50%',
                    background: alpha('#fff', 0.08),
                    bottom: -20, left: 20,
                  }} />

                  {/* Emoji centred in banner */}
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Typography sx={{
                      fontSize: 48,
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
                    }}>
                      {vendor.emoji}
                    </Typography>
                  </Box>

                  {/* Badge top-right */}
                  {vendor.badge && (
                    <Box sx={{
                      position: 'absolute', top: 10, right: 10,
                      bgcolor: '#fff', color: vendor.color,
                      fontSize: 10, fontWeight: 800,
                      px: 1, py: 0.3, borderRadius: 1,
                      boxShadow: `0 2px 8px ${alpha(vendor.color, 0.3)}`,
                      letterSpacing: '0.04em',
                    }}>
                      {vendor.badge}
                    </Box>
                  )}
                </Box>

                {/* ── Card Body ── */}
                <CardContent sx={{ flex: 1, p: 2.5, pt: 2, display: 'flex', flexDirection: 'column' }}>

                  {/* Row 1: Avatar + Name + Verified + Category */}
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                    <Avatar sx={{
                      width: 46, height: 46, flexShrink: 0,
                      bgcolor: vendor.color, fontSize: 15, fontWeight: 800,
                      borderRadius: '13px',
                      border: `2.5px solid ${alpha('#fff', 0.9)}`,
                      boxShadow: `0 4px 14px ${alpha(vendor.color, 0.38)}`,
                    }}>
                      {vendor.initials}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25}>
                        <Typography variant="body1" fontWeight={800} noWrap>{vendor.name}</Typography>
                        {vendor.verified && <Verified sx={{ fontSize: 16, color: VV_COLORS.violetMid, flexShrink: 0 }} />}
                      </Stack>
                      <Chip label={vendor.category} size="small" sx={{
                        height: 18, fontSize: 10, fontWeight: 700,
                        bgcolor: alpha(vendor.color, 0.1),
                        color: vendor.color,
                        border: `1px solid ${alpha(vendor.color, 0.22)}`,
                      }} />
                    </Box>
                  </Stack>

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary" sx={{
                    mb: 2, lineHeight: 1.6, fontSize: 12.5,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40,
                  }}>
                    {vendor.desc}
                  </Typography>

                  {/* Tags */}
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={2} useFlexGap>
                    {vendor.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" sx={{
                        fontSize: 10, height: 20, fontWeight: 500,
                        borderColor: alpha(vendor.color, 0.25), color: 'text.secondary',
                      }} />
                    ))}
                  </Stack>

                  {/* Stats grid */}
                  <Grid container spacing={1} mb={2}>
                    {[
                      { label: 'Rating',   value: `${vendor.rating}★`, highlight: true },
                      { label: 'Reviews',  value: vendor.reviews >= 1000 ? `${(vendor.reviews / 1000).toFixed(0)}K` : String(vendor.reviews), highlight: false },
                      { label: 'Products', value: vendor.products >= 1000 ? `${(vendor.products / 1000).toFixed(1)}K` : String(vendor.products), highlight: false },
                    ].map(({ label, value, highlight }) => (
                      <Grid item xs={4} key={label}>
                        <Box sx={{
                          textAlign: 'center', py: 1, borderRadius: 1.5,
                          bgcolor: alpha(vendor.color, 0.06),
                          border: `1px solid ${alpha(vendor.color, 0.12)}`,
                        }}>
                          <Typography variant="body2" fontWeight={800} sx={{ color: highlight ? '#FBBF24' : vendor.color, lineHeight: 1.2 }}>
                            {value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Fulfillment */}
                  <Box mb={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <LocalShipping sx={{ fontSize: 13, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Fulfillment Rate</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={0.4}>
                        {vendor.fulfillment >= 96 && <CheckCircle sx={{ fontSize: 12, color: VV_COLORS.emerald }} />}
                        <Typography variant="caption" fontWeight={800} sx={{ color: vendor.fulfillment >= 96 ? VV_COLORS.emerald : vendor.color }}>
                          {vendor.fulfillment}%
                        </Typography>
                      </Stack>
                    </Stack>
                    <LinearProgress variant="determinate" value={vendor.fulfillment} sx={{
                      height: 6, borderRadius: 3,
                      bgcolor: alpha(vendor.color, 0.1),
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(90deg, ${alpha(vendor.color, 0.7)}, ${vendor.color})`,
                        borderRadius: 3,
                      },
                    }} />
                  </Box>

                  {/* Response time + revenue */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Schedule sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Responds <strong>{vendor.responseTime}</strong>
                      </Typography>
                    </Stack>
                    <Box sx={{
                      bgcolor: alpha(vendor.color, 0.1),
                      border: `1px solid ${alpha(vendor.color, 0.22)}`,
                      borderRadius: 1, px: 1, py: 0.25,
                    }}>
                      <Typography variant="caption" fontWeight={800} sx={{ color: vendor.color }}>
                        {vendor.revenue}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* CTA — pushed to bottom */}
                  <Box sx={{ mt: 'auto' }}>
                    <Button fullWidth variant="contained"
                      endIcon={<ArrowForward sx={{ fontSize: '15px !important' }} />}
                      onClick={e => { e.stopPropagation(); navigate(`/vendors/${vendor.id}`); }}
                      sx={{
                        background: `linear-gradient(135deg, ${vendor.color}, ${alpha(vendor.color, 0.78)})`,
                        boxShadow: `0 4px 14px ${alpha(vendor.color, 0.32)}`,
                        borderRadius: '10px', fontWeight: 700, py: 1.1,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${alpha(vendor.color, 0.88)}, ${vendor.color})`,
                          boxShadow: `0 6px 20px ${alpha(vendor.color, 0.42)}`,
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.18s ease',
                      }}>
                      Visit Store
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ══ LIST VIEW ════════════════════════════════════════════════════ */}
      {viewMode === 'list' && filtered.length > 0 && (
        <Stack spacing={2}>
          {filtered.map(vendor => (
            <Card key={vendor.id} onClick={() => navigate(`/vendors/${vendor.id}`)} sx={{
              cursor: 'pointer',
              border: `1px solid ${alpha(vendor.color, 0.15)}`,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateX(4px)',
                boxShadow: `0 8px 30px ${alpha(vendor.color, 0.15)}`,
                borderColor: alpha(vendor.color, 0.38),
              },
            }}>
              <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
                  {/* Avatar */}
                  <Avatar sx={{
                    width: 64, height: 64, fontSize: 30,
                    bgcolor: vendor.color, borderRadius: '18px', flexShrink: 0,
                    boxShadow: `0 4px 18px ${alpha(vendor.color, 0.38)}`,
                  }}>
                    {vendor.emoji}
                  </Avatar>

                  {/* Info */}
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5} flexWrap="wrap" useFlexGap>
                      <Typography variant="h6" fontWeight={700}>{vendor.name}</Typography>
                      {vendor.verified && <Verified sx={{ fontSize: 16, color: VV_COLORS.violetMid }} />}
                      {vendor.badge && (
                        <Box sx={{ bgcolor: vendor.color, color: '#fff', fontSize: 10, fontWeight: 700, px: 0.75, py: 0.2, borderRadius: 0.75 }}>
                          {vendor.badge}
                        </Box>
                      )}
                      <Chip label={vendor.category} size="small" sx={{
                        height: 20, fontSize: 10, fontWeight: 600,
                        bgcolor: alpha(vendor.color, 0.1), color: vendor.color,
                        border: `1px solid ${alpha(vendor.color, 0.2)}`,
                      }} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mb={1} sx={{ maxWidth: 540 }} noWrap>
                      {vendor.desc}
                    </Typography>
                    <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Star sx={{ fontSize: 14, color: '#FBBF24' }} />
                        <Typography variant="caption" fontWeight={700}>{vendor.rating}</Typography>
                        <Typography variant="caption" color="text.secondary">({vendor.reviews.toLocaleString()})</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{vendor.products.toLocaleString()} products</Typography>
                      <Typography variant="caption" color="text.secondary">Response: {vendor.responseTime}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.4}>
                        <TrendingUp sx={{ fontSize: 13, color: vendor.color }} />
                        <Typography variant="caption" fontWeight={700} sx={{ color: vendor.color }}>{vendor.revenue}</Typography>
                      </Stack>
                    </Stack>
                  </Box>

                  {/* CTA */}
                  <Button variant="outlined"
                    endIcon={<ArrowForward fontSize="small" />}
                    onClick={e => { e.stopPropagation(); navigate(`/vendors/${vendor.id}`); }}
                    sx={{
                      flexShrink: 0,
                      borderColor: vendor.color, color: vendor.color,
                      fontWeight: 700, borderRadius: '10px', px: 2.5,
                      border: `1.5px solid ${vendor.color}`,
                      '&:hover': {
                        bgcolor: alpha(vendor.color, 0.07),
                        transform: 'translateY(-1px)',
                        boxShadow: `0 4px 14px ${alpha(vendor.color, 0.22)}`,
                      },
                      transition: 'all 0.18s ease',
                    }}>
                    Visit Store
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Box pb={4} />
    </Box>
  );
}
