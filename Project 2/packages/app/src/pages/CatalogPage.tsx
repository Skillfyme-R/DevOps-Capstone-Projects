import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardActions, Typography,
  TextField, InputAdornment, Button, Chip, Stack, Rating, IconButton,
  Select, MenuItem, FormControl, InputLabel, Slider, Tooltip, alpha,
  Avatar, Divider,
} from '@mui/material';
import {
  Search, Favorite, FavoriteBorder, ShoppingCart,
  TuneRounded, GridView, ViewList, ArrowUpward,
  LocalShipping, Verified as VerifiedIcon,
} from '@mui/icons-material';
import { useCartStore } from '../hooks/useCart';
import { toast } from 'react-toastify';
import { VV_COLORS } from '../styles/theme';
import { formatINR } from '../utils/currency';

/* ─── Product Image ─────────────────────────────────────────────────── */
const ProductImage = ({ color, emoji, name }: { color: string; emoji: string; name: string }) => (
  <Box sx={{
    height: 200,
    background: `linear-gradient(145deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.22)} 100%)`,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  }}>
    <Box sx={{
      position: 'absolute', width: 160, height: 160, borderRadius: '50%',
      background: `radial-gradient(circle, ${alpha(color, 0.18)} 0%, transparent 70%)`,
    }} />
    <Box sx={{
      position: 'absolute', top: -24, right: -24, width: 90, height: 90,
      borderRadius: '50%', background: alpha(color, 0.08),
    }} />
    <Typography sx={{
      fontSize: 72, lineHeight: 1, position: 'relative', zIndex: 1,
      filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.18))',
    }}>
      {emoji}
    </Typography>
    <Box sx={{
      position: 'relative', zIndex: 1, mt: 1.5,
      bgcolor: alpha(color, 0.14), px: 1.5, py: 0.4, borderRadius: 10,
      border: `1px solid ${alpha(color, 0.28)}`,
    }}>
      <Typography sx={{ color, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {name.split(' ').slice(0, 2).join(' ')}
      </Typography>
    </Box>
  </Box>
);

/* ─── Data ────────────────────────────────────────────────────────────── */
const PRODUCTS = [
  { id: '1', name: 'Wireless Noise-Cancelling Headphones', category: 'Electronics', price: 12499, originalPrice: 16999, rating: 4.7, reviews: 2341, emoji: '🎧', color: VV_COLORS.violetMid, vendor: 'SoundWave Store', badge: 'Best Seller' },
  { id: '2', name: 'Organic Cotton Joggers',               category: 'Fashion',     price: 4999,  originalPrice: 6999,  rating: 4.5, reviews: 876,  emoji: '👖', color: VV_COLORS.coral,     vendor: 'EcoThreads',     badge: 'Eco Pick' },
  { id: '3', name: 'Smart LED Desk Lamp',                  category: 'Home',        price: 3499,  originalPrice: null,  rating: 4.3, reviews: 1120, emoji: '💡', color: VV_COLORS.emerald,   vendor: 'LuminaHome',     badge: null },
  { id: '4', name: 'Stainless Steel Water Bottle 32oz',    category: 'Sports',      price: 1999,  originalPrice: 2999,  rating: 4.8, reviews: 5200, emoji: '🍶', color: VV_COLORS.amber,     vendor: 'PureHydration',  badge: 'Top Rated' },
  { id: '5', name: 'Vitamin C Brightening Serum 30ml',     category: 'Beauty',      price: 2699,  originalPrice: null,  rating: 4.6, reviews: 3100, emoji: '✨', color: '#EC4899',           vendor: 'GlowLab',        badge: null },
  { id: '6', name: 'Mechanical Keyboard TKL RGB',          category: 'Electronics', price: 7499,  originalPrice: 9499,  rating: 4.4, reviews: 740,  emoji: '⌨️', color: '#3B82F6',           vendor: 'KeyTech',        badge: 'New' },
  { id: '7', name: 'Yoga Mat Non-Slip 6mm Premium',        category: 'Sports',      price: 3199,  originalPrice: null,  rating: 4.5, reviews: 2890, emoji: '🧘', color: '#14B8A6',           vendor: 'FlexFit',        badge: null },
  { id: '8', name: 'The Lean Startup (Paperback)',          category: 'Books',       price: 1249,  originalPrice: 1699,  rating: 4.9, reviews: 6700, emoji: '📖', color: '#8B5CF6',           vendor: 'BookHaven',      badge: 'Classic' },
];

const CATEGORIES = [
  { label: 'All',         emoji: '🛍️', color: VV_COLORS.violetMid },
  { label: 'Electronics', emoji: '📱', color: VV_COLORS.violetMid },
  { label: 'Fashion',     emoji: '👗', color: VV_COLORS.coral },
  { label: 'Home',        emoji: '🏡', color: VV_COLORS.emerald },
  { label: 'Sports',      emoji: '⚽', color: VV_COLORS.amber },
  { label: 'Beauty',      emoji: '💄', color: '#EC4899' },
  { label: 'Books',       emoji: '📚', color: '#8B5CF6' },
];

export default function CatalogPage() {
  const [query, setQuery]           = useState('');
  const [category, setCategory]     = useState('All');
  const [sortBy, setSortBy]         = useState('relevance');
  const [priceRange, setPriceRange] = useState<number[]>([0, 25000]);
  const [wishlist, setWishlist]     = useState<string[]>([]);
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('grid');
  const addItem = useCartStore(s => s.addItem);

  const handleAddToCart = (p: typeof PRODUCTS[0]) => {
    addItem({ productId: p.id, name: p.name, price: p.price, quantity: 1, image: '', vendorId: p.id + '-v', vendorName: p.vendor, maxStock: 50 });
    toast.success('Added to cart!', { icon: '🛒', style: { borderRadius: '12px', fontWeight: 600 } });
  };

  const toggleWishlist = (id: string) =>
    setWishlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filtered = PRODUCTS
    .filter(p =>
      (p.name.toLowerCase().includes(query.toLowerCase()) || p.vendor.toLowerCase().includes(query.toLowerCase())) &&
      (category === 'All' || p.category === category) &&
      p.price >= priceRange[0] && p.price <= priceRange[1],
    )
    .sort((a, b) =>
      sortBy === 'price-asc' ? a.price - b.price :
      sortBy === 'price-desc' ? b.price - a.price :
      sortBy === 'rating' ? b.rating - a.rating : 0,
    );

  const activeCatColor = CATEGORIES.find(c => c.label === category)?.color ?? VV_COLORS.violetMid;

  return (
    <Box>

      {/* ══ HERO BANNER ══════════════════════════════════════════════════ */}
      <Box sx={{
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 60%, ${VV_COLORS.violetLight} 100%)`,
        borderRadius: 3, p: { xs: 3, md: 4 }, mb: 4,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 240, height: 240, borderRadius: '50%', background: alpha('#fff', 0.05), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 140, width: 180, height: 180, borderRadius: '50%', background: alpha('#fff', 0.04), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: '30%', left: '40%', width: 120, height: 120, borderRadius: '50%', background: alpha('#fff', 0.03), pointerEvents: 'none' }} />

        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
          {/* Left: icon + title */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{
              width: 58, height: 58, borderRadius: 2.5,
              background: alpha('#fff', 0.14),
              backdropFilter: 'blur(8px)',
              border: `1.5px solid ${alpha('#fff', 0.25)}`,
            }}>
              <ShoppingCart sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#fff" sx={{ letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                Product Catalog
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.72), mt: 0.5 }}>
                {PRODUCTS.length} products from verified vendors · Free shipping over ₹4,000
              </Typography>
            </Box>
          </Stack>

          {/* Right: stat chips */}
          <Stack direction="row" spacing={2} flexShrink={0}>
            {[
              { value: '50K+',  label: 'Products' },
              { value: '7',     label: 'Categories' },
              { value: '4.7★',  label: 'Avg Rating' },
            ].map(s => (
              <Box key={s.label} sx={{
                bgcolor: alpha('#fff', 0.12),
                backdropFilter: 'blur(8px)',
                border: `1px solid ${alpha('#fff', 0.18)}`,
                borderRadius: 2, px: 2.5, py: 1.5,
                textAlign: 'center', minWidth: 84,
              }}>
                <Typography variant="h6" fontWeight={800} color="#fff" sx={{ lineHeight: 1.2 }}>{s.value}</Typography>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.68), fontWeight: 500 }}>{s.label}</Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Box>

      {/* ══ CATEGORY PILLS ═══════════════════════════════════════════════ */}
      <Stack direction="row" spacing={1} flexWrap="wrap" mb={3} useFlexGap>
        {CATEGORIES.map(({ label, emoji, color }) => {
          const active = category === label;
          return (
            <Chip
              key={label}
              label={`${emoji}  ${label}`}
              onClick={() => setCategory(label)}
              sx={{
                height: 38, fontWeight: 700, fontSize: 13, px: 0.5,
                cursor: 'pointer', transition: 'all 0.18s ease',
                bgcolor: active ? color : 'transparent',
                color: active ? '#fff' : VV_COLORS.slate600,
                border: `1.5px solid ${active ? color : alpha(VV_COLORS.slate400, 0.3)}`,
                boxShadow: active ? `0 4px 16px ${alpha(color, 0.38)}` : 'none',
                '&:hover': {
                  bgcolor: active ? color : alpha(color, 0.08),
                  borderColor: color,
                  color: active ? '#fff' : color,
                  transform: 'translateY(-1px)',
                  boxShadow: `0 4px 14px ${alpha(color, 0.25)}`,
                },
              }}
            />
          );
        })}
      </Stack>

      {/* ══ FILTER BAR ═══════════════════════════════════════════════════ */}
      <Card sx={{
        mb: 3,
        border: `1px solid ${alpha(activeCatColor, 0.15)}`,
        boxShadow: `0 2px 12px ${alpha(activeCatColor, 0.06)}`,
      }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth size="small"
                placeholder="Search products or vendors…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 },
                }}
              />
            </Grid>

            {/* Sort */}
            <Grid item xs={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort by</InputLabel>
                <Select value={sortBy} label="Sort by" onChange={e => setSortBy(e.target.value)} sx={{ borderRadius: 2 }}>
                  <MenuItem value="relevance">Relevance</MenuItem>
                  <MenuItem value="rating">⭐ Top Rated</MenuItem>
                  <MenuItem value="price-asc">Price: Low → High</MenuItem>
                  <MenuItem value="price-desc">Price: High → Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Price slider */}
            <Grid item xs={6} md={3.5}>
              <Box px={1}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <TuneRounded sx={{ fontSize: 13, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Price Range</Typography>
                  </Stack>
                  <Typography variant="caption" fontWeight={800} sx={{ color: activeCatColor }}>
                    {formatINR(priceRange[0])} – {formatINR(priceRange[1])}
                  </Typography>
                </Stack>
                <Slider
                  value={priceRange}
                  onChange={(_, v) => setPriceRange(v as number[])}
                  min={0} max={25000} step={500}
                  sx={{
                    color: activeCatColor, py: 0.5,
                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                    '& .MuiSlider-rail': { opacity: 0.22 },
                  }}
                />
              </Box>
            </Grid>

            {/* View toggle + count */}
            <Grid item xs={12} md={2}>
              <Stack direction="row" alignItems="center" justifyContent={{ xs: 'space-between', md: 'flex-end' }} spacing={1.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  <strong style={{ color: activeCatColor }}>{filtered.length}</strong> found
                </Typography>
                <Stack direction="row" sx={{ border: `1.5px solid ${alpha(VV_COLORS.slate400, 0.25)}`, borderRadius: 1.5, overflow: 'hidden' }}>
                  {(['grid', 'list'] as const).map(mode => (
                    <IconButton key={mode} size="small" onClick={() => setViewMode(mode)} sx={{
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
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ══ QUICK STATS BAR ══════════════════════════════════════════════ */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={3} spacing={1}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <LocalShipping sx={{ fontSize: 15, color: VV_COLORS.emerald }} />
            <Typography variant="caption" fontWeight={600} sx={{ color: VV_COLORS.emerald }}>Free shipping over ₹4,000</Typography>
          </Stack>
          <Typography variant="caption" color="text.disabled">·</Typography>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <VerifiedIcon sx={{ fontSize: 14, color: VV_COLORS.violetMid }} />
            <Typography variant="caption" fontWeight={600} color="text.secondary">All from verified vendors</Typography>
          </Stack>
        </Stack>
        {(category !== 'All' || query) && (
          <Button size="small" variant="text" onClick={() => { setQuery(''); setCategory('All'); setPriceRange([0, 25000]); }}
            sx={{ color: 'text.secondary', fontSize: 12, textDecoration: 'underline', p: 0 }}>
            Clear filters
          </Button>
        )}
      </Stack>

      <Divider sx={{ mb: 3, opacity: 0.4 }} />

      {/* ══ EMPTY STATE ══════════════════════════════════════════════════ */}
      {filtered.length === 0 && (
        <Box textAlign="center" py={14}>
          <Typography fontSize={64} mb={2}>🔍</Typography>
          <Typography variant="h6" fontWeight={700} mb={1}>No products found</Typography>
          <Typography color="text.secondary" mb={3} maxWidth={360} mx="auto">
            Try adjusting your filters, category, or search terms to find what you&apos;re looking for.
          </Typography>
          <Button variant="contained" onClick={() => { setQuery(''); setCategory('All'); setPriceRange([0, 25000]); }}
            sx={{ background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.violetLight})`, px: 4, borderRadius: 2 }}>
            Clear All Filters
          </Button>
        </Box>
      )}

      {/* ══ GRID VIEW ════════════════════════════════════════════════════ */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <Grid container spacing={3}>
          {filtered.map(product => {
            const inWishlist = wishlist.includes(product.id);
            const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : null;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  position: 'relative', overflow: 'hidden',
                  border: `1px solid ${alpha(product.color, 0.14)}`,
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 20px 50px ${alpha(product.color, 0.22)}`,
                    borderColor: alpha(product.color, 0.4),
                  },
                }}>
                  {/* Wishlist btn */}
                  <Tooltip title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}>
                    <IconButton size="small" onClick={() => toggleWishlist(product.id)} sx={{
                      position: 'absolute', top: 10, right: 10, zIndex: 3,
                      width: 32, height: 32,
                      bgcolor: alpha('#fff', 0.92), backdropFilter: 'blur(8px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      '&:hover': { bgcolor: '#fff', transform: 'scale(1.12)' },
                      transition: 'all 0.18s',
                    }}>
                      {inWishlist
                        ? <Favorite sx={{ fontSize: 16, color: VV_COLORS.coral }} />
                        : <FavoriteBorder sx={{ fontSize: 16, color: 'text.secondary' }} />}
                    </IconButton>
                  </Tooltip>

                  {/* Badge */}
                  {product.badge && (
                    <Box sx={{
                      position: 'absolute', top: 10, left: 10, zIndex: 3,
                      bgcolor: product.color, color: '#fff',
                      fontSize: 10, fontWeight: 800, px: 1, py: 0.3, borderRadius: 1,
                      boxShadow: `0 2px 8px ${alpha(product.color, 0.45)}`,
                      letterSpacing: '0.04em',
                    }}>
                      {product.badge}
                    </Box>
                  )}

                  {/* Discount badge */}
                  {discount && (
                    <Box sx={{
                      position: 'absolute', top: product.badge ? 36 : 10, left: 10, zIndex: 3,
                      bgcolor: VV_COLORS.coral, color: '#fff',
                      fontSize: 10, fontWeight: 800, px: 1, py: 0.3, borderRadius: 1,
                    }}>
                      -{discount}%
                    </Box>
                  )}

                  <ProductImage color={product.color} emoji={product.emoji} name={product.name} />

                  <CardContent sx={{ flex: 1, pt: 2, pb: 1, px: 2.5 }}>
                    {/* Category label */}
                    <Typography variant="caption" fontWeight={700} sx={{
                      color: product.color, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10,
                    }}>
                      {product.category}
                    </Typography>

                    {/* Name — fixed 2-line height so all cards align */}
                    <Typography variant="body2" fontWeight={700} mt={0.5} mb={0.75} sx={{
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', lineHeight: 1.45, minHeight: 42,
                    }}>
                      {product.name}
                    </Typography>

                    {/* Vendor */}
                    <Typography variant="caption" color="text.disabled" display="block" mb={1} fontWeight={500}>
                      by {product.vendor}
                    </Typography>

                    {/* Rating */}
                    <Stack direction="row" alignItems="center" spacing={0.75} mb={1.5}>
                      <Rating value={product.rating} precision={0.1} size="small" readOnly
                        sx={{ '& .MuiRating-iconFilled': { color: '#FBBF24' } }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {product.rating} ({product.reviews.toLocaleString()})
                      </Typography>
                    </Stack>

                    {/* Price */}
                    <Stack direction="row" alignItems="baseline" spacing={1}>
                      <Typography variant="h6" fontWeight={800} sx={{ color: product.color, letterSpacing: '-0.02em' }}>
                        {formatINR(product.price)}
                      </Typography>
                      {product.originalPrice && (
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                          {formatINR(product.originalPrice)}
                        </Typography>
                      )}
                      {discount && (
                        <Typography variant="caption" fontWeight={700} sx={{ color: VV_COLORS.emerald }}>
                          {discount}% off
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ px: 2.5, pb: 2.5, pt: 1 }}>
                    <Button fullWidth variant="contained"
                      startIcon={<ShoppingCart sx={{ fontSize: '16px !important' }} />}
                      onClick={() => handleAddToCart(product)}
                      sx={{
                        background: `linear-gradient(135deg, ${product.color}, ${alpha(product.color, 0.78)})`,
                        boxShadow: `0 4px 14px ${alpha(product.color, 0.32)}`,
                        borderRadius: '10px', py: 1.1, fontWeight: 700, fontSize: 13,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${alpha(product.color, 0.88)}, ${product.color})`,
                          boxShadow: `0 6px 20px ${alpha(product.color, 0.42)}`,
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.18s ease',
                      }}>
                      Add to Cart
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ══ LIST VIEW ════════════════════════════════════════════════════ */}
      {viewMode === 'list' && filtered.length > 0 && (
        <Stack spacing={2}>
          {filtered.map(product => {
            const inWishlist = wishlist.includes(product.id);
            const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : null;

            return (
              <Card key={product.id} sx={{
                border: `1px solid ${alpha(product.color, 0.14)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateX(4px)',
                  boxShadow: `0 8px 30px ${alpha(product.color, 0.16)}`,
                  borderColor: alpha(product.color, 0.35),
                },
              }}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
                    {/* Emoji box */}
                    <Box sx={{
                      width: { xs: '100%', sm: 96 }, height: { xs: 110, sm: 96 },
                      flexShrink: 0, borderRadius: 2.5,
                      background: `linear-gradient(145deg, ${alpha(product.color, 0.1)}, ${alpha(product.color, 0.22)})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 48, border: `1px solid ${alpha(product.color, 0.18)}`,
                    }}>
                      {product.emoji}
                    </Box>

                    {/* Info */}
                    <Box flex={1} minWidth={0}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={0.5} flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" fontWeight={700} sx={{ color: product.color, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 10 }}>
                          {product.category}
                        </Typography>
                        {product.badge && (
                          <Box sx={{ bgcolor: product.color, color: '#fff', fontSize: 10, fontWeight: 700, px: 0.75, py: 0.15, borderRadius: 0.75 }}>
                            {product.badge}
                          </Box>
                        )}
                        {discount && (
                          <Box sx={{ bgcolor: VV_COLORS.coral, color: '#fff', fontSize: 10, fontWeight: 700, px: 0.75, py: 0.15, borderRadius: 0.75 }}>
                            -{discount}%
                          </Box>
                        )}
                      </Stack>
                      <Typography variant="body1" fontWeight={700} mb={0.25} noWrap>{product.name}</Typography>
                      <Typography variant="caption" color="text.disabled" mb={0.75} display="block" fontWeight={500}>by {product.vendor}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Rating value={product.rating} precision={0.1} size="small" readOnly
                          sx={{ '& .MuiRating-iconFilled': { color: '#FBBF24' } }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {product.rating} ({product.reviews.toLocaleString()})
                        </Typography>
                      </Stack>
                    </Box>

                    {/* Price + actions */}
                    <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1.5} flexShrink={0}>
                      <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: product.color, letterSpacing: '-0.02em' }}>
                          {formatINR(product.price)}
                        </Typography>
                        {product.originalPrice && (
                          <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                            {formatINR(product.originalPrice)}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => toggleWishlist(product.id)} sx={{
                          border: `1.5px solid ${alpha(inWishlist ? VV_COLORS.coral : VV_COLORS.slate400, 0.35)}`,
                          color: inWishlist ? VV_COLORS.coral : 'text.disabled',
                          '&:hover': { borderColor: VV_COLORS.coral, color: VV_COLORS.coral },
                        }}>
                          {inWishlist ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                        </IconButton>
                        <Button variant="contained" size="small"
                          startIcon={<ShoppingCart fontSize="small" />}
                          onClick={() => handleAddToCart(product)}
                          sx={{
                            background: `linear-gradient(135deg, ${product.color}, ${alpha(product.color, 0.78)})`,
                            borderRadius: '8px', fontWeight: 700,
                            boxShadow: `0 4px 12px ${alpha(product.color, 0.3)}`,
                            '&:hover': { boxShadow: `0 6px 18px ${alpha(product.color, 0.42)}`, transform: 'translateY(-1px)' },
                          }}>
                          Add to Cart
                        </Button>
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* ══ TRENDING SECTION ═════════════════════════════════════════════ */}
      {filtered.length > 0 && (
        <Box mt={6} mb={2}>
          <Stack direction="row" alignItems="center" spacing={1} mb={3}>
            <ArrowUpward sx={{ color: VV_COLORS.emerald, fontSize: 20 }} />
            <Typography variant="h6" fontWeight={700}>Trending Right Now</Typography>
            <Divider sx={{ flex: 1, ml: 1 }} />
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {['🎧 Headphones', '👟 Running Shoes', '📱 Phone Accessories', '🧴 Skincare Kits', '📚 Bestsellers', '🏋️ Fitness Gear'].map(tag => (
              <Chip key={tag} label={tag} variant="outlined" onClick={() => setQuery(tag.split(' ').slice(1).join(' '))}
                sx={{
                  fontWeight: 600, cursor: 'pointer', height: 34,
                  borderColor: alpha(VV_COLORS.violetMid, 0.25), color: 'text.secondary',
                  '&:hover': { borderColor: VV_COLORS.violetMid, color: VV_COLORS.violetMid, bgcolor: alpha(VV_COLORS.violetMid, 0.05) },
                }} />
            ))}
          </Stack>
        </Box>
      )}

      <Box pb={4} />
    </Box>
  );
}
