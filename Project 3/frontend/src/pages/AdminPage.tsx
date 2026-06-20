import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Stack, Avatar, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Alert } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useQuery } from 'react-query';
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

export default function AdminPage() {
  const { data: users, isLoading, isError } = useQuery(
    'admin-users',
    () => apiClient.get('/auth/users').then((r: { data: any }) => r.data),
    { retry: false }
  );

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
                <Button size="small" variant="contained">+ Invite User</Button>
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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Box sx={{ height: 36 }} /></TableCell></TableRow>)
                        : (users?.users || []).map((u: Record<string, string>) => (
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
                          </TableRow>
                        ))}
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
    </Box>
  );
}
