import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MC_COLORS } from '../styles/theme';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: MC_COLORS.clinical.lightGray, p: 4, textAlign: 'center' }}>
      <Typography variant="h1" fontWeight={800} color="primary.main" sx={{ fontSize: '6rem', lineHeight: 1 }}>404</Typography>
      <Typography variant="h5" fontWeight={700} mt={2} mb={1}>Page not found</Typography>
      <Typography variant="body1" color="text.secondary" mb={4} maxWidth={400}>The page you are looking for does not exist or you may not have permission to access it.</Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
    </Box>
  );
}
