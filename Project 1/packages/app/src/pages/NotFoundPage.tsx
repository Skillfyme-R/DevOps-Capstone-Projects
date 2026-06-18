import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { NEXUS_COLORS } from '../styles/theme';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" alignItems="center"
      justifyContent="center" textAlign="center" p={3}>
      <Typography variant="h1" fontWeight={900} color={NEXUS_COLORS.electricBlue} sx={{ fontSize: 120, lineHeight: 1 }}>
        404
      </Typography>
      <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark} mb={1}>Page not found</Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        The page you are looking for does not exist.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}
        sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
        Go to Dashboard
      </Button>
    </Box>
  );
}
