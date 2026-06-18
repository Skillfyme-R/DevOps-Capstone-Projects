import React from 'react';
import { Box, Typography, Card, CardContent, Avatar, Chip } from '@mui/material';
import { Person } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { NEXUS_COLORS } from '../styles/theme';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <Box p={3} maxWidth={600} mx="auto">
      <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark} mb={3}>My Profile</Typography>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={3} mb={3}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: NEXUS_COLORS.electricBlue, fontSize: 28 }}>
              {user?.firstName?.[0] ?? <Person />}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Box display="flex" gap={1} mt={1}>
                {(user?.roles ?? []).map((role: string) => (
                  <Chip key={role} label={role} size="small" sx={{ textTransform: 'capitalize' }} />
                ))}
              </Box>
            </Box>
          </Box>

          <Box display="flex" gap={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">KYC Level</Typography>
              <Typography variant="body1" fontWeight={600}>Level {user?.kycLevel ?? 0}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Account Status</Typography>
              <Chip label="Active" size="small" color="success" sx={{ mt: 0.5, display: 'block' }} />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
