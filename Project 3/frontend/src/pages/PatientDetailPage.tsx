import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Grid, Stack, Chip, Button, Avatar, Divider, Alert, Skeleton, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WarningIcon from '@mui/icons-material/Warning';
import MedicationIcon from '@mui/icons-material/Medication';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ScienceIcon from '@mui/icons-material/Science';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useQuery } from 'react-query';
import { differenceInYears, parseISO } from 'date-fns';
import { patientsClient, appointmentsClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

const TZ = 'Asia/Kolkata';
const fmtDate = (iso: string) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
const fmtDateTime = (iso: string) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso));

const SEVERITY_COLOR: Record<string, string> = {
  mild: MC_COLORS.status.stable,
  moderate: MC_COLORS.status.warning,
  severe: MC_COLORS.status.critical,
  life_threatening: MC_COLORS.status.critical,
};

const TYPE_LABEL: Record<string, string> = {
  consultation: 'Consultation', follow_up: 'Follow-Up', procedure: 'Procedure',
  lab: 'Lab', imaging: 'Imaging', telemedicine: 'Telemedicine', emergency: 'Emergency',
  routine_checkup: 'Routine Checkup', specialist: 'Specialist',
};

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(0);

  const { data, isLoading, error } = useQuery(
    ['patient', id],
    () => patientsClient.get(`/patients/${id}`).then((r: { data: any }) => r.data),
    { retry: false }
  );

  const { data: reportsData, isLoading: reportsLoading } = useQuery(
    ['patient-reports', id],
    () => appointmentsClient.get('/appointments/reports', { params: { patientId: id, limit: 50 } }).then((r: { data: any }) => r.data),
    { retry: false, enabled: !!id }
  );

  if (isLoading) return <Box><Skeleton variant="rounded" height={200} sx={{ mb: 2 }} /><Skeleton variant="rounded" height={400} /></Box>;
  if (error) return <Alert severity="error">Patient record not found or access denied.</Alert>;

  const { patient, allergies = [], activeConditions = [], currentMedications = [] } = data || {};
  const reports = reportsData?.reports || [];
  const age = patient?.date_of_birth ? differenceInYears(new Date(), parseISO(patient.date_of_birth)) : null;

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={4} alignItems="center">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/patients')} variant="outlined" size="small">Back</Button>
        <Box flex={1} />
        <Button startIcon={<EditIcon />} variant="outlined" size="small" onClick={() => navigate(`/patients/${id}/edit`)}>Edit</Button>
        <Button startIcon={<CalendarMonthIcon />} variant="contained" size="small" onClick={() => navigate('/appointments')}>Book Appointment</Button>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar sx={{ width: 80, height: 80, bgcolor: MC_COLORS.teal[500], fontSize: '1.5rem' }}>
                {(patient?.first_name?.[0] || '') + (patient?.last_name?.[0] || '')}
              </Avatar>
            </Grid>
            <Grid item flex={1}>
              <Typography variant="h5" fontWeight={700}>{patient?.first_name} {patient?.last_name}</Typography>
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" gap={0.5}>
                <Chip label={`MRN: ${patient?.mrn}`} size="small" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                {age !== null && <Chip label={`${age} years`} size="small" />}
                {patient?.gender && <Chip label={patient.gender} size="small" />}
                {patient?.blood_group && <Chip label={patient.blood_group} size="small" color="error" variant="outlined" />}
              </Stack>
            </Grid>
            <Grid item>
              <Stack spacing={0.5} alignItems="flex-end">
                {patient?.phone && <Typography variant="body2" color="text.secondary">{patient.phone}</Typography>}
                {patient?.email && <Typography variant="body2" color="text.secondary">{patient.email}</Typography>}
                {patient?.date_of_birth && <Typography variant="body2" color="text.secondary">DOB: {fmtDate(patient.date_of_birth)}</Typography>}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Visit Reports (${reports.length})`} icon={<AssignmentIcon />} iconPosition="start" />
        <Tab label={`Allergies (${allergies.length})`} icon={<WarningIcon />} iconPosition="start" />
        <Tab label={`Conditions (${activeConditions.length})`} icon={<LocalHospitalIcon />} iconPosition="start" />
        <Tab label={`Medications (${currentMedications.length})`} icon={<MedicationIcon />} iconPosition="start" />
      </Tabs>

      {/* Visit Reports */}
      {tab === 0 && (
        <Box>
          {reportsLoading ? <Skeleton variant="rounded" height={200} /> : reports.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">No completed visits yet for this patient.</Typography>
                <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => navigate('/appointments')}>
                  Book Appointment
                </Button>
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
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="subtitle1" fontWeight={700}>{TYPE_LABEL[r.type] || r.type}</Typography>
                              {patient?.date_of_birth && (
                                <Chip label={`${differenceInYears(new Date(), parseISO(patient.date_of_birth))} yrs · ${patient.gender || ''}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{fmtDateTime(r.scheduled_at)} IST · {r.duration_minutes} min</Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Chip label="Completed" size="small" color="success" />
                          {r.priority !== 'routine' && <Chip label={r.priority} size="small" color={r.priority === 'emergency' ? 'error' : 'warning'} />}
                        </Stack>
                      </Stack>

                      <Divider sx={{ mb: 2 }} />

                      {/* Chief complaint */}
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
                            <Typography variant="body2" color="text.disabled" fontStyle="italic">No clinical details recorded for this visit.</Typography>
                          </Grid>
                        )}
                      </Grid>

                      {/* Full clinical report */}
                      {hasReport && (
                        <Grid container spacing={2}>
                          {r.diagnosis && (
                            <Grid item xs={12}>
                              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: `${MC_COLORS.emerald[500]}08` }}>
                                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                  <MedicalServicesIcon sx={{ color: MC_COLORS.emerald[600], fontSize: 18 }} />
                                  <Typography variant="caption" fontWeight={700} color={MC_COLORS.emerald[700]}>DIAGNOSIS</Typography>
                                </Stack>
                                <Typography variant="body2" fontWeight={600}>{r.diagnosis}</Typography>
                                {r.clinical_findings && <Typography variant="body2" color="text.secondary" mt={0.5}>{r.clinical_findings}</Typography>}
                              </Paper>
                            </Grid>
                          )}

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
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            {allergies.length === 0 ? <Typography color="text.secondary">No allergies recorded</Typography>
              : allergies.map((a: Record<string, string>) => (
                <Box key={a.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" py={1.5}>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>{a.substance}</Typography>
                      <Typography variant="body2" color="text.secondary">{a.reaction} · {a.category}</Typography>
                    </Box>
                    <Chip label={a.severity} size="small" sx={{ bgcolor: `${SEVERITY_COLOR[a.severity]}20`, color: SEVERITY_COLOR[a.severity], fontWeight: 600 }} />
                  </Stack>
                  <Divider />
                </Box>
              ))}
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card>
          <CardContent>
            {activeConditions.length === 0 ? <Typography color="text.secondary">No active conditions</Typography>
              : activeConditions.map((c: Record<string, string>) => (
                <Box key={c.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" py={1.5}>
                    <Box>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Chip label={c.icd10_code} size="small" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                        <Typography variant="body1" fontWeight={600}>{c.description}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>{c.category} · {c.notes || ''}</Typography>
                    </Box>
                    <Chip label={c.status} size="small" color={c.status === 'active' ? 'error' : 'default'} />
                  </Stack>
                  <Divider />
                </Box>
              ))}
          </CardContent>
        </Card>
      )}

      {tab === 3 && (
        <Card>
          <CardContent>
            {currentMedications.length === 0 ? <Typography color="text.secondary">No current medications</Typography>
              : currentMedications.map((m: Record<string, string>) => (
                <Box key={m.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" py={1.5}>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>{m.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{m.dosage} · {m.frequency} · {m.route}</Typography>
                      {m.instructions && <Typography variant="caption" color="text.secondary">{m.instructions}</Typography>}
                    </Box>
                    <Chip label={m.status} size="small" color="success" variant="outlined" />
                  </Stack>
                  <Divider />
                </Box>
              ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
