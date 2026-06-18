import React from 'react';
import {
  Box, Typography, Card, CardContent, Avatar, Chip,
  LinearProgress, List, ListItem, ListItemIcon, ListItemText, Button,
} from '@mui/material';
import {
  Person, Email, Phone, LocationOn, Verified,
  CheckCircle, RadioButtonUnchecked, ArrowForward,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { NEXUS_COLORS } from '../styles/theme';

interface ProfileStep {
  label: string;
  done: boolean;
  icon: React.ReactNode;
  action?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();

  const steps: ProfileStep[] = [
    { label: 'Email verified',       done: true,                   icon: <Email fontSize="small" /> },
    { label: 'Name added',           done: !!(user?.firstName),    icon: <Person fontSize="small" /> },
    { label: 'Phone number added',   done: false,                  icon: <Phone fontSize="small" />,     action: 'Add phone' },
    { label: 'Address verified',     done: false,                  icon: <LocationOn fontSize="small" />, action: 'Add address' },
    { label: 'KYC Level 2 reached',  done: (user?.kycLevel ?? 0) >= 2, icon: <Verified fontSize="small" /> },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const completionPct  = Math.round((completedCount / steps.length) * 100);

  const completionColor = completionPct >= 80 ? NEXUS_COLORS.emerald
                        : completionPct >= 50 ? NEXUS_COLORS.amber
                        : NEXUS_COLORS.electricBlue;

  return (
    <Box p={3} maxWidth={640} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>My Profile</Typography>

      {/* ── Profile Card ── */}
      <Card sx={{ borderRadius: 2, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={3} mb={3}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: NEXUS_COLORS.electricBlue, fontSize: 28 }}>
              {user?.firstName?.[0] ?? <Person />}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={700}>{user?.firstName} {user?.lastName}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Box display="flex" gap={1} mt={1}>
                {(user?.roles ?? []).map((role: string) => (
                  <Chip key={role} label={role} size="small" sx={{ textTransform: 'capitalize' }} />
                ))}
              </Box>
            </Box>
          </Box>

          <Box display="flex" gap={4} mb={3}>
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

      {/* ── Profile Completeness Bar ── */}
      <Card sx={{ borderRadius: 2, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography fontWeight={600} fontSize={15}>Profile Completeness</Typography>
            <Typography fontWeight={700} fontSize={18} sx={{ color: completionColor }}>{completionPct}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={completionPct}
            sx={{ height: 8, borderRadius: 4, mb: 1.5,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: completionColor, borderRadius: 4 },
            }} />
          <Typography variant="caption" color="text.secondary">
            {completionPct < 100
              ? `Complete your profile to unlock higher transaction limits and full KYC verification`
              : `Your profile is complete — you have access to all features`}
          </Typography>

          <List dense sx={{ mt: 2 }}>
            {steps.map(step => (
              <ListItem key={step.label} sx={{ px: 0, py: 0.5 }}
                secondaryAction={
                  !step.done && step.action ? (
                    <Button size="small" endIcon={<ArrowForward fontSize="small" />}
                      sx={{ fontSize: 12, color: NEXUS_COLORS.electricBlue }}>
                      {step.action}
                    </Button>
                  ) : null
                }>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {step.done
                    ? <CheckCircle sx={{ color: NEXUS_COLORS.emerald, fontSize: 20 }} />
                    : <RadioButtonUnchecked sx={{ color: 'text.disabled', fontSize: 20 }} />}
                </ListItemIcon>
                <ListItemText
                  primary={step.label}
                  primaryTypographyProps={{ fontSize: 14, color: step.done ? 'text.primary' : 'text.secondary' }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
