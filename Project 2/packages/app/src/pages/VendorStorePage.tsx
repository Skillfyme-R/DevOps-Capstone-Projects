import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip, Rating,
  Avatar, Button,
} from '@mui/material';
import { ArrowBack, Verified, Star, ShoppingCart } from '@mui/icons-material';
import { useCartStore } from '../hooks/useCart';
import { toast } from 'react-toastify';
import { VV_COLORS } from '../styles/theme';
import { formatINR } from '../utils/currency';

const PRODUCTS = [
  { id: 'p1', name: 'Headphones XR1',    price: 12499, rating: 4.8, reviews: 2341, color: VV_COLORS.violetMid, emoji: '🎧' },
  { id: 'p2', name: 'Smart Speaker Pro', price: 10080, rating: 4.7, reviews: 980,  color: '#3B82F6',           emoji: '🔊' },
  { id: 'p3', name: 'USB-C Hub 7-Port',  price: 4199,  rating: 4.5, reviews: 540,  color: '#10B981',           emoji: '🔌' },
];

const ProductImage = ({ color, emoji }: { color: string; emoji: string }) => (
  <Box sx={{
    height: 180,
    background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', borderRadius: '18px 18px 0 0',
  }}>
    <Box sx={{
      position: 'absolute', width: 120, height: 120, borderRadius: '50%',
      background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
    }} />
    <Typography sx={{ fontSize: 60, lineHeight: 1, position: 'relative', zIndex: 1 }}>{emoji}</Typography>
  </Box>
);

export default function VendorStorePage() {
  useParams();
  const navigate = useNavigate();
  const addItem  = useCartStore(s => s.addItem);

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/vendors')} sx={{ mb: 3 }}>
        All Vendors
      </Button>

      {/* Store banner */}
      <Card sx={{ mb: 4, overflow: 'hidden' }}>
        <Box sx={{
          background: `linear-gradient(135deg, ${VV_COLORS.violetDeep}, ${VV_COLORS.violetMid})`,
          p: 4, color: 'white',
        }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 32 }}>
              🎧
            </Avatar>
            <Box flex={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h4" fontWeight={800}>SoundWave Store</Typography>
                <Verified />
              </Stack>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                Premium audio equipment, headphones, and smart home devices
              </Typography>
              <Stack direction="row" spacing={2} mt={1.5} flexWrap="wrap">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Star sx={{ fontSize: 16 }} />
                  <Typography variant="body2">4.9 · 12,400 reviews</Typography>
                </Stack>
                <Typography variant="body2">234 products</Typography>
                <Typography variant="body2">Member since 2021</Typography>
                <Chip label="Top Seller" size="small" sx={{ bgcolor: VV_COLORS.amber, color: 'white', fontWeight: 700 }} />
              </Stack>
            </Box>
            <Stack spacing={1}>
              <Button variant="contained" sx={{ bgcolor: 'white', color: VV_COLORS.violetMid }}>Follow Store</Button>
              <Button variant="outlined" sx={{ borderColor: 'white', color: 'white' }}>Contact</Button>
            </Stack>
          </Stack>
        </Box>
      </Card>

      <Typography variant="h5" fontWeight={700} mb={3}>Products from SoundWave Store</Typography>

      <Grid container spacing={3}>
        {PRODUCTS.map(product => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <Card>
              <ProductImage color={product.color} emoji={product.emoji} />
              <CardContent>
                <Typography variant="body1" fontWeight={600}>{product.name}</Typography>
                <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                  <Rating value={product.rating} precision={0.1} size="small" readOnly />
                  <Typography variant="caption" color="text.secondary">({product.reviews.toLocaleString()})</Typography>
                </Stack>
                <Typography variant="h6" fontWeight={800} color="primary" mt={1}>
                  {formatINR(product.price)}
                </Typography>
                <Button
                  fullWidth variant="contained" startIcon={<ShoppingCart />} size="small" sx={{ mt: 1.5 }}
                  onClick={() => {
                    addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1,
                      image: '', vendorId: 'v1', vendorName: 'SoundWave Store', maxStock: 50 });
                    toast.success(`${product.name} added to cart!`);
                  }}
                >
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
