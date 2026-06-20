import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Stack, alpha } from '@mui/material';
import { Home, ShoppingBag, ArrowBack } from '@mui/icons-material';
import { VV_COLORS } from '../styles/theme';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 4,
        background: `radial-gradient(ellipse 80% 60% at 50% 20%, ${alpha(VV_COLORS.violetMid, 0.08)} 0%, transparent 70%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative orbs */}
      <Box sx={{
        position: 'absolute', top: '10%', left: '5%',
        width: 300, height: 300, borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(VV_COLORS.violetMid, 0.06)} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '15%', right: '8%',
        width: 240, height: 240, borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(VV_COLORS.coral, 0.06)} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* 404 number */}
      <Typography
        sx={{
          fontSize: { xs: '7rem', sm: '10rem', md: '14rem' },
          fontWeight: 900,
          lineHeight: 0.9,
          letterSpacing: '-0.06em',
          background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 40%, ${VV_COLORS.violetLight} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          mb: 2,
          userSelect: 'none',
        }}
      >
        404
      </Typography>

      {/* Emoji */}
      <Typography sx={{ fontSize: { xs: 48, md: 64 }, mb: 3 }}>🔍</Typography>

      <Typography variant="h4" fontWeight={800} mb={1.5} sx={{ letterSpacing: '-0.02em' }}>
        Page Not Found
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        mb={5}
        sx={{ maxWidth: 440, lineHeight: 1.7 }}
      >
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        Let&apos;s get you back on track.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Button
          variant="contained"
          size="large"
          startIcon={<Home />}
          onClick={() => navigate('/')}
          sx={{
            background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.violetLight})`,
            px: 4,
            py: 1.5,
            fontWeight: 700,
            borderRadius: '12px',
            boxShadow: `0 8px 24px ${alpha(VV_COLORS.violetMid, 0.35)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${VV_COLORS.violetDeep}, ${VV_COLORS.violetMid})`,
              transform: 'translateY(-2px)',
              boxShadow: `0 12px 32px ${alpha(VV_COLORS.violetMid, 0.45)}`,
            },
            transition: 'all 0.22s ease',
          }}
        >
          Go to Home
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<ShoppingBag />}
          onClick={() => navigate('/catalog')}
          sx={{
            borderColor: VV_COLORS.violetMid,
            color: VV_COLORS.violetMid,
            px: 4,
            py: 1.5,
            fontWeight: 700,
            borderRadius: '12px',
            '&:hover': {
              bgcolor: alpha(VV_COLORS.violetMid, 0.06),
              borderColor: VV_COLORS.violetDeep,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.22s ease',
          }}
        >
          Browse Products
        </Button>

        <Button
          variant="text"
          size="large"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            '&:hover': { color: VV_COLORS.violetMid, bgcolor: 'transparent' },
          }}
        >
          Go Back
        </Button>
      </Stack>

      {/* Bottom helpful links */}
      <Box mt={8}>
        <Typography variant="body2" color="text.secondary" mb={2} fontWeight={600}>
          Quick links that might help:
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ rowGap: 1 }}>
          {[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'My Orders', path: '/orders' },
            { label: 'Wishlist', path: '/wishlist' },
            { label: 'Vendors', path: '/vendors' },
          ].map(link => (
            <Button
              key={link.label}
              variant="text"
              size="small"
              onClick={() => navigate(link.path)}
              sx={{
                color: VV_COLORS.violetMid,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                '&:hover': { bgcolor: 'transparent', color: VV_COLORS.violetDeep },
              }}
            >
              {link.label}
            </Button>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
