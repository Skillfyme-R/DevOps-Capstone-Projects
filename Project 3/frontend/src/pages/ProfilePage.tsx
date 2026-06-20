import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, Avatar, Chip, Button, TextField, Grid, Divider, Alert, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, IconButton, Switch } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import SecurityIcon from '@mui/icons-material/Security';
import BadgeIcon from '@mui/icons-material/Badge';
import CloseIcon from '@mui/icons-material/Close';
import { useAuthContext } from '../App';
import { apiClient } from '../utils/apiClient';
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
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // MFA toggle
  const [mfaEnabled, setMfaEnabled] = useState(user?.mfaEnabled ?? false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaMsg, setMfaMsg] = useState('');

  async function handleMfaToggle() {
    setMfaLoading(true);
    setMfaMsg('');
    try {
      const endpoint = mfaEnabled ? '/auth/mfa/disable' : '/auth/mfa/enable';
      await apiClient.post(endpoint);
      setMfaEnabled((v) => !v);
      setMfaMsg(mfaEnabled ? 'MFA disabled' : 'MFA enabled successfully');
    } catch {
      setMfaMsg('Failed to update MFA setting');
    } finally {
      setMfaLoading(false);
    }
  }

  // Password change dialog
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  if (!user) return null;

  const completeness = [
    { label: 'Basic Info', done: true },
    { label: 'Contact Details', done: !!user.email },
    { label: 'Professional Info', done: ['clinician', 'nurse'].includes(user.role) },
    { label: 'MFA Enabled', done: user.mfaEnabled },
  ];
  const pct = Math.round((completeness.filter((c) => c.done).length / completeness.length) * 100);

  function startEditing() {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setPhone('');
    setEditing(true);
    setSaved(false);
    setSaveError('');
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      await apiClient.patch('/auth/profile', { firstName, lastName, phone: phone || undefined });
      setSaved(true);
      setEditing(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to update profile';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwdForm.next !== pwdForm.confirm) { setPwdError('New passwords do not match'); return; }
    if (pwdForm.next.length < 12) { setPwdError('Password must be at least 12 characters'); return; }
    setPwdSaving(true);
    setPwdError('');
    try {
      await apiClient.post('/auth/change-password', { currentPassword: pwdForm.current, newPassword: pwdForm.next });
      setPwdSuccess('Password changed successfully!');
      setTimeout(() => { setPwdOpen(false); setPwdForm({ current: '', next: '', confirm: '' }); setPwdSuccess(''); }, 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to change password. Check your current password.';
      setPwdError(msg);
    } finally {
      setPwdSaving(false);
    }
  }

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
                  {!editing
                    ? <Button size="small" startIcon={<EditIcon />} variant="outlined" onClick={startEditing}>Edit</Button>
                    : <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => { setEditing(false); setSaveError(''); }} disabled={saving}>Cancel</Button>
                        <Button size="small" startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />} variant="contained" onClick={handleSave} disabled={saving}>
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </Stack>
                  }
                </Stack>
                {saved && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>Profile updated successfully</Alert>}
                {saveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError('')}>{saveError}</Alert>}
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField label="First Name"
                      value={editing ? firstName : user.firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={!editing} fullWidth />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Last Name"
                      value={editing ? lastName : user.lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={!editing} fullWidth />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Email" defaultValue={user.email} disabled fullWidth type="email" helperText="Email cannot be changed" />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Phone" placeholder="+1 (555) 000-0000"
                      value={editing ? phone : ''}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!editing} fullWidth />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Role" value={user.role} disabled fullWidth />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                  <SecurityIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={700}>Security Settings</Typography>
                </Stack>
                {mfaMsg && <Alert severity={mfaMsg.includes('Failed') ? 'error' : 'success'} onClose={() => setMfaMsg('')} sx={{ mb: 2 }}>{mfaMsg}</Alert>}
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Multi-Factor Authentication</Typography>
                      <Typography variant="caption" color="text.secondary">Add an extra layer of security to your account</Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip label={mfaEnabled ? 'Enabled' : 'Disabled'} color={mfaEnabled ? 'success' : 'default'} size="small" />
                      <Switch checked={mfaEnabled} onChange={handleMfaToggle} disabled={mfaLoading} size="small" color="success" />
                    </Stack>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Change Password</Typography>
                      <Typography variant="caption" color="text.secondary">Use a strong, unique password</Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => setPwdOpen(true)}>Update</Button>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Active Sessions</Typography>
                      <Typography variant="caption" color="text.secondary">1 active session across 1 device</Typography>
                    </Box>
                    <Button size="small" variant="outlined" color="error"
                      onClick={async () => {
                        try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
                        localStorage.removeItem('mc_access_token');
                        localStorage.removeItem('mc_refresh_token');
                        window.location.href = '/login';
                      }}>
                      Sign Out
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={pwdOpen} onClose={() => { setPwdOpen(false); setPwdForm({ current: '', next: '', confirm: '' }); setPwdError(''); setPwdSuccess(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>Change Password</Typography>
            <IconButton size="small" onClick={() => setPwdOpen(false)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <form onSubmit={handlePasswordChange}>
          <DialogContent dividers>
            {pwdError && <Alert severity="error" sx={{ mb: 2 }}>{pwdError}</Alert>}
            {pwdSuccess && <Alert severity="success" sx={{ mb: 2 }}>{pwdSuccess}</Alert>}
            <Stack spacing={2.5}>
              <TextField label="Current Password" type="password" value={pwdForm.current} onChange={(e) => setPwdForm((f) => ({ ...f, current: e.target.value }))} fullWidth required autoFocus />
              <TextField label="New Password" type="password" value={pwdForm.next} onChange={(e) => setPwdForm((f) => ({ ...f, next: e.target.value }))} fullWidth required helperText="Min. 12 chars, uppercase, number & special character" />
              <TextField label="Confirm New Password" type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))} fullWidth required />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPwdOpen(false)} disabled={pwdSaving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={pwdSaving} startIcon={pwdSaving ? <CircularProgress size={16} /> : null}>
              {pwdSaving ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
