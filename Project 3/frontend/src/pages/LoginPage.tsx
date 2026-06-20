import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, TextField, Typography, Alert, CircularProgress, InputAdornment, IconButton, Stack, Link } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import { useAuthContext } from '../App';
import { MC_COLORS } from '../styles/theme';

export default function LoginPage() {
  const { login } = useAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Invalid email or password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: MC_COLORS.clinical.lightGray }}>
      <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${MC_COLORS.teal[900]}, ${MC_COLORS.teal[600]}, ${MC_COLORS.emerald[700]})`, p: 6 }}>
        <Box textAlign="center" color="white">
          <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <FavoriteIcon sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="h3" fontWeight={800} gutterBottom>MediCore</Typography>
          <Typography variant="h6" sx={{ opacity: 0.85, fontWeight: 400, maxWidth: 320, mx: 'auto' }}>
            Enterprise Healthcare Cloud Platform — Secure, HIPAA-compliant, and built for scale.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Card sx={{ width: '100%', maxWidth: 420 }}>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={4}>
              <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 2, background: `linear-gradient(135deg, ${MC_COLORS.teal[500]}, ${MC_COLORS.emerald[500]})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FavoriteIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>Welcome back</Typography>
              <Typography variant="body2" color="text.secondary">Sign in to your MediCore account</Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  autoComplete="email"
                  InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }}
                />
                <TextField
                  label="Password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
                    endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPwd((s) => !s)}>{showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}</IconButton></InputAdornment>,
                  }}
                />
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ py: 1.5, fontSize: '1rem' }}>
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
                </Button>
              </Stack>
            </form>

            <Box textAlign="center" mt={3}>
              <Typography variant="body2" color="text.secondary">
                Don&apos;t have an account?{' '}
                <Link component={RouterLink} to="/register" fontWeight={600} color="primary.main">Sign up</Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
