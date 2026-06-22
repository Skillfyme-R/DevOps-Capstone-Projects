import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Avatar, IconButton, Stack, Skeleton, Pagination, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Grid, MenuItem, Alert, CircularProgress, Divider } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useQueryClient } from 'react-query';
import { differenceInYears, parseISO } from 'date-fns';
import { patientsClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';
import { useAuthContext } from '../App';

const GENDER_COLOR: Record<string, string> = { male: MC_COLORS.teal[500], female: MC_COLORS.emerald[500], other: MC_COLORS.status.info };

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '',
  gender: 'male', bloodGroup: '', maritalStatus: '',
  addressLine1: '', city: '', state: '', postalCode: '',
  emergencyName: '', emergencyRelation: '', emergencyPhone: '',
};

export default function PatientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const canDelete = ['admin', 'superadmin'].includes(user?.role || '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [deletePatient, setDeletePatient] = useState<Record<string, string> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const LIMIT = 15;

  const { data, isLoading } = useQuery(
    ['patients', search, page],
    () => patientsClient.get('/patients', { params: { search, page, limit: LIMIT } }).then((r: { data: any }) => r.data),
    { keepPreviousData: true, retry: false }
  );

  const patients = data?.patients || [];
  const total = data?.total || 0;

  function update(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName) { setFormError('First and last name are required'); return; }
    setSaving(true);
    setFormError('');
    try {
      const hasAddress = form.addressLine1 || form.city || form.state || form.postalCode;
      const hasEmergency = form.emergencyName && form.emergencyPhone;
      await patientsClient.post('/patients', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone ? (form.phone.startsWith('+') ? form.phone.replace(/\s+/g, '') : `+91${form.phone.replace(/\s+/g, '')}`) : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
        bloodGroup: form.bloodGroup || undefined,
        maritalStatus: form.maritalStatus || undefined,
        address: hasAddress ? {
          line1: form.addressLine1 || '',
          city: form.city || 'N/A',
          state: form.state || 'N/A',
          postalCode: form.postalCode || '000000',
        } : undefined,
        emergencyContact: hasEmergency ? {
          name: form.emergencyName,
          relationship: form.emergencyRelation || 'Family',
          phone: form.emergencyPhone.startsWith('+') ? form.emergencyPhone : `+91${form.emergencyPhone}`,
        } : undefined,
      });
      setFormSuccess('Patient registered successfully!');
      queryClient.invalidateQueries('patients');
      setTimeout(() => { setOpen(false); setForm(EMPTY_FORM); setFormSuccess(''); }, 1500);
    } catch (err: unknown) {
      const e = err as any;
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Failed to register patient';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() { setOpen(false); setForm(EMPTY_FORM); setFormError(''); setFormSuccess(''); }

  async function handleDelete() {
    if (!deletePatient) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await patientsClient.delete(`/patients/${deletePatient.id}`);
      queryClient.invalidateQueries('patients');
      setDeletePatient(null);
    } catch (err: unknown) {
      setDeleteError((err as any)?.response?.data?.error?.message || 'Failed to delete patient');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Patient Registry</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{total.toLocaleString()} total patients</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Patient</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <TextField
            placeholder="Search by name, MRN, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            fullWidth
            sx={{ mb: 3 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
          />

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>MRN</TableCell>
                  <TableCell>Age / Gender</TableCell>
                  <TableCell>Blood Group</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Registered</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                  : patients.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                          <PersonIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled', display: 'block', mx: 'auto' }} />
                          <Typography>No patients found</Typography>
                        </TableCell>
                      </TableRow>
                    )
                    : patients.map((p: Record<string, string>) => {
                      const age = p.date_of_birth ? differenceInYears(new Date(), parseISO(p.date_of_birth)) : null;
                      return (
                        <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Avatar sx={{ bgcolor: MC_COLORS.teal[100], color: MC_COLORS.teal[700], width: 36, height: 36, fontSize: '0.875rem' }}>
                                {(p.first_name?.[0] || '') + (p.last_name?.[0] || '')}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{p.first_name} {p.last_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{p.email || '—'}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell><Typography variant="body2" fontFamily="monospace">{p.mrn}</Typography></TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2">{age !== null && age > 0 ? `${age} yrs` : '—'}</Typography>
                              <Chip label={p.gender} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${GENDER_COLOR[p.gender] || MC_COLORS.clinical.textGray}20`, color: GENDER_COLOR[p.gender] || MC_COLORS.clinical.textGray, width: 'fit-content' }} />
                            </Stack>
                          </TableCell>
                          <TableCell>{p.blood_group ? <Chip label={p.blood_group} size="small" color="error" variant="outlined" /> : '—'}</TableCell>
                          <TableCell><Typography variant="body2">{p.phone || '—'}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{p.created_at ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(p.created_at)) : '—'}</Typography></TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                              <Tooltip title="View Patient"><IconButton size="small" onClick={() => navigate(`/patients/${p.id}`)} sx={{ color: 'primary.main' }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                              {canDelete && (
                                <Tooltip title="Delete Patient"><IconButton size="small" onClick={() => { setDeletePatient(p); setDeleteError(''); }} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </TableContainer>

          {total > LIMIT && (
            <Box mt={3} display="flex" justifyContent="center">
              <Pagination count={Math.ceil(total / LIMIT)} page={page} onChange={(_, v) => setPage(v)} color="primary" />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* New Patient Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>Register New Patient</Typography>
            <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent dividers>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            {formSuccess && <Alert severity="success" sx={{ mb: 2 }}>{formSuccess}</Alert>}
            <Grid container spacing={2}>

              {/* Basic Info */}
              <Grid item xs={12}><Divider><Typography variant="caption" fontWeight={700} color="text.secondary">BASIC INFORMATION</Typography></Divider></Grid>
              <Grid item xs={6}><TextField label="First Name *" value={form.firstName} onChange={update('firstName')} fullWidth required autoFocus /></Grid>
              <Grid item xs={6}><TextField label="Last Name *" value={form.lastName} onChange={update('lastName')} fullWidth required /></Grid>
              <Grid item xs={12}><TextField label="Email Address" type="email" value={form.email} onChange={update('email')} fullWidth placeholder="patient@example.com" /></Grid>
              <Grid item xs={6}><TextField label="Phone Number" value={form.phone} onChange={update('phone')} fullWidth placeholder="9876543210 (auto +91)" /></Grid>
              <Grid item xs={6}>
                <TextField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} fullWidth InputLabelProps={{ shrink: true }}
                  inputProps={{ max: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10) }}
                  helperText={form.dateOfBirth && differenceInYears(new Date(), parseISO(form.dateOfBirth)) > 0 ? `Age: ${differenceInYears(new Date(), parseISO(form.dateOfBirth))} years` : 'Cannot be today or future date'} />
              </Grid>
              <Grid item xs={4}>
                <TextField select label="Gender *" value={form.gender} onChange={update('gender')} fullWidth>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField select label="Blood Group" value={form.bloodGroup} onChange={update('bloodGroup')} fullWidth>
                  <MenuItem value="">Not Known</MenuItem>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => <MenuItem key={bg} value={bg}>{bg}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={4}>
                <TextField select label="Marital Status" value={form.maritalStatus} onChange={update('maritalStatus')} fullWidth>
                  <MenuItem value="">Not Specified</MenuItem>
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="married">Married</MenuItem>
                  <MenuItem value="divorced">Divorced</MenuItem>
                  <MenuItem value="widowed">Widowed</MenuItem>
                </TextField>
              </Grid>

              {/* Address */}
              <Grid item xs={12}><Divider><Typography variant="caption" fontWeight={700} color="text.secondary">ADDRESS</Typography></Divider></Grid>
              <Grid item xs={12}><TextField label="House / Flat / Street" value={form.addressLine1} onChange={update('addressLine1')} fullWidth placeholder="e.g. 42, MG Road, Koramangala" /></Grid>
              <Grid item xs={5}><TextField label="City" value={form.city} onChange={update('city')} fullWidth placeholder="e.g. Bengaluru" /></Grid>
              <Grid item xs={4}><TextField label="State" value={form.state} onChange={update('state')} fullWidth placeholder="e.g. Karnataka" /></Grid>
              <Grid item xs={3}><TextField label="PIN Code" value={form.postalCode} onChange={update('postalCode')} fullWidth placeholder="560001" /></Grid>

              {/* Emergency Contact */}
              <Grid item xs={12}><Divider><Typography variant="caption" fontWeight={700} color="text.secondary">EMERGENCY CONTACT</Typography></Divider></Grid>
              <Grid item xs={5}><TextField label="Contact Name" value={form.emergencyName} onChange={update('emergencyName')} fullWidth placeholder="e.g. Priya Sharma" /></Grid>
              <Grid item xs={3}><TextField label="Relation" value={form.emergencyRelation} onChange={update('emergencyRelation')} fullWidth placeholder="e.g. Spouse" /></Grid>
              <Grid item xs={4}><TextField label="Emergency Phone" value={form.emergencyPhone} onChange={update('emergencyPhone')} fullWidth placeholder="9876543210" /></Grid>

            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : null}>
              {saving ? 'Registering...' : 'Register Patient'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deletePatient)} onClose={() => setDeletePatient(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700} color="error.main">Delete Patient</Typography>
            <IconButton size="small" onClick={() => setDeletePatient(null)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will permanently delete the patient record. This action cannot be undone.
          </Alert>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deletePatient?.first_name} {deletePatient?.last_name}</strong> (MRN: <span style={{ fontFamily: 'monospace' }}>{deletePatient?.mrn}</span>)?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeletePatient(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}>
            {deleting ? 'Deleting...' : 'Yes, Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
