import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton, Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { useQuery } from 'react-query';
import { format, parseISO } from 'date-fns';
import { apiClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  scheduled: 'info', confirmed: 'primary', checked_in: 'secondary', in_progress: 'warning', completed: 'success', no_show: 'error', cancelled: 'default',
};

const PRIORITY_COLOR: Record<string, string> = { routine: MC_COLORS.status.info, urgent: MC_COLORS.status.warning, emergency: MC_COLORS.status.critical };

export default function AppointmentsPage() {
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');

  const { data, isLoading } = useQuery(
    ['appointments', status, from],
    () => apiClient.get('/appointments', { params: { status: status || undefined, from: from || undefined, limit: 30 } }).then((r: { data: any }) => r.data),
    { retry: false }
  );

  const appointments = data?.appointments || [];

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Appointments</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{data?.total || 0} total appointments</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>New Appointment</Button>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
                <MenuItem value="">All Statuses</MenuItem>
                {['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled'].map((s) => (
                  <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="From Date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date & Time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Chief Complaint</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Mode</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)
                : appointments.length === 0
                  ? <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>No appointments found</TableCell></TableRow>
                  : appointments.map((a: Record<string, string>) => (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{a.scheduled_at ? format(parseISO(a.scheduled_at), 'MMM d, yyyy') : '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.scheduled_at ? format(parseISO(a.scheduled_at), 'h:mm a') : ''}</Typography>
                      </TableCell>
                      <TableCell><Chip label={a.type?.replace('_', ' ')} size="small" /></TableCell>
                      <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{a.chief_complaint || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{a.duration_minutes} min</Typography></TableCell>
                      <TableCell>
                        <Chip label={a.priority} size="small" sx={{ bgcolor: `${PRIORITY_COLOR[a.priority]}20`, color: PRIORITY_COLOR[a.priority], fontWeight: 600 }} />
                      </TableCell>
                      <TableCell><Chip label={a.status?.replace('_', ' ')} size="small" color={STATUS_COLOR[a.status] || 'default'} /></TableCell>
                      <TableCell>
                        {a.is_telemedicine === 'true' || a.is_telemedicine === true as unknown as string
                          ? <Chip icon={<VideoCallIcon />} label="Telemedicine" size="small" color="info" variant="outlined" />
                          : <Chip label="In-Person" size="small" variant="outlined" />}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
