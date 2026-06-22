import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton, Select, MenuItem, FormControl, InputLabel, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert, CircularProgress, IconButton, Tooltip, Tabs, Tab, Divider, Avatar, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DoneIcon from '@mui/icons-material/Done';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useQuery, useQueryClient } from 'react-query';
import { parseISO, differenceInYears } from 'date-fns';
import { patientsClient, appointmentsClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';
import { useAuthContext } from '../App';

const TZ = 'Asia/Kolkata';
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(parseISO(iso));
}
function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true }).format(parseISO(iso));
}
function fmtDateTime(iso: string) {
  return `${fmtDate(iso)}, ${fmtTime(iso)}`;
}

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  scheduled: 'info', confirmed: 'primary', checked_in: 'secondary', in_progress: 'warning', completed: 'success', no_show: 'error', cancelled: 'default',
};

const PRIORITY_COLOR: Record<string, string> = { routine: MC_COLORS.status.info, urgent: MC_COLORS.status.warning, emergency: MC_COLORS.status.critical };

const ALL_STATUSES = ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled'];

const EMPTY_STAFF_FORM = { patientId: '', type: 'consultation', scheduledAt: '', durationMinutes: '30', chiefComplaint: '', priority: 'routine', isTelemedicine: 'false', notes: '' };
const EMPTY_PATIENT_FORM = { type: 'consultation', scheduledAt: '', chiefComplaint: '', isTelemedicine: 'false', notes: '' };

export default function AppointmentsPage() {
  const { user } = useAuthContext();
  const isPatient = user?.role === 'patient';
  const isStaff = !isPatient;
  const canManageAppointments = ['clinician', 'nurse', 'admin', 'superadmin'].includes(user?.role || '');
  const canWriteReport = ['clinician', 'nurse', 'admin', 'superadmin'].includes(user?.role || '');

  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');

  // Booking dialog
  const [open, setOpen] = useState(false);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM);
  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Staff-only: Update status dialog
  const [statusDialogAppt, setStatusDialogAppt] = useState<Record<string, any> | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Cancel dialog (both roles)
  const [cancelAppt, setCancelAppt] = useState<Record<string, any> | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Staff quick-action tracking
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Write Report dialog
  const [reportAppt, setReportAppt] = useState<Record<string, any> | null>(null);
  const [reportForm, setReportForm] = useState({
    diagnosis: '', clinicalFindings: '',
    bp: '', pulse: '', temperature: '', weight: '', spo2: '',
    medicine1: '', dose1: '', freq1: '', days1: '',
    medicine2: '', dose2: '', freq2: '', days2: '',
    medicine3: '', dose3: '', freq3: '', days3: '',
    labOrders: '', followUpInstructions: '', followUpDate: '', sicknoteDays: '',
  });
  const [reportSaving, setReportSaving] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');

  function openReportDialog(r: Record<string, any>) {
    setReportAppt(r);
    setReportForm({
      diagnosis: r.diagnosis || '',
      clinicalFindings: r.clinical_findings || '',
      bp: r.vitals?.bp || '', pulse: r.vitals?.pulse || '',
      temperature: r.vitals?.temperature || '', weight: r.vitals?.weight || '', spo2: r.vitals?.spo2 || '',
      medicine1: r.report_prescriptions?.[0]?.name || '', dose1: r.report_prescriptions?.[0]?.dose || '',
      freq1: r.report_prescriptions?.[0]?.frequency || '', days1: r.report_prescriptions?.[0]?.days || '',
      medicine2: r.report_prescriptions?.[1]?.name || '', dose2: r.report_prescriptions?.[1]?.dose || '',
      freq2: r.report_prescriptions?.[1]?.frequency || '', days2: r.report_prescriptions?.[1]?.days || '',
      medicine3: r.report_prescriptions?.[2]?.name || '', dose3: r.report_prescriptions?.[2]?.dose || '',
      freq3: r.report_prescriptions?.[2]?.frequency || '', days3: r.report_prescriptions?.[2]?.days || '',
      labOrders: Array.isArray(r.report_lab_orders) ? r.report_lab_orders.join(', ') : (r.report_lab_orders || ''),
      followUpInstructions: r.follow_up_instructions || '',
      followUpDate: r.follow_up_date ? r.follow_up_date.slice(0, 10) : '',
      sicknoteDays: r.sicknote_days ? String(r.sicknote_days) : '',
    });
    setReportError('');
    setReportSuccess('');
  }

  async function handleSaveReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportAppt) return;
    setReportSaving(true);
    setReportError('');
    const prescriptions = [
      reportForm.medicine1 && { name: reportForm.medicine1, dose: reportForm.dose1, frequency: reportForm.freq1, days: reportForm.days1 },
      reportForm.medicine2 && { name: reportForm.medicine2, dose: reportForm.dose2, frequency: reportForm.freq2, days: reportForm.days2 },
      reportForm.medicine3 && { name: reportForm.medicine3, dose: reportForm.dose3, frequency: reportForm.freq3, days: reportForm.days3 },
    ].filter(Boolean);
    const labOrders = reportForm.labOrders ? reportForm.labOrders.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    try {
      await appointmentsClient.post(`/appointments/${reportAppt.id}/report`, {
        diagnosis: reportForm.diagnosis || undefined,
        clinicalFindings: reportForm.clinicalFindings || undefined,
        vitals: { bp: reportForm.bp, pulse: reportForm.pulse, temperature: reportForm.temperature, weight: reportForm.weight, spo2: reportForm.spo2 },
        prescriptions, labOrders,
        followUpInstructions: reportForm.followUpInstructions || undefined,
        followUpDate: reportForm.followUpDate || undefined,
        sicknoteDays: reportForm.sicknoteDays ? Number(reportForm.sicknoteDays) : undefined,
      });
      setReportSuccess('Report saved successfully!');
      queryClient.invalidateQueries('appointment-reports');
      setTimeout(() => { setReportAppt(null); setReportSuccess(''); }, 1500);
    } catch (err: unknown) {
      setReportError((err as any)?.response?.data?.error?.message || 'Failed to save report');
    } finally {
      setReportSaving(false);
    }
  }

  const { data, isLoading } = useQuery(
    ['appointments', statusFilter, from],
    () => appointmentsClient.get('/appointments', { params: { status: statusFilter || undefined, from: from || undefined, limit: 50 } }).then((r: { data: any }) => r.data),
    { retry: false }
  );

  // Staff only: fetch patient list for booking form
  const { data: patientsData } = useQuery(
    'patients-list',
    () => patientsClient.get('/patients', { params: { limit: 100 } }).then((r: { data: any }) => r.data),
    { enabled: isStaff, retry: false }
  );

  // Reports: completed visits
  const { data: reportsData, isLoading: reportsLoading } = useQuery(
    'appointment-reports',
    () => appointmentsClient.get('/appointments/reports', { params: { limit: 100 } }).then((r: { data: any }) => r.data),
    { retry: false, enabled: mainTab === 1 }
  );

  const appointments = data?.appointments || [];
  const patients = patientsData?.patients || [];
  const reports = reportsData?.reports || [];

  function updateStaff(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) =>
      setStaffForm((f) => ({ ...f, [key]: (e.target as HTMLInputElement).value }));
  }
  function updatePatient(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) =>
      setPatientForm((f) => ({ ...f, [key]: (e.target as HTMLInputElement).value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const scheduledAt = isPatient ? patientForm.scheduledAt : staffForm.scheduledAt;
    if (!scheduledAt) { setFormError('Date and time are required'); return; }
    if (isStaff && !staffForm.patientId) { setFormError('Please select a patient'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (isPatient) {
        await appointmentsClient.post('/appointments', {
          type: patientForm.type,
          scheduledAt: new Date(patientForm.scheduledAt).toISOString(),
          durationMinutes: 30,
          chiefComplaint: patientForm.chiefComplaint || undefined,
          priority: 'routine',
          isTelemedicine: patientForm.isTelemedicine === 'true',
          notes: patientForm.notes || undefined,
        });
      } else {
        await appointmentsClient.post('/appointments', {
          patientId: staffForm.patientId,
          type: staffForm.type,
          scheduledAt: new Date(staffForm.scheduledAt).toISOString(),
          durationMinutes: Number(staffForm.durationMinutes),
          chiefComplaint: staffForm.chiefComplaint || undefined,
          priority: staffForm.priority,
          isTelemedicine: staffForm.isTelemedicine === 'true',
          notes: staffForm.notes || undefined,
        });
      }
      setFormSuccess('Appointment booked successfully!');
      queryClient.invalidateQueries('appointments');
      setTimeout(() => {
        setOpen(false);
        setStaffForm(EMPTY_STAFF_FORM);
        setPatientForm(EMPTY_PATIENT_FORM);
        setFormSuccess('');
      }, 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to book appointment';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setStaffForm(EMPTY_STAFF_FORM);
    setPatientForm(EMPTY_PATIENT_FORM);
    setFormError('');
    setFormSuccess('');
  }

  // Staff only
  function openStatusDialog(appt: Record<string, any>) {
    setStatusDialogAppt(appt);
    setNewStatus(appt.status);
    setStatusError('');
  }

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!statusDialogAppt) return;
    setStatusUpdating(true);
    setStatusError('');
    try {
      await appointmentsClient.patch(`/appointments/${statusDialogAppt.id}/status`, { status: newStatus });
      queryClient.invalidateQueries('appointments');
      setStatusDialogAppt(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to update status';
      setStatusError(msg);
    } finally {
      setStatusUpdating(false);
    }
  }

  // Staff only quick one-click actions
  async function handleQuickAction(apptId: string, status: string) {
    setActionInProgress(apptId + status);
    try {
      await appointmentsClient.patch(`/appointments/${apptId}/status`, { status });
      queryClient.invalidateQueries('appointments');
    } catch {
      // silent — staff can use Edit icon as fallback
    } finally {
      setActionInProgress(null);
    }
  }

  // Both roles: cancel
  function openCancelDialog(appt: Record<string, any>) {
    setCancelAppt(appt);
    setCancelReason('');
    setCancelError('');
  }

  async function handleCancelConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelAppt) return;
    setCancelling(true);
    setCancelError('');
    try {
      await appointmentsClient.patch(`/appointments/${cancelAppt.id}/status`, {
        status: 'cancelled',
        cancellationReason: cancelReason || (isPatient ? 'Cancelled by patient' : 'Cancelled by staff'),
      });
      queryClient.invalidateQueries('appointments');
      setCancelAppt(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to cancel appointment';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  }

  const TYPE_LABEL: Record<string, string> = {
    consultation: 'Consultation', follow_up: 'Follow-Up', procedure: 'Procedure',
    lab: 'Lab', imaging: 'Imaging', telemedicine: 'Telemedicine', emergency: 'Emergency',
    routine_checkup: 'Routine Checkup', specialist: 'Specialist',
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {isPatient ? 'My Appointments' : 'Appointments'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {isPatient ? 'View and manage your appointments' : `${data?.total || 0} total appointments`}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          {isPatient ? 'Book Appointment' : 'New Appointment'}
        </Button>
      </Stack>

      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<CalendarMonthIcon />} iconPosition="start" label={isPatient ? 'My Appointments' : 'Schedule'} />
        <Tab icon={<AssignmentIcon />} iconPosition="start" label="Visit Reports" />
      </Tabs>

      {/* ── VISIT REPORTS TAB ── */}
      {mainTab === 1 && (
        <Box>
          {reportsLoading ? (
            <Stack spacing={2}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={200} />)}</Stack>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">No completed visits yet</Typography>
                <Typography variant="body2" color="text.disabled" mt={1}>
                  Visit reports appear here once an appointment is marked as completed.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={3}>
              {reports.map((r: Record<string, any>) => {
                const vitals = r.vitals || {};
                const prescriptions: any[] = Array.isArray(r.report_prescriptions) ? r.report_prescriptions : [];
                const labOrders: string[] = Array.isArray(r.report_lab_orders) ? r.report_lab_orders : [];
                const hasReport = !!r.report_id;
                return (
                  <Card key={r.id} variant="outlined" sx={{ borderLeft: `4px solid ${MC_COLORS.emerald[500]}` }}>
                    <CardContent sx={{ p: 3 }}>

                      {/* Header */}
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{ bgcolor: `${MC_COLORS.emerald[500]}18`, width: 44, height: 44 }}>
                            <AssignmentIcon sx={{ color: MC_COLORS.emerald[500], fontSize: 22 }} />
                          </Avatar>
                          <Box>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                              <Typography variant="subtitle1" fontWeight={700}>{TYPE_LABEL[r.type] || r.type}</Typography>
                              {!isPatient && r.first_name && <Chip label={`${r.first_name} ${r.last_name}`} size="small" sx={{ fontWeight: 600 }} />}
                              {!isPatient && r.mrn && <Chip label={r.mrn} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} />}
                              {r.date_of_birth && <Chip label={`${differenceInYears(new Date(), parseISO(r.date_of_birth))} yrs · ${r.gender || ''}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{fmtDateTime(r.scheduled_at)} IST · {r.duration_minutes} min</Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} flexShrink={0} alignItems="center">
                          <Chip label="Completed" size="small" color="success" />
                          {r.priority !== 'routine' && <Chip label={r.priority} size="small" color={r.priority === 'emergency' ? 'error' : 'warning'} />}
                          {canWriteReport && (
                            <Button size="small" variant={hasReport ? 'outlined' : 'contained'} startIcon={<EditIcon />} onClick={() => openReportDialog(r)}
                              sx={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                              {hasReport ? 'Edit Report' : 'Write Report'}
                            </Button>
                          )}
                        </Stack>
                      </Stack>

                      <Divider sx={{ mb: 2 }} />

                      {/* Chief complaint + notes row */}
                      <Grid container spacing={2} mb={hasReport ? 2 : 0}>
                        {r.chief_complaint && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>CHIEF COMPLAINT</Typography>
                            <Typography variant="body2">{r.chief_complaint}</Typography>
                          </Grid>
                        )}
                        {r.notes && (
                          <Grid item xs={12} sm={r.chief_complaint ? 6 : 12}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>APPOINTMENT NOTES</Typography>
                            <Typography variant="body2">{r.notes}</Typography>
                          </Grid>
                        )}
                        {!r.chief_complaint && !r.notes && !hasReport && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.disabled" fontStyle="italic">
                              No clinical details recorded. {isStaff ? 'Click "Write Report" to add diagnosis, medications and more.' : 'No report has been written for this visit yet.'}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>

                      {/* Clinical report section */}
                      {hasReport && (
                        <Box>
                          <Grid container spacing={2}>

                            {/* Diagnosis */}
                            {r.diagnosis && (
                              <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: `${MC_COLORS.emerald[500]}08` }}>
                                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                    <MedicalServicesIcon sx={{ color: MC_COLORS.emerald[600], fontSize: 18 }} />
                                    <Typography variant="caption" fontWeight={700} color={MC_COLORS.emerald[700]}>DIAGNOSIS</Typography>
                                  </Stack>
                                  <Typography variant="body2" fontWeight={600}>{r.diagnosis}</Typography>
                                  {r.clinical_findings && (
                                    <Typography variant="body2" color="text.secondary" mt={0.5}>{r.clinical_findings}</Typography>
                                  )}
                                </Paper>
                              </Grid>
                            )}

                            {/* Vitals */}
                            {(vitals.bp || vitals.pulse || vitals.temperature || vitals.weight || vitals.spo2) && (
                              <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                  <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                                    <MonitorHeartIcon sx={{ color: MC_COLORS.teal[500], fontSize: 18 }} />
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">VITALS</Typography>
                                  </Stack>
                                  <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
                                    {vitals.bp && <Box sx={{ textAlign: 'center', minWidth: 70 }}><Typography variant="h6" fontWeight={700} color={MC_COLORS.teal[600]}>{vitals.bp}</Typography><Typography variant="caption" color="text.secondary">BP (mmHg)</Typography></Box>}
                                    {vitals.pulse && <Box sx={{ textAlign: 'center', minWidth: 70 }}><Typography variant="h6" fontWeight={700} color={MC_COLORS.teal[600]}>{vitals.pulse}</Typography><Typography variant="caption" color="text.secondary">Pulse (bpm)</Typography></Box>}
                                    {vitals.temperature && <Box sx={{ textAlign: 'center', minWidth: 70 }}><Typography variant="h6" fontWeight={700} color={MC_COLORS.teal[600]}>{vitals.temperature}°C</Typography><Typography variant="caption" color="text.secondary">Temperature</Typography></Box>}
                                    {vitals.weight && <Box sx={{ textAlign: 'center', minWidth: 70 }}><Typography variant="h6" fontWeight={700} color={MC_COLORS.teal[600]}>{vitals.weight} kg</Typography><Typography variant="caption" color="text.secondary">Weight</Typography></Box>}
                                    {vitals.spo2 && <Box sx={{ textAlign: 'center', minWidth: 70 }}><Typography variant="h6" fontWeight={700} color={MC_COLORS.teal[600]}>{vitals.spo2}%</Typography><Typography variant="caption" color="text.secondary">SpO₂</Typography></Box>}
                                  </Stack>
                                </Paper>
                              </Grid>
                            )}

                            {/* Prescriptions */}
                            {prescriptions.length > 0 && (
                              <Grid item xs={12} md={labOrders.length > 0 ? 7 : 12}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                  <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                                    <MedicationIcon sx={{ color: MC_COLORS.status.warning, fontSize: 18 }} />
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">PRESCRIBED MEDICINES</Typography>
                                  </Stack>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Medicine</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Dose</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Frequency</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Days</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {prescriptions.map((p: any, i: number) => (
                                        <TableRow key={i}>
                                          <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                                          <TableCell>{p.dose || '—'}</TableCell>
                                          <TableCell>{p.frequency || '—'}</TableCell>
                                          <TableCell>{p.days ? `${p.days}d` : '—'}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Paper>
                              </Grid>
                            )}

                            {/* Lab Orders */}
                            {labOrders.length > 0 && (
                              <Grid item xs={12} md={prescriptions.length > 0 ? 5 : 12}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                  <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                                    <ScienceIcon sx={{ color: MC_COLORS.status.info, fontSize: 18 }} />
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">LAB ORDERS</Typography>
                                  </Stack>
                                  <Stack spacing={0.75}>
                                    {labOrders.map((l: string, i: number) => (
                                      <Stack key={i} direction="row" alignItems="center" spacing={1}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: MC_COLORS.status.info, flexShrink: 0 }} />
                                        <Typography variant="body2">{l}</Typography>
                                      </Stack>
                                    ))}
                                  </Stack>
                                </Paper>
                              </Grid>
                            )}

                            {/* Follow-up */}
                            {(r.follow_up_instructions || r.follow_up_date || r.sicknote_days) && (
                              <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                    <EventNoteIcon sx={{ color: MC_COLORS.teal[500], fontSize: 18 }} />
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">FOLLOW-UP & INSTRUCTIONS</Typography>
                                  </Stack>
                                  <Grid container spacing={2}>
                                    {r.follow_up_instructions && (
                                      <Grid item xs={12} sm={r.follow_up_date ? 8 : 12}>
                                        <Typography variant="body2">{r.follow_up_instructions}</Typography>
                                      </Grid>
                                    )}
                                    {r.follow_up_date && (
                                      <Grid item xs={12} sm={4}>
                                        <Typography variant="caption" color="text.secondary" display="block">Next Visit</Typography>
                                        <Typography variant="body2" fontWeight={600}>{new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Typography>
                                      </Grid>
                                    )}
                                    {r.sicknote_days && (
                                      <Grid item xs={12}>
                                        <Chip label={`Sick Note: ${r.sicknote_days} day(s) rest recommended`} size="small" color="warning" variant="outlined" />
                                      </Grid>
                                    )}
                                  </Grid>
                                </Paper>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}

          {/* Write / Edit Report Dialog */}
          {isStaff && (
            <Dialog open={Boolean(reportAppt)} onClose={() => setReportAppt(null)} maxWidth="md" fullWidth>
              <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6" fontWeight={700}>{reportAppt?.report_id ? 'Edit Visit Report' : 'Write Visit Report'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reportAppt && `${TYPE_LABEL[reportAppt.type] || reportAppt.type} · ${fmtDateTime(reportAppt?.scheduled_at)} · ${reportAppt?.first_name} ${reportAppt?.last_name}`}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setReportAppt(null)}><CloseIcon /></IconButton>
                </Stack>
              </DialogTitle>
              <form onSubmit={handleSaveReport}>
                <DialogContent dividers>
                  {reportError && <Alert severity="error" sx={{ mb: 2 }}>{reportError}</Alert>}
                  {reportSuccess && <Alert severity="success" sx={{ mb: 2 }}>{reportSuccess}</Alert>}

                  <Grid container spacing={2.5}>
                    {/* Diagnosis */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" fontWeight={700} color={MC_COLORS.emerald[700]} mb={1}>Diagnosis & Findings</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Diagnosis" value={reportForm.diagnosis} onChange={(e) => setReportForm(f => ({ ...f, diagnosis: e.target.value }))}
                        fullWidth placeholder="e.g. Type 2 Diabetes Mellitus, Viral Upper Respiratory Tract Infection" />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Clinical Findings / Examination Notes" value={reportForm.clinicalFindings}
                        onChange={(e) => setReportForm(f => ({ ...f, clinicalFindings: e.target.value }))}
                        fullWidth multiline rows={2} placeholder="e.g. Chest clear, abdomen soft, no organomegaly..." />
                    </Grid>

                    {/* Vitals */}
                    <Grid item xs={12}><Divider><Typography variant="caption" fontWeight={700} color="text.secondary">VITALS</Typography></Divider></Grid>
                    <Grid item xs={6} sm={4} md={2.4}><TextField label="BP (mmHg)" value={reportForm.bp} onChange={(e) => setReportForm(f => ({ ...f, bp: e.target.value }))} fullWidth placeholder="120/80" /></Grid>
                    <Grid item xs={6} sm={4} md={2.4}><TextField label="Pulse (bpm)" value={reportForm.pulse} onChange={(e) => setReportForm(f => ({ ...f, pulse: e.target.value }))} fullWidth placeholder="72" /></Grid>
                    <Grid item xs={6} sm={4} md={2.4}><TextField label="Temp (°C)" value={reportForm.temperature} onChange={(e) => setReportForm(f => ({ ...f, temperature: e.target.value }))} fullWidth placeholder="37.0" /></Grid>
                    <Grid item xs={6} sm={4} md={2.4}><TextField label="Weight (kg)" value={reportForm.weight} onChange={(e) => setReportForm(f => ({ ...f, weight: e.target.value }))} fullWidth placeholder="70" /></Grid>
                    <Grid item xs={6} sm={4} md={2.4}><TextField label="SpO₂ (%)" value={reportForm.spo2} onChange={(e) => setReportForm(f => ({ ...f, spo2: e.target.value }))} fullWidth placeholder="98" /></Grid>

                    {/* Medicines */}
                    <Grid item xs={12}><Divider><Typography variant="caption" fontWeight={700} color="text.secondary">PRESCRIBED MEDICINES</Typography></Divider></Grid>
                    {([
                      { n: 'medicine1', d: 'dose1', f: 'freq1', dy: 'days1' },
                      { n: 'medicine2', d: 'dose2', f: 'freq2', dy: 'days2' },
                      { n: 'medicine3', d: 'dose3', f: 'freq3', dy: 'days3' },
                    ] as const).map((row, i) => (
                      <React.Fragment key={i}>
                        <Grid item xs={12} sm={4}><TextField label={`Medicine ${i + 1}`} value={(reportForm as any)[row.n]} onChange={(e) => setReportForm(f => ({ ...f, [row.n]: e.target.value }))} fullWidth placeholder="e.g. Paracetamol 500mg" /></Grid>
                        <Grid item xs={4} sm={3}><TextField label="Dose" value={(reportForm as any)[row.d]} onChange={(e) => setReportForm(f => ({ ...f, [row.d]: e.target.value }))} fullWidth placeholder="500mg" /></Grid>
                        <Grid item xs={4} sm={3}><TextField label="Frequency" value={(reportForm as any)[row.f]} onChange={(e) => setReportForm(f => ({ ...f, [row.f]: e.target.value }))} fullWidth placeholder="1-0-1" /></Grid>
                        <Grid item xs={4} sm={2}><TextField label="Days" type="number" value={(reportForm as any)[row.dy]} onChange={(e) => setReportForm(f => ({ ...f, [row.dy]: e.target.value }))} fullWidth placeholder="5" /></Grid>
                      </React.Fragment>
                    ))}

                    {/* Lab orders */}
                    <Grid item xs={12}><Divider><Typography variant="caption" fontWeight={700} color="text.secondary">LAB ORDERS & FOLLOW-UP</Typography></Divider></Grid>
                    <Grid item xs={12}>
                      <TextField label="Lab / Investigation Orders (comma-separated)" value={reportForm.labOrders}
                        onChange={(e) => setReportForm(f => ({ ...f, labOrders: e.target.value }))} fullWidth
                        placeholder="e.g. CBC, HbA1c, Lipid Profile, Chest X-Ray" />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Follow-Up Instructions" value={reportForm.followUpInstructions}
                        onChange={(e) => setReportForm(f => ({ ...f, followUpInstructions: e.target.value }))}
                        fullWidth multiline rows={2} placeholder="e.g. Avoid spicy food, rest for 3 days, monitor BP daily..." />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField label="Next Visit Date" type="date" value={reportForm.followUpDate}
                        onChange={(e) => setReportForm(f => ({ ...f, followUpDate: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField label="Sick Note (days)" type="number" value={reportForm.sicknoteDays}
                        onChange={(e) => setReportForm(f => ({ ...f, sicknoteDays: e.target.value }))} fullWidth placeholder="3" />
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={() => setReportAppt(null)} disabled={reportSaving}>Cancel</Button>
                  <Button type="submit" variant="contained" disabled={reportSaving}
                    startIcon={reportSaving ? <CircularProgress size={16} /> : <AssignmentIcon />}>
                    {reportSaving ? 'Saving...' : 'Save Report'}
                  </Button>
                </DialogActions>
              </form>
            </Dialog>
          )}
        </Box>
      )}

      {/* ── SCHEDULE TAB ── */}
      {mainTab === 0 && (
        <Box>
      {/* Filters — staff only */}
      {isStaff && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as string)} label="Status">
                  <MenuItem value="">All Statuses</MenuItem>
                  {ALL_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField size="small" type="date" label="From Date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
              {(statusFilter || from) && <Button size="small" variant="text" onClick={() => { setStatusFilter(''); setFrom(''); }}>Clear filters</Button>}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date & Time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Duration</TableCell>
                {isStaff && <TableCell>Priority</TableCell>}
                <TableCell>Status</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: isStaff ? 8 : 7 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                  </TableRow>
                ))
                : appointments.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={isStaff ? 8 : 7} sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                        <Typography>
                          {isPatient ? 'You have no appointments yet. Click "Book Appointment" to get started.' : 'No appointments found.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                  : appointments.map((a: Record<string, any>) => (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{a.scheduled_at ? fmtDate(a.scheduled_at) : '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.scheduled_at ? fmtTime(a.scheduled_at) : ''} IST</Typography>
                      </TableCell>
                      <TableCell><Chip label={a.type?.replace(/_/g, ' ')} size="small" /></TableCell>
                      <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{a.chief_complaint || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{a.duration_minutes} min</Typography></TableCell>
                      {isStaff && (
                        <TableCell>
                          <Chip label={a.priority} size="small" sx={{ bgcolor: `${PRIORITY_COLOR[a.priority]}20`, color: PRIORITY_COLOR[a.priority], fontWeight: 600 }} />
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip label={a.status?.replace(/_/g, ' ')} size="small" color={STATUS_COLOR[a.status] || 'default'} />
                      </TableCell>
                      <TableCell>
                        {a.is_telemedicine
                          ? <Chip icon={<VideoCallIcon />} label="Telemedicine" size="small" color="info" variant="outlined" />
                          : <Chip label="In-Person" size="small" variant="outlined" />}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">

                          {/* PATIENT actions: Check In + Cancel only */}
                          {isPatient && (
                            <>
                              {a.status === 'confirmed' && (
                                <Tooltip title="I have arrived at the clinic — check me in">
                                  <span>
                                    <Button size="small" variant="contained" color="success"
                                      startIcon={actionInProgress === a.id + 'checked_in' ? <CircularProgress size={12} color="inherit" /> : <HowToRegIcon fontSize="small" />}
                                      disabled={actionInProgress === a.id + 'checked_in'}
                                      onClick={() => handleQuickAction(a.id, 'checked_in')}
                                      sx={{ fontSize: '0.7rem', px: 1, whiteSpace: 'nowrap' }}>
                                      Check In
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                              {['scheduled', 'confirmed'].includes(a.status) && (
                                <Tooltip title="Cancel this appointment">
                                  <IconButton size="small" onClick={() => openCancelDialog(a)} sx={{ color: 'error.main' }}>
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {['checked_in', 'in_progress'].includes(a.status) && (
                                <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                                  {a.status === 'checked_in' ? 'Waiting...' : 'In consultation'}
                                </Typography>
                              )}
                              {a.status === 'completed' && (
                                <Typography variant="caption" color="success.main">Visit complete</Typography>
                              )}
                              {a.status === 'no_show' && (
                                <Typography variant="caption" color="error.main">Missed</Typography>
                              )}
                              {a.status === 'cancelled' && (
                                <Typography variant="caption" color="text.disabled">Cancelled</Typography>
                              )}
                            </>
                          )}

                          {/* STAFF actions: full workflow (not for nurses) */}
                          {canManageAppointments && (
                            <>
                              {a.status === 'confirmed' && (
                                <Tooltip title="Patient has arrived — check them in">
                                  <span>
                                    <Button size="small" variant="contained" color="success"
                                      startIcon={actionInProgress === a.id + 'checked_in' ? <CircularProgress size={12} color="inherit" /> : <HowToRegIcon fontSize="small" />}
                                      disabled={actionInProgress === a.id + 'checked_in'}
                                      onClick={() => handleQuickAction(a.id, 'checked_in')}
                                      sx={{ fontSize: '0.7rem', px: 1, whiteSpace: 'nowrap' }}>
                                      Check In
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                              {a.status === 'checked_in' && (
                                <Tooltip title="Start the consultation">
                                  <span>
                                    <Button size="small" variant="contained" color="warning"
                                      startIcon={actionInProgress === a.id + 'in_progress' ? <CircularProgress size={12} color="inherit" /> : <PlayArrowIcon fontSize="small" />}
                                      disabled={actionInProgress === a.id + 'in_progress'}
                                      onClick={() => handleQuickAction(a.id, 'in_progress')}
                                      sx={{ fontSize: '0.7rem', px: 1, whiteSpace: 'nowrap' }}>
                                      Start
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                              {a.status === 'in_progress' && (
                                <Tooltip title="Mark visit as completed">
                                  <span>
                                    <Button size="small" variant="contained" color="success"
                                      startIcon={actionInProgress === a.id + 'completed' ? <CircularProgress size={12} color="inherit" /> : <DoneIcon fontSize="small" />}
                                      disabled={actionInProgress === a.id + 'completed'}
                                      onClick={() => handleQuickAction(a.id, 'completed')}
                                      sx={{ fontSize: '0.7rem', px: 1, whiteSpace: 'nowrap' }}>
                                      Complete
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                              {['scheduled', 'confirmed'].includes(a.status) && (
                                <Tooltip title="Patient did not show up">
                                  <IconButton size="small"
                                    disabled={actionInProgress === a.id + 'no_show'}
                                    onClick={() => handleQuickAction(a.id, 'no_show')}
                                    sx={{ color: 'text.disabled' }}>
                                    {actionInProgress === a.id + 'no_show' ? <CircularProgress size={14} /> : <PersonOffIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>
                              )}
                              {['scheduled', 'confirmed', 'checked_in', 'in_progress'].includes(a.status) && (
                                <Tooltip title="Cancel appointment">
                                  <IconButton size="small" onClick={() => openCancelDialog(a)} sx={{ color: 'error.main' }}>
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Manually set any status">
                                <IconButton size="small" onClick={() => openStatusDialog(a)} sx={{ color: 'primary.main' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}

                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Status Update Dialog — not for nurses */}
      {canManageAppointments && (
        <Dialog open={Boolean(statusDialogAppt)} onClose={() => setStatusDialogAppt(null)} maxWidth="xs" fullWidth>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={700}>Update Appointment Status</Typography>
              <IconButton size="small" onClick={() => setStatusDialogAppt(null)}><CloseIcon fontSize="small" /></IconButton>
            </Stack>
          </DialogTitle>
          <form onSubmit={handleStatusUpdate}>
            <DialogContent dividers>
              {statusError && <Alert severity="error" sx={{ mb: 2 }}>{statusError}</Alert>}
              <Typography variant="body2" color="text.secondary" mb={2}>
                {statusDialogAppt?.chief_complaint || statusDialogAppt?.type?.replace(/_/g, ' ')} —{' '}
                {statusDialogAppt?.scheduled_at ? fmtDateTime(statusDialogAppt.scheduled_at) + ' IST' : ''}
              </Typography>
              <Stack direction="row" spacing={1} mb={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">Current:</Typography>
                <Chip label={statusDialogAppt?.status?.replace(/_/g, ' ')} size="small" color={STATUS_COLOR[statusDialogAppt?.status] || 'default'} />
              </Stack>
              <FormControl fullWidth>
                <InputLabel>New Status</InputLabel>
                <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as string)} label="New Status">
                  {ALL_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      <Chip label={s.replace(/_/g, ' ')} size="small" color={STATUS_COLOR[s] || 'default'} sx={{ pointerEvents: 'none' }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setStatusDialogAppt(null)} disabled={statusUpdating}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={statusUpdating || newStatus === statusDialogAppt?.status}
                startIcon={statusUpdating ? <CircularProgress size={16} /> : null}>
                {statusUpdating ? 'Updating...' : 'Update Status'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Cancel Dialog (both roles) */}
      <Dialog open={Boolean(cancelAppt)} onClose={() => setCancelAppt(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>Cancel Appointment</Typography>
            <IconButton size="small" onClick={() => setCancelAppt(null)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <form onSubmit={handleCancelConfirm}>
          <DialogContent dividers>
            {cancelError && <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert>}
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will cancel the appointment for{' '}
              <strong>{cancelAppt?.chief_complaint || cancelAppt?.type?.replace(/_/g, ' ')}</strong>
              {cancelAppt?.scheduled_at ? ` on ${fmtDateTime(cancelAppt.scheduled_at)} IST` : ''}.
            </Alert>
            <TextField
              label="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              fullWidth multiline rows={2}
              placeholder="e.g. Schedule conflict, feeling better..."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCancelAppt(null)} disabled={cancelling}>Go Back</Button>
            <Button type="submit" variant="contained" color="error" disabled={cancelling}
              startIcon={cancelling ? <CircularProgress size={16} color="inherit" /> : <CancelIcon />}>
              {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              {isPatient ? 'Book an Appointment' : 'Book New Appointment'}
            </Typography>
            <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent dividers>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            {formSuccess && <Alert severity="success" sx={{ mb: 2 }}>{formSuccess}</Alert>}

            {isPatient ? (
              /* Patient booking form — simple, no patient picker, no priority */
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 1 }}>Select your preferred date, time, and type of visit. Staff will confirm your appointment.</Alert>
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Preferred Date & Time" type="datetime-local" value={patientForm.scheduledAt}
                    onChange={updatePatient('scheduledAt')} fullWidth required InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField select label="Type of Visit" value={patientForm.type} onChange={updatePatient('type')} fullWidth>
                    {['consultation', 'follow_up', 'lab', 'imaging', 'telemedicine'].map((t) => (
                      <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField select label="Mode" value={patientForm.isTelemedicine} onChange={updatePatient('isTelemedicine')} fullWidth>
                    <MenuItem value="false">In-Person</MenuItem>
                    <MenuItem value="true">Telemedicine (Video)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Reason for Visit" value={patientForm.chiefComplaint} onChange={updatePatient('chiefComplaint')} fullWidth placeholder="What is the main reason for your visit?" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Additional Notes" value={patientForm.notes} onChange={updatePatient('notes')} fullWidth multiline rows={2} placeholder="Any other information for the doctor..." />
                </Grid>
              </Grid>
            ) : (
              /* Staff booking form — full options */
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField select label="Patient" value={staffForm.patientId} onChange={updateStaff('patientId')} fullWidth required>
                    <MenuItem value="">Select patient...</MenuItem>
                    {patients.map((p: Record<string, string>) => (
                      <MenuItem key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.mrn}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField select label="Type" value={staffForm.type} onChange={updateStaff('type')} fullWidth>
                    {['consultation', 'follow_up', 'procedure', 'lab', 'imaging', 'telemedicine', 'emergency'].map((t) => (
                      <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField select label="Priority" value={staffForm.priority} onChange={updateStaff('priority')} fullWidth>
                    <MenuItem value="routine">Routine</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={8}>
                  <TextField label="Date & Time" type="datetime-local" value={staffForm.scheduledAt} onChange={updateStaff('scheduledAt')} fullWidth required InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={4}>
                  <TextField select label="Duration" value={staffForm.durationMinutes} onChange={updateStaff('durationMinutes')} fullWidth>
                    {['15', '30', '45', '60', '90', '120'].map((d) => <MenuItem key={d} value={d}>{d} min</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Chief Complaint" value={staffForm.chiefComplaint} onChange={updateStaff('chiefComplaint')} fullWidth placeholder="Reason for visit..." />
                </Grid>
                <Grid item xs={6}>
                  <TextField select label="Mode" value={staffForm.isTelemedicine} onChange={updateStaff('isTelemedicine')} fullWidth>
                    <MenuItem value="false">In-Person</MenuItem>
                    <MenuItem value="true">Telemedicine</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Notes" value={staffForm.notes} onChange={updateStaff('notes')} fullWidth multiline rows={2} placeholder="Additional notes..." />
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : null}>
              {saving ? 'Booking...' : 'Book Appointment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
        </Box>
      )} {/* end mainTab === 0 */}
    </Box>
  );
}
