import React, { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, TextField, Typography, Stack,
  Alert, InputAdornment, IconButton, CircularProgress, Divider, alpha,
} from '@mui/material';
import {
  Email, Lock, Visibility, VisibilityOff, Storefront, ArrowForward,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { VV_COLORS } from '../styles/theme';

interface LoginForm { email: string; password: string }

export default function LoginPage() {
  const [params]            = useSearchParams();
  const { login, loading }  = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      await login(data.email, data.password);
    } catch {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, #4A2BB5 40%, #7C3AED 70%, ${alpha(VV_COLORS.coral, 0.8)} 100%)`,
    }}>
      {/* Left panel — branding */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        px: 8,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${alpha('#fff', 0.06)} 0%, transparent 70%)` }} />
        <Box sx={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(VV_COLORS.coral, 0.2)} 0%, transparent 70%)` }} />

        <Stack direction="row" alignItems="center" spacing={1.5} mb={6}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: alpha('#fff', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <Storefront sx={{ fontSize: 22 }} />
          </Box>
          <Typography variant="h6" fontWeight={800}>VendorVault</Typography>
        </Stack>

        <Typography variant="h3" fontWeight={800} mb={2} lineHeight={1.2}>
          Your marketplace,
          <Box component="span" sx={{ display: 'block', opacity: 0.75 }}>reimagined.</Box>
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.7, maxWidth: 360, lineHeight: 1.8, mb: 4 }}>
          Access 2M+ products from 50K+ verified vendors. Shop smarter, sell faster.
        </Typography>

        {['50,000+ Active Vendors', '2M+ Products', '8M+ Happy Customers'].map(t => (
          <Stack key={t} direction="row" spacing={1.5} alignItems="center" mb={1.5}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: VV_COLORS.emeraldLight }} />
            <Typography variant="body2" sx={{ opacity: 0.8 }}>{t}</Typography>
          </Stack>
        ))}
      </Box>

      {/* Right panel — form */}
      <Box sx={{
        width: { xs: '100%', md: 480 },
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: { xs: 2, md: 4 },
        bgcolor: 'background.default',
        borderRadius: { md: '24px 0 0 24px' },
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile brand */}
          <Stack direction="row" alignItems="center" spacing={1} mb={4} sx={{ display: { md: 'none' } }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '9px', background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.violetDeep})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Storefront sx={{ color: 'white', fontSize: 17 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.coral})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              VendorVault
            </Typography>
          </Stack>

          <Typography variant="h4" fontWeight={800} mb={0.5}>Welcome back</Typography>
          <Typography variant="body2" color="text.secondary" mb={3.5}>
            Sign in to continue to your account
          </Typography>

          {params.get('expired') && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
              Your session expired. Please sign in again.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>
          )}

          <Card elevation={0} sx={{ border: `1px solid`, borderColor: 'divider', borderRadius: 3 }}>
            <CardContent sx={{ p: 3.5 }}>
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2.5}>
                  <TextField
                    label="Email address"
                    type="email"
                    fullWidth
                    size="medium"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Email fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>,
                    }}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' },
                    })}
                  />
                  <TextField
                    label="Password"
                    type={showPw ? 'text' : 'password'}
                    fullWidth
                    size="medium"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Lock fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPw(p => !p)} edge="end">
                            {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    endIcon={!loading && <ArrowForward />}
                    disabled={loading}
                    sx={{ py: 1.4, fontSize: '1rem', mt: 0.5 }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
              New to VendorVault?
            </Typography>
          </Divider>

          <Button
            variant="outlined"
            fullWidth
            size="large"
            onClick={() => window.location.href = '/register'}
            sx={{ py: 1.3, fontWeight: 600 }}
          >
            Create a free account
          </Button>

          <Typography variant="caption" textAlign="center" display="block" mt={2.5} color="text.disabled">
            <RouterLink to="/" style={{ color: 'inherit' }}>← Back to marketplace</RouterLink>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
