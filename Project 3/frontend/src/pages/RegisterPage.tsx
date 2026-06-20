import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, TextField, Typography, Alert, CircularProgress, Stack, MenuItem, Divider, Link } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { apiClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

const ROLES = [
  { value: 'patient', label: 'Patient' },
  { value: 'clinician', label: 'Clinician / Physician' },
  { value: 'nurse', label: 'Nurse / Paramedic' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'patient', licenseNumber: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function update(key: string) { return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/register', {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        ...(form.licenseNumber && { licenseNumber: form.licenseNumber }),
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: MC_COLORS.clinical.lightGray, p: 3 }}>
      <Card sx={{ width: '100%', maxWidth: 480 }}>
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={4}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, background: `linear-gradient(135deg, ${MC_COLORS.teal[500]}, ${MC_COLORS.emerald[500]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <FavoriteIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Create your account</Typography>
            <Typography variant="body2" color="text.secondary">Join the MediCore healthcare platform</Typography>
          </Box>

          {success && <Alert severity="success" sx={{ mb: 3 }}>Account created! Redirecting to login...</Alert>}
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={2}>
                <TextField label="First Name" value={form.firstName} onChange={update('firstName')} fullWidth required />
                <TextField label="Last Name" value={form.lastName} onChange={update('lastName')} fullWidth required />
              </Stack>
              <TextField label="Email address" type="email" value={form.email} onChange={update('email')} fullWidth required />
              <TextField label="Password" type="password" value={form.password} onChange={update('password')} fullWidth required
                helperText="Min. 12 chars, uppercase, number & special character" />
              <TextField select label="Account Type" value={form.role} onChange={update('role')} fullWidth>
                {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
              {(form.role === 'clinician' || form.role === 'nurse') && (
                <TextField label="License Number" value={form.licenseNumber} onChange={update('licenseNumber')} fullWidth required helperText="Medical or nursing license number" />
              )}
              <Button type="submit" variant="contained" size="large" fullWidth disabled={loading || success} sx={{ py: 1.5, fontSize: '1rem' }}>
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Create Account'}
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }} />
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" fontWeight={600} color="primary.main">Sign in</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
