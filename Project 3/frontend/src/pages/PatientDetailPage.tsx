import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Grid, Stack, Chip, Button, Avatar, Divider, Alert, Skeleton, Tab, Tabs } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WarningIcon from '@mui/icons-material/Warning';
import MedicationIcon from '@mui/icons-material/Medication';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useQuery } from 'react-query';
import { format, differenceInYears, parseISO } from 'date-fns';
import { patientsClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

const SEVERITY_COLOR: Record<string, string> = { mild: MC_COLORS.status.stable, moderate: MC_COLORS.status.warning, severe: MC_COLORS.status.critical, life_threatening: MC_COLORS.status.critical };

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(0);

  const { data, isLoading, error } = useQuery(
    ['patient', id],
    () => patientsClient.get(`/patients/${id}`).then((r: { data: any }) => r.data),
    { retry: false }
  );

  if (isLoading) return <Box><Skeleton variant="rounded" height={200} sx={{ mb: 2 }} /><Skeleton variant="rounded" height={400} /></Box>;
  if (error) return <Alert severity="error">Patient record not found or access denied.</Alert>;

  const { patient, allergies = [], activeConditions = [], currentMedications = [] } = data || {};
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
                {patient?.date_of_birth && <Typography variant="body2" color="text.secondary">DOB: {format(parseISO(patient.date_of_birth), 'MMM d, yyyy')}</Typography>}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Allergies (${allergies.length})`} icon={<WarningIcon />} iconPosition="start" />
        <Tab label={`Conditions (${activeConditions.length})`} icon={<LocalHospitalIcon />} iconPosition="start" />
        <Tab label={`Medications (${currentMedications.length})`} icon={<MedicationIcon />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
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

      {tab === 1 && (
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

      {tab === 2 && (
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
