import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, Avatar, Chip, Button, TextField, Grid, Divider, Alert, LinearProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import SecurityIcon from '@mui/icons-material/Security';
import BadgeIcon from '@mui/icons-material/Badge';
import { useAuthContext } from '../App';
import { MC_COLORS } from '../styles/theme';

const ROLE_COLOR: Record<string, string> = {
  superadmin: MC_COLORS.status.critical,
  admin: MC_COLORS.status.warning,
  clinician: MC_COLORS.teal[500],
  nurse: MC_COLORS.emerald[500],
  patient: MC_COLORS.clinical.textGray,
};

export default function ProfilePage() {
  const { user } = useAuthContext();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const completeness = [
    { label: 'Basic Info', done: true },
    { label: 'Contact Details', done: !!user.email },
    { label: 'Professional Info', done: ['clinician', 'nurse'].includes(user.role) },
    { label: 'MFA Enabled', done: user.mfaEnabled },
  ];
  const pct = Math.round((completeness.filter((c) => c.done).length / completeness.length) * 100);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={4}>My Profile</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Avatar sx={{ width: 80, height: 80, bgcolor: MC_COLORS.teal[500], fontSize: '1.75rem', mx: 'auto', mb: 2 }}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>{user.firstName} {user.lastName}</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>{user.email}</Typography>
              <Chip label={user.role.replace('_', ' ').toUpperCase()} size="small"
                sx={{ bgcolor: `${ROLE_COLOR[user.role]}20`, color: ROLE_COLOR[user.role], fontWeight: 700 }} />

              <Divider sx={{ my: 3 }} />
              <Box textAlign="left">
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">Profile completeness</Typography>
                  <Typography variant="body2" fontWeight={600} color="primary.main">{pct}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={pct} sx={{ mb: 2, height: 8, borderRadius: 4 }} color={pct === 100 ? 'success' : 'primary'} />
                <Stack spacing={1}>
                  {completeness.map((c) => (
                    <Stack key={c.label} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                      <Chip label={c.done ? '✓' : 'Pending'} size="small" color={c.done ? 'success' : 'default'} sx={{ height: 18, fontSize: '0.65rem' }} />
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <BadgeIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight={700}>Personal Information</Typography>
                  </Stack>
                  <Button size="small" startIcon={editing ? <SaveIcon /> : <EditIcon />}
                    variant={editing ? 'contained' : 'outlined'}
                    onClick={() => { if (editing) setSaved(true); setEditing((e) => !e); }}>
                    {editing ? 'Save Changes' : 'Edit'}
                  </Button>
                </Stack>
                {saved && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>Profile updated successfully</Alert>}
                <Grid container spacing={2}>
                  <Grid item xs={6}><TextField label="First Name" defaultValue={user.firstName} disabled={!editing} fullWidth /></Grid>
                  <Grid item xs={6}><TextField label="Last Name" defaultValue={user.lastName} disabled={!editing} fullWidth /></Grid>
                  <Grid item xs={12}><TextField label="Email" defaultValue={user.email} disabled={!editing} fullWidth type="email" /></Grid>
                  <Grid item xs={6}><TextField label="Phone" placeholder="+1 (555) 000-0000" disabled={!editing} fullWidth /></Grid>
                  <Grid item xs={6}><TextField label="Date of Birth" type="date" disabled={!editing} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                  <SecurityIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={700}>Security Settings</Typography>
                </Stack>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Multi-Factor Authentication</Typography>
                      <Typography variant="caption" color="text.secondary">Add an extra layer of security to your account</Typography>
                    </Box>
                    <Chip label={user.mfaEnabled ? 'Enabled' : 'Disabled'} color={user.mfaEnabled ? 'success' : 'default'} size="small" />
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Change Password</Typography>
                      <Typography variant="caption" color="text.secondary">Last changed: 30 days ago</Typography>
                    </Box>
                    <Button size="small" variant="outlined">Update</Button>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Active Sessions</Typography>
                      <Typography variant="caption" color="text.secondary">1 active session across 1 device</Typography>
                    </Box>
                    <Button size="small" variant="outlined" color="error">Revoke All</Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
