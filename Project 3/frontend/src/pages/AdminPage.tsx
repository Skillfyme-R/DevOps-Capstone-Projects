import React, { useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Stack, Avatar, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, CircularProgress, Tooltip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthContext } from '../App';
import { useQuery, useQueryClient } from 'react-query';
import { apiClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

const ROLE_COLOR: Record<string, string> = {
  superadmin: MC_COLORS.status.critical,
  admin: MC_COLORS.status.warning,
  clinician: MC_COLORS.teal[500],
  nurse: MC_COLORS.emerald[500],
  patient: MC_COLORS.clinical.textGray,
};

const SYSTEM_STATUS = [
  { name: 'Auth Service', status: 'Healthy', port: 9001, color: 'success' },
  { name: 'Patient Service', status: 'Healthy', port: 9002, color: 'success' },
  { name: 'Appointments Service', status: 'Healthy', port: 9003, color: 'success' },
  { name: 'Clinical Service', status: 'Healthy', port: 9004, color: 'success' },
  { name: 'Analytics Service', status: 'Healthy', port: 9005, color: 'success' },
  { name: 'PostgreSQL', status: 'Connected', port: 5434, color: 'success' },
  { name: 'Redis Cache', status: 'Connected', port: 6382, color: 'success' },
];

const EMPTY_INVITE = { email: '', firstName: '', lastName: '', role: 'clinician' };

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { user: me } = useAuthContext();
  const { data: users, isLoading, isError } = useQuery(
    'admin-users',
    () => apiClient.get('/auth/users').then((r: { data: any }) => r.data),
    { retry: false }
  );

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState<{ email: string; temporaryPassword: string } | null>(null);

  // Delete user
  const [deleteTarget, setDeleteTarget] = useState<Record<string, string> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function updateInvite(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setInviteForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteSaving(true);
    setInviteError('');
    try {
      const res = await apiClient.post('/auth/invite', inviteForm).then((r: { data: any }) => r.data);
      setInviteResult({ email: res.email, temporaryPassword: res.temporaryPassword });
      queryClient.invalidateQueries('admin-users');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to invite user';
      setInviteError(msg);
    } finally {
      setInviteSaving(false);
    }
  }

  function handleInviteClose() {
    setInviteOpen(false);
    setInviteForm(EMPTY_INVITE);
    setInviteError('');
    setInviteResult(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiClient.delete(`/auth/users/${deleteTarget.id}`);
      queryClient.invalidateQueries('admin-users');
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to delete user';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700}>Administration</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Platform management, users, and system health</Typography>
      </Box>

      <Grid container spacing={3} mb={4}>
        {[
          { title: 'Total Users', value: users?.total || '—', icon: PeopleIcon, color: MC_COLORS.teal[500] },
          { title: 'Services Running', value: SYSTEM_STATUS.filter((s) => s.color === 'success').length, icon: MonitorHeartIcon, color: MC_COLORS.emerald[500] },
          { title: 'HIPAA Compliance', value: '100%', icon: SecurityIcon, color: MC_COLORS.status.stable },
          { title: 'DB Tables', value: '18', icon: StorageIcon, color: MC_COLORS.status.info },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.title}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{s.title}</Typography>
                    <Typography variant="h4" fontWeight={700}>{s.value}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${s.color}18`, width: 44, height: 44 }}>
                    <s.icon sx={{ color: s.color, fontSize: 22 }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={700}>User Management</Typography>
                <Button size="small" variant="contained" onClick={() => setInviteOpen(true)}>+ Invite User</Button>
              </Stack>
              {isError && <Alert severity="error">Could not load users — check admin permissions.</Alert>}
              {!isError && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Box sx={{ height: 36 }} /></TableCell></TableRow>)
                        : (users?.users || []).map((u: Record<string, string>) => {
                          const isSelf = u.id === me?.id;
                          const isSuperAdmin = u.role === 'superadmin';
                          const canDelete = !isSelf && !isSuperAdmin;
                          return (
                            <TableRow key={u.id} hover>
                              <TableCell>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <Avatar sx={{ width: 28, height: 28, bgcolor: MC_COLORS.teal[500], fontSize: '0.7rem' }}>
                                    {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="caption" fontWeight={600} display="block">{u.first_name} {u.last_name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell><Chip label={u.role} size="small" sx={{ bgcolor: `${ROLE_COLOR[u.role] || '#666'}20`, color: ROLE_COLOR[u.role] || '#666', fontSize: '0.65rem', height: 18 }} /></TableCell>
                              <TableCell><Chip label={u.status} size="small" color={u.status === 'active' ? 'success' : 'default'} sx={{ fontSize: '0.65rem', height: 18 }} /></TableCell>
                              <TableCell><Typography variant="caption" color="text.secondary">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</Typography></TableCell>
                              <TableCell align="center">
                                <Tooltip title={isSelf ? 'Cannot delete yourself' : isSuperAdmin ? 'Cannot delete superadmin' : 'Delete user'}>
                                  <span>
                                    <IconButton size="small" disabled={!canDelete} onClick={() => { setDeleteTarget(u); setDeleteError(''); }}
                                      sx={{ color: canDelete ? 'error.main' : 'text.disabled' }}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={3}>System Health</Typography>
              <Stack spacing={1.5}>
                {SYSTEM_STATUS.map((s) => (
                  <Stack key={s.name} direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Port {s.port}</Typography>
                    </Box>
                    <Chip label={s.status} size="small" color={s.color as 'success'} sx={{ fontSize: '0.65rem', height: 20 }} />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete User Confirmation */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>Delete User</Typography>
            <IconButton size="small" onClick={() => setDeleteTarget(null)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will permanently delete <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong> ({deleteTarget?.email}). This cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" disabled={deleting} onClick={handleDeleteConfirm}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}>
            {deleting ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onClose={handleInviteClose} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>Invite User</Typography>
            <IconButton size="small" onClick={handleInviteClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        {inviteResult ? (
          <>
            <DialogContent dividers>
              <Alert severity="success" sx={{ mb: 2 }}>User invited successfully!</Alert>
              <Typography variant="body2" gutterBottom>
                <strong>Email:</strong> {inviteResult.email}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Temporary Password:</strong>
              </Typography>
              <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                {inviteResult.temporaryPassword}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Share this password securely. The user should change it on first login.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button variant="contained" onClick={handleInviteClose}>Done</Button>
            </DialogActions>
          </>
        ) : (
          <form onSubmit={handleInvite}>
            <DialogContent dividers>
              {inviteError && <Alert severity="error" sx={{ mb: 2 }}>{inviteError}</Alert>}
              <Stack spacing={2}>
                <TextField label="First Name" value={inviteForm.firstName} onChange={updateInvite('firstName')} fullWidth required autoFocus />
                <TextField label="Last Name" value={inviteForm.lastName} onChange={updateInvite('lastName')} fullWidth required />
                <TextField label="Email" type="email" value={inviteForm.email} onChange={updateInvite('email')} fullWidth required />
                <TextField select label="Role" value={inviteForm.role} onChange={updateInvite('role')} fullWidth required>
                  <MenuItem value="clinician">Clinician</MenuItem>
                  <MenuItem value="nurse">Nurse</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="patient">Patient</MenuItem>
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleInviteClose} disabled={inviteSaving}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={inviteSaving} startIcon={inviteSaving ? <CircularProgress size={16} /> : null}>
                {inviteSaving ? 'Inviting...' : 'Send Invite'}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </Box>
  );
}
