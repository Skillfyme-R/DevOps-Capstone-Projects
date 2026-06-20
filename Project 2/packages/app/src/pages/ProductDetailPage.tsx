import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Typography, Button, Stack, Rating, Chip, Avatar,
  Tabs, Tab, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  ArrowBack, ShoppingCart, Favorite, FavoriteBorder, LocalShipping,
  Shield, Refresh, Verified,
} from '@mui/icons-material';
import { useCartStore } from '../hooks/useCart';
import { toast } from 'react-toastify';
import { VV_COLORS } from '../styles/theme';
import { formatINR } from '../utils/currency';

export default function ProductDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const addItem      = useCartStore(s => s.addItem);
  const [qty, setQty]    = useState(1);
  const [tabIdx, setTab] = useState(0);
  const [wishlisted, setWL] = useState(false);

  const product = {
    id: id ?? '1',
    name: 'Wireless Noise-Cancelling Headphones XR1',
    price: 12499,
    originalPrice: 16999,
    rating: 4.8,
    reviews: 2341,
    vendor: 'SoundWave Store',
    vendorId: 'v1',
    image: '',
    description: 'Professional-grade active noise cancellation with 40-hour battery life. ' +
      'Featuring custom 40mm drivers for exceptional audio clarity, multi-point Bluetooth 5.3 ' +
      'connectivity, and premium memory foam ear cushions for all-day comfort.',
    features: ['Active Noise Cancellation', '40hr Battery', 'Bluetooth 5.3', 'Foldable Design', 'USB-C Charging'],
    stock: 87,
    sku: 'SW-XR1-BLK',
  };

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/catalog')} sx={{ mb: 3 }}>
        Back to Catalog
      </Button>

      <Grid container spacing={4}>
        {/* Image */}
        <Grid item xs={12} md={5}>
          <Box sx={{
            width: '100%', aspectRatio: '5/4', borderRadius: 3, boxShadow: 3,
            background: `linear-gradient(135deg, ${VV_COLORS.violetMid}22, ${VV_COLORS.violetMid}44)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{
              position: 'absolute', width: 260, height: 260, borderRadius: '50%',
              background: `radial-gradient(circle, ${VV_COLORS.violetMid}33, transparent 70%)`,
            }} />
            <Typography sx={{ fontSize: 120, lineHeight: 1, position: 'relative', zIndex: 1 }}>🎧</Typography>
            <Typography variant="caption" sx={{
              position: 'relative', zIndex: 1, mt: 2, color: VV_COLORS.violetMid, fontWeight: 700,
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              bgcolor: `${VV_COLORS.violetMid}22`, px: 2, py: 0.5, borderRadius: 2,
            }}>
              SoundWave XR1
            </Typography>
          </Box>
        </Grid>

        {/* Details */}
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            <Box>
              <Chip label="Electronics" size="small" color="primary" />
              <Typography variant="h4" fontWeight={800} mt={1}>{product.name}</Typography>
              <Typography variant="caption" color="text.secondary">SKU: {product.sku}</Typography>
            </Box>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Rating value={product.rating} precision={0.1} size="small" readOnly />
              <Typography variant="body2" color="text.secondary">
                {product.rating} ({product.reviews.toLocaleString()} reviews)
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="baseline" spacing={1}>
              <Typography variant="h3" fontWeight={900} color="primary">
                {formatINR(product.price)}
              </Typography>
              <Typography variant="h6" color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                {formatINR(product.originalPrice)}
              </Typography>
              <Chip
                label={`${Math.round((1 - product.price / product.originalPrice) * 100)}% OFF`}
                color="secondary" size="small" sx={{ fontWeight: 800 }}
              />
            </Stack>

            {/* Vendor */}
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: VV_COLORS.violetMid, fontSize: 12 }}>S</Avatar>
              <Typography variant="body2">Sold by <strong>{product.vendor}</strong></Typography>
              <Verified color="primary" sx={{ fontSize: 16 }} />
            </Stack>

            <Divider />

            {/* Features */}
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {product.features.map(f => (
                <Chip key={f} label={f} size="small" variant="outlined" />
              ))}
            </Stack>

            <Typography variant="body2" color="text.secondary">{product.description}</Typography>

            {/* Qty + cart */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton size="small" onClick={() => setQty(q => Math.max(1, q - 1))}>−</IconButton>
                <Typography fontWeight={700} sx={{ minWidth: 32, textAlign: 'center' }}>{qty}</Typography>
                <IconButton size="small" onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</IconButton>
              </Stack>
              <Button
                variant="contained"
                size="large"
                startIcon={<ShoppingCart />}
                sx={{ flex: 1 }}
                onClick={() => {
                  addItem({ productId: product.id, name: product.name, price: product.price,
                    quantity: qty, image: product.image, vendorId: product.vendorId,
                    vendorName: product.vendor, maxStock: product.stock });
                  toast.success(`Added ${qty}× ${product.name} to cart!`);
                }}
              >
                Add to Cart
              </Button>
              <Tooltip title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}>
                <IconButton onClick={() => setWL(w => !w)} color={wishlisted ? 'error' : 'default'}>
                  {wishlisted ? <Favorite /> : <FavoriteBorder />}
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Trust badges */}
            <Grid container spacing={1}>
              {[
                { icon: <LocalShipping />, label: 'Free shipping over $50' },
                { icon: <Shield />,        label: '30-day buyer protection' },
                { icon: <Refresh />,       label: 'Free returns' },
              ].map(({ icon, label }) => (
                <Grid item xs={4} key={label}>
                  <Stack alignItems="center" spacing={0.5} sx={{ p: 1, bgcolor: VV_COLORS.slate50, borderRadius: 2 }}>
                    <Box sx={{ color: VV_COLORS.violetMid }}>{icon}</Box>
                    <Typography variant="caption" textAlign="center" fontSize={10}>{label}</Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Grid>

        {/* Tabs */}
        <Grid item xs={12}>
          <Tabs value={tabIdx} onChange={(_, v) => setTab(v)}>
            <Tab label="Description" />
            <Tab label="Reviews (2341)" />
            <Tab label="Shipping & Returns" />
          </Tabs>
          <Divider />
          <Box p={3}>
            {tabIdx === 0 && (
              <Typography variant="body1">{product.description}</Typography>
            )}
            {tabIdx === 1 && (
              <Typography color="text.secondary">Customer reviews are loading...</Typography>
            )}
            {tabIdx === 2 && (
              <Stack spacing={1}>
                <Typography><strong>Free shipping</strong> on orders over $50</Typography>
                <Typography><strong>30-day returns</strong> — hassle-free, no questions asked</Typography>
                <Typography><strong>Estimated delivery:</strong> 3-5 business days</Typography>
              </Stack>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
