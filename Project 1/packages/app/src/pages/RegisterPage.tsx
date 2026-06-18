import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box, Card, CardContent, Typography, TextField,
  Button, InputAdornment, IconButton, Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { NEXUS_COLORS } from '../styles/theme';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError('');
    try {
      await registerUser({ email: data.email, password: data.password, firstName: data.firstName, lastName: data.lastName });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center"
      sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.navyDark} 0%, #1a3a5c 100%)` }}>
      <Card sx={{ width: '100%', maxWidth: 440, mx: 2, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={1} color={NEXUS_COLORS.navyDark}>
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Join NexusFinance — your digital banking platform
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column" gap={2}>
            <Box display="flex" gap={2}>
              <TextField label="First Name" fullWidth size="small"
                {...register('firstName', { required: 'Required' })}
                error={!!errors.firstName} helperText={errors.firstName?.message} />
              <TextField label="Last Name" fullWidth size="small"
                {...register('lastName', { required: 'Required' })}
                error={!!errors.lastName} helperText={errors.lastName?.message} />
            </Box>
            <TextField label="Email" fullWidth size="small" type="email"
              {...register('email', { required: 'Email is required' })}
              error={!!errors.email} helperText={errors.email?.message} />
            <TextField label="Password" fullWidth size="small"
              type={showPassword ? 'text' : 'password'}
              {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
              error={!!errors.password} helperText={errors.password?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(v => !v)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }} />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
              sx={{ mt: 1, py: 1.5, fontWeight: 700,
                background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Box>

          <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
            Already have an account?{' '}
            <Link to="/login" style={{ color: NEXUS_COLORS.electricBlue, fontWeight: 600 }}>Sign in</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
