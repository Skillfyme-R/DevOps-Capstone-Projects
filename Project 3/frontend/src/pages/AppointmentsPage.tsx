import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton, Select, MenuItem, FormControl, InputLabel, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert, CircularProgress, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { useQuery, useQueryClient } from 'react-query';
import { format, parseISO } from 'date-fns';
import { patientsClient, appointmentsClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  scheduled: 'info', confirmed: 'primary', checked_in: 'secondary', in_progress: 'warning', completed: 'success', no_show: 'error', cancelled: 'default',
};

const PRIORITY_COLOR: Record<string, string> = { routine: MC_COLORS.status.info, urgent: MC_COLORS.status.warning, emergency: MC_COLORS.status.critical };

const EMPTY_FORM = { patientId: '', type: 'consultation', scheduledAt: '', durationMinutes: '30', chiefComplaint: '', priority: 'routine', isTelemedicine: 'false', notes: '' };

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const { data, isLoading } = useQuery(
    ['appointments', status, from],
    () => appointmentsClient.get('/appointments', { params: { status: status || undefined, from: from || undefined, limit: 30 } }).then((r: { data: any }) => r.data),
    { retry: false }
  );

  const { data: patientsData } = useQuery(
    'patients-list',
    () => patientsClient.get('/patients', { params: { limit: 100 } }).then((r: { data: any }) => r.data),
    { retry: false }
  );

  const appointments = data?.appointments || [];
  const patients = patientsData?.patients || [];

  function update(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) =>
      setForm((f) => ({ ...f, [key]: (e.target as HTMLInputElement).value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientId || !form.scheduledAt) { setFormError('Patient and date/time are required'); return; }
    setSaving(true);
    setFormError('');
    try {
      await appointmentsClient.post('/appointments', {
        patientId: form.patientId,
        type: form.type,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        chiefComplaint: form.chiefComplaint || undefined,
        priority: form.priority,
        isTelemedicine: form.isTelemedicine === 'true',
        notes: form.notes || undefined,
      });
      setFormSuccess('Appointment booked successfully!');
      queryClient.invalidateQueries('appointments');
      setTimeout(() => { setOpen(false); setForm(EMPTY_FORM); setFormSuccess(''); }, 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to book appointment';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() { setOpen(false); setForm(EMPTY_FORM); setFormError(''); setFormSuccess(''); }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Appointments</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{data?.total || 0} total appointments</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Appointment</Button>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value as string)} label="Status">
                <MenuItem value="">All Statuses</MenuItem>
                {['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled'].map((s) => (
                  <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="From Date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            {(status || from) && <Button size="small" variant="text" onClick={() => { setStatus(''); setFrom(''); }}>Clear filters</Button>}
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
                  ? <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>No appointments found. Click &quot;New Appointment&quot; to book one.</TableCell></TableRow>
                  : appointments.map((a: Record<string, any>) => (
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
                        {a.is_telemedicine
                          ? <Chip icon={<VideoCallIcon />} label="Telemedicine" size="small" color="info" variant="outlined" />
                          : <Chip label="In-Person" size="small" variant="outlined" />}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* New Appointment Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>Book New Appointment</Typography>
            <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent dividers>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            {formSuccess && <Alert severity="success" sx={{ mb: 2 }}>{formSuccess}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField select label="Patient" value={form.patientId} onChange={update('patientId')} fullWidth required>
                  <MenuItem value="">Select patient...</MenuItem>
                  {patients.map((p: Record<string, string>) => (
                    <MenuItem key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.mrn}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Type" value={form.type} onChange={update('type')} fullWidth>
                  {['consultation', 'follow_up', 'procedure', 'lab', 'imaging', 'telemedicine', 'emergency'].map((t) => (
                    <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Priority" value={form.priority} onChange={update('priority')} fullWidth>
                  <MenuItem value="routine">Routine</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={8}>
                <TextField label="Date & Time" type="datetime-local" value={form.scheduledAt} onChange={update('scheduledAt')} fullWidth required InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={4}>
                <TextField select label="Duration" value={form.durationMinutes} onChange={update('durationMinutes')} fullWidth>
                  {['15', '30', '45', '60', '90', '120'].map((d) => <MenuItem key={d} value={d}>{d} min</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Chief Complaint" value={form.chiefComplaint} onChange={update('chiefComplaint')} fullWidth placeholder="Reason for visit..." />
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Mode" value={form.isTelemedicine} onChange={update('isTelemedicine')} fullWidth>
                  <MenuItem value="false">In-Person</MenuItem>
                  <MenuItem value="true">Telemedicine</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Notes" value={form.notes} onChange={update('notes')} fullWidth multiline rows={2} placeholder="Additional notes..." />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : null}>
              {saving ? 'Booking...' : 'Book Appointment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
