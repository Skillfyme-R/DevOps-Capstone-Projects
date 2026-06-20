import React, { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, TextField, Typography, Stack,
  Alert, CircularProgress, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { Person, Storefront } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { VV_COLORS } from '../styles/theme';

interface RegisterForm {
  name:     string;
  email:    string;
  password: string;
  confirm:  string;
  storeName?: string;
}

export default function RegisterPage() {
  const [params]           = useSearchParams();
  const { register: doRegister, loading } = useAuth();
  const [role, setRole]    = useState<'customer' | 'vendor'>(
    params.get('role') === 'vendor' ? 'vendor' : 'customer'
  );
  const [error, setError]  = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setError('');
    try {
      await doRegister({ ...data, role });
    } catch {
      setError('Registration failed. That email may already be in use.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${VV_COLORS.violetDeep}22 0%, ${VV_COLORS.coral}11 100%)`,
        p: 2,
        py: 4,
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%', p: 1 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={1}>
            Create your account
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            Join 8 million+ shoppers and vendors on VendorVault
          </Typography>

          {/* Role toggle */}
          <ToggleButtonGroup
            value={role}
            exclusive
            onChange={(_, v) => v && setRole(v)}
            fullWidth
            sx={{ mb: 3 }}
          >
            <ToggleButton value="customer" sx={{ gap: 1 }}>
              <Person fontSize="small" /> Shopper
            </ToggleButton>
            <ToggleButton value="vendor" sx={{ gap: 1 }}>
              <Storefront fontSize="small" /> Vendor
            </ToggleButton>
          </ToggleButtonGroup>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2.5}>
              <TextField
                label="Full name"
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register('name', { required: 'Full name is required' })}
              />
              {role === 'vendor' && (
                <TextField
                  label="Store name"
                  fullWidth
                  error={!!errors.storeName}
                  helperText={errors.storeName?.message}
                  {...register('storeName', { required: role === 'vendor' ? 'Store name is required' : false })}
                />
              )}
              <TextField
                label="Email address"
                type="email"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
              />
              <TextField
                label="Confirm password"
                type="password"
                fullWidth
                error={!!errors.confirm}
                helperText={errors.confirm?.message}
                {...register('confirm', {
                  required: 'Please confirm your password',
                  validate: v => v === password || 'Passwords do not match',
                })}
              />
              <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
                {loading ? <CircularProgress size={22} color="inherit" /> : `Create ${role === 'vendor' ? 'Vendor' : ''} Account`}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
            Already have an account?{' '}
            <RouterLink to="/login" style={{ color: VV_COLORS.violetMid, fontWeight: 600 }}>Sign in</RouterLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
