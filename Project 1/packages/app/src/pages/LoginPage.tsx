/**
 * NexusFinance Login Page
 *
 * Handles email/password login with:
 *   - Form validation (required fields, email format)
 *   - Error display (wrong password, account locked)
 *   - Loading state during API call
 *   - Redirect to original destination after login
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, Divider, Link,
} from '@mui/material';
import VisibilityIcon     from '@mui/icons-material/Visibility';
import VisibilityOffIcon  from '@mui/icons-material/VisibilityOff';
import { useForm }        from 'react-hook-form';
import { useAuth }        from '../hooks/useAuth';
import { NEXUS_COLORS }   from '../styles/theme';

interface LoginFormData {
  email:    string;
  password: string;
}

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTo = (location.state as any)?.from?.pathname ?? '/dashboard';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      await login(data.email, data.password);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Login failed. Please try again.';
      setErrorMessage(msg);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor={NEXUS_COLORS.gray50}
      px={2}
    >
      <Box width="100%" maxWidth={440}>
        {/* Brand Header */}
        <Box textAlign="center" mb={4}>
          <Box
            width={52} height={52} borderRadius={3}
            bgcolor={NEXUS_COLORS.navyDark}
            display="flex" alignItems="center" justifyContent="center"
            mx="auto" mb={2}
          >
            <Typography fontWeight={800} fontSize={20} color="#fff">NX</Typography>
          </Box>
          <Typography variant="h4" fontWeight={700} color={NEXUS_COLORS.navyDark}>
            NexusFinance
          </Typography>
          <Typography color="text.secondary" mt={0.5}>
            Sign in to your account
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                margin="normal"
                autoComplete="email"
                autoFocus
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' },
                })}
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(p => !p)} edge="end" size="small">
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register('password', { required: 'Password is required' })}
              />

              <Box textAlign="right" mt={0.5} mb={2}>
                <Link component={RouterLink} to="/forgot-password" variant="body2" color="secondary">
                  Forgot password?
                </Link>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isSubmitting}
                sx={{ py: 1.5, fontSize: 16 }}
              >
                {isSubmitting
                  ? <CircularProgress size={22} color="inherit" />
                  : 'Sign In'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }}>or</Divider>

            <Typography textAlign="center" variant="body2">
              Don't have an account?{' '}
              <Link component={RouterLink} to="/register" fontWeight={600} color="secondary">
                Create Account
              </Link>
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.disabled" textAlign="center" display="block" mt={3}>
          Protected by NexusFinance Security · 256-bit encryption · FDIC member
        </Typography>
      </Box>
    </Box>
  );
}
