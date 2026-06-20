import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardActions, Typography,
  Stack, Button, IconButton, Chip, Avatar, alpha,
} from '@mui/material';
import {
  Delete, ShoppingCart, Favorite, Share, FavoriteBorder,
} from '@mui/icons-material';
import { useCartStore } from '../hooks/useCart';
import { toast } from 'react-toastify';
import { formatINR } from '../utils/currency';
import { VV_COLORS } from '../styles/theme';

const WISHLIST_ITEMS = [
  { id: 'p3', name: 'USB-C Hub 7-Port',        price: 4199,  originalPrice: 5879, color: '#10B981', emoji: '🔌', vendor: 'KeyTech', inStock: true,  badge: '29% OFF' },
  { id: 'p5', name: 'Vitamin C Serum 30ml',    price: 2699,  originalPrice: 2699, color: '#EC4899', emoji: '✨', vendor: 'GlowLab', inStock: true,  badge: null      },
  { id: 'p7', name: 'Yoga Mat Non-Slip 6mm',   price: 3199,  originalPrice: 4629, color: '#14B8A6', emoji: '🧘', vendor: 'FlexFit', inStock: true,  badge: '31% OFF' },
  { id: 'p8', name: 'Mechanical Keyboard TKL', price: 7499,  originalPrice: 7499, color: '#3B82F6', emoji: '⌨️', vendor: 'KeyTech', inStock: false, badge: null      },
];

type WishlistItem = typeof WISHLIST_ITEMS[0];

const ProductImage = ({ color, emoji, name }: { color: string; emoji: string; name: string }) => (
  <Box sx={{
    height: 200,
    background: `linear-gradient(135deg, ${color}18 0%, ${color}38 50%, ${color}20 100%)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '18px 18px 0 0',
  }}>
    <Box sx={{
      position: 'absolute',
      width: 160, height: 160,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color}2a 0%, transparent 70%)`,
    }} />
    <Box sx={{
      position: 'absolute',
      top: -20, right: -20,
      width: 80, height: 80,
      borderRadius: '50%',
      background: alpha(color, 0.1),
    }} />
    <Typography sx={{
      fontSize: 68,
      lineHeight: 1,
      position: 'relative',
      zIndex: 1,
      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
    }}>
      {emoji}
    </Typography>
    <Typography variant="caption" sx={{
      position: 'relative', zIndex: 1,
      mt: 1.5, color,
      fontWeight: 700,
      fontSize: 10,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      bgcolor: alpha(color, 0.15),
      px: 1.5, py: 0.4,
      borderRadius: 2,
      border: `1px solid ${alpha(color, 0.3)}`,
    }}>
      {name.split(' ').slice(0, 2).join(' ')}
    </Typography>
  </Box>
);

const STORAGE_KEY = 'vv-wishlist-removed';

function getPersistedItems(): WishlistItem[] {
  try {
    const removed: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return WISHLIST_ITEMS.filter(i => !removed.includes(i.id));
  } catch {
    return WISHLIST_ITEMS;
  }
}

function persistRemove(id: string) {
  try {
    const removed: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!removed.includes(id)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...removed, id]));
    }
  } catch { /* ignore */ }
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>(getPersistedItems);
  const addToCart = useCartStore(s => s.addItem);

  const remove = (id: string, name: string) => {
    persistRemove(id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.info(`${name} removed from wishlist`);
  };

  const moveToCart = (item: WishlistItem) => {
    addToCart({
      productId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: '',
      vendorId: 'v1',
      vendorName: item.vendor,
      maxStock: 50,
    });
    persistRemove(item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
    toast.success(`${item.name} moved to cart!`);
  };

  const totalValue = items.reduce((s, i) => s + i.price, 0);
  const totalSavings = items.reduce((s, i) => s + Math.max(0, i.originalPrice - i.price), 0);

  return (
    <Box>
      {/* Page Header Banner */}
      <Box sx={{
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, #A855F7 55%, '#EC4899' 100%)`,
        backgroundImage: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, #7C3AED 50%, #BE185D 100%)`,
        borderRadius: 3,
        p: { xs: 3, md: 4 },
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: -50, right: -50,
          width: 220, height: 220, borderRadius: '50%',
          background: alpha('#fff', 0.06),
        }} />
        <Box sx={{
          position: 'absolute', bottom: -40, right: 140,
          width: 160, height: 160, borderRadius: '50%',
          background: alpha('#fff', 0.04),
        }} />

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{
              bgcolor: alpha('#fff', 0.2),
              width: 58, height: 58,
              backdropFilter: 'blur(8px)',
              border: `2px solid ${alpha('#fff', 0.3)}`,
            }}>
              <Favorite sx={{ fontSize: 28, color: '#fff' }} />
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h5" fontWeight={800} color="#fff" sx={{ letterSpacing: '-0.02em' }}>
                  My Wishlist
                </Typography>
                <Chip
                  label={`${items.length} item${items.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    bgcolor: alpha('#fff', 0.2),
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    height: 24,
                    border: `1px solid ${alpha('#fff', 0.35)}`,
                  }}
                />
              </Stack>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), mt: 0.25 }}>
                Items you love, saved for later
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<FavoriteBorder />}
            href="/catalog"
            sx={{
              color: '#fff',
              borderColor: alpha('#fff', 0.4),
              '&:hover': {
                borderColor: '#fff',
                bgcolor: alpha('#fff', 0.1),
              },
            }}
          >
            Browse More
          </Button>
        </Stack>
      </Box>

      {/* Summary Bar */}
      {items.length > 0 && (
        <Box sx={{
          p: 2.5,
          borderRadius: 2.5,
          bgcolor: alpha(VV_COLORS.violetMid, 0.05),
          border: `1px solid ${alpha(VV_COLORS.violetMid, 0.15)}`,
          mb: 3,
        }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Total Value
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: VV_COLORS.violetMid }}>
                  {formatINR(totalValue)}
                </Typography>
              </Box>
              {totalSavings > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    You Save
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: VV_COLORS.emerald }}>
                    {formatINR(totalSavings)}
                  </Typography>
                </Box>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {items.filter(i => i.inStock).length} of {items.length} items in stock
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Empty State */}
      {items.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            px: 4,
            borderRadius: 3,
            border: `2px dashed ${VV_COLORS.slate200}`,
            bgcolor: VV_COLORS.slate50,
          }}
        >
          <Typography sx={{ fontSize: 72, lineHeight: 1, mb: 2 }}>🤍</Typography>
          <Typography variant="h5" fontWeight={700} color="text.primary" mb={1}>
            Your wishlist is empty
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3} sx={{ maxWidth: 320, mx: 'auto' }}>
            Save items you love and come back to them anytime. Start exploring our catalog!
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<ShoppingCart />}
            href="/catalog"
            sx={{
              background: `linear-gradient(135deg, ${VV_COLORS.violetLight} 0%, ${VV_COLORS.violetMid} 50%, ${VV_COLORS.violetDeep} 100%)`,
              px: 4,
              py: 1.5,
            }}
          >
            Browse Products
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {items.map(item => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 16px 40px ${alpha(item.color, 0.22)}, 0 4px 12px rgba(0,0,0,0.08)`,
                  },
                  '&:hover .product-actions-overlay': {
                    opacity: 1,
                  },
                }}
              >
                {/* Image Area */}
                <Box sx={{ position: 'relative' }}>
                  <ProductImage color={item.color} emoji={item.emoji} name={item.name} />

                  {/* Discount Badge */}
                  {item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 10, left: 10,
                        zIndex: 2,
                        fontWeight: 800,
                        fontSize: 11,
                        bgcolor: VV_COLORS.coral,
                        color: '#fff',
                        boxShadow: `0 2px 8px ${alpha(VV_COLORS.coral, 0.4)}`,
                      }}
                    />
                  )}

                  {/* Hover Action Buttons */}
                  <Stack
                    className="product-actions-overlay"
                    direction="row"
                    spacing={1}
                    sx={{
                      position: 'absolute',
                      top: 10, right: 10,
                      zIndex: 3,
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => toast.info('Link copied to clipboard!')}
                      sx={{
                        bgcolor: alpha('#fff', 0.92),
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        '&:hover': { bgcolor: '#fff', transform: 'scale(1.1)' },
                        width: 32, height: 32,
                      }}
                    >
                      <Share sx={{ fontSize: 15, color: VV_COLORS.slate600 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => remove(item.id, item.name)}
                      sx={{
                        bgcolor: alpha('#fff', 0.92),
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        '&:hover': { bgcolor: '#fff', transform: 'scale(1.1)' },
                        width: 32, height: 32,
                      }}
                    >
                      <Delete sx={{ fontSize: 15, color: VV_COLORS.coral }} />
                    </IconButton>
                  </Stack>

                  {/* Out of Stock Overlay */}
                  {!item.inStock && (
                    <Box sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'rgba(15,23,42,0.5)',
                      backdropFilter: 'blur(2px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '18px 18px 0 0',
                      zIndex: 2,
                    }}>
                      <Chip
                        label="Out of Stock"
                        sx={{
                          bgcolor: alpha('#fff', 0.92),
                          color: VV_COLORS.slate800,
                          fontWeight: 700,
                          fontSize: 12,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        }}
                      />
                    </Box>
                  )}
                </Box>

                {/* Card Content */}
                <CardContent sx={{ flex: 1, p: 2.5, pb: 1 }}>
                  {/* Vendor */}
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Avatar sx={{
                      width: 20, height: 20,
                      bgcolor: alpha(item.color, 0.18),
                      color: item.color,
                      fontSize: 10,
                      fontWeight: 800,
                    }}>
                      {item.vendor.slice(0, 1)}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {item.vendor}
                    </Typography>
                  </Stack>

                  {/* Product Name */}
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    mb={0.75}
                    sx={{ lineHeight: 1.3, color: VV_COLORS.slate800 }}
                  >
                    {item.name}
                  </Typography>

                  {/* Rating Placeholder */}
                  <Stack direction="row" spacing={0.5} alignItems="center" mb={1.25}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Box key={star} sx={{ color: VV_COLORS.amber, fontSize: 13, lineHeight: 1 }}>★</Box>
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      (4.5)
                    </Typography>
                  </Stack>

                  {/* Price */}
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      sx={{ color: item.color, letterSpacing: '-0.01em' }}
                    >
                      {formatINR(item.price)}
                    </Typography>
                    {item.originalPrice > item.price && (
                      <Typography
                        variant="body2"
                        color="text.disabled"
                        sx={{ textDecoration: 'line-through', fontSize: 13 }}
                      >
                        {formatINR(item.originalPrice)}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>

                {/* Action Buttons */}
                <CardActions sx={{ px: 2.5, pb: 2.5, pt: 1, gap: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<ShoppingCart sx={{ fontSize: 16 }} />}
                    size="small"
                    disabled={!item.inStock}
                    onClick={() => moveToCart(item)}
                    sx={{
                      background: item.inStock
                        ? `linear-gradient(135deg, ${alpha(item.color, 0.9)} 0%, ${item.color} 100%)`
                        : undefined,
                      boxShadow: item.inStock ? `0 4px 14px ${alpha(item.color, 0.35)}` : undefined,
                      '&:hover': {
                        boxShadow: item.inStock ? `0 6px 20px ${alpha(item.color, 0.45)}` : undefined,
                      },
                    }}
                  >
                    {item.inStock ? 'Move to Cart' : 'Out of Stock'}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<Delete sx={{ fontSize: 15 }} />}
                    onClick={() => remove(item.id, item.name)}
                    sx={{
                      borderColor: alpha(VV_COLORS.slate400, 0.4),
                      color: VV_COLORS.slate600,
                      '&:hover': {
                        borderColor: VV_COLORS.coral,
                        color: VV_COLORS.coral,
                        bgcolor: alpha(VV_COLORS.coral, 0.05),
                      },
                    }}
                  >
                    Remove
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
