import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Stack, Avatar, Chip, Button, Divider } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import NoteIcon from '@mui/icons-material/Note';
import { useNavigate } from 'react-router-dom';
import { MC_COLORS } from '../styles/theme';

const CLINICAL_MODULES = [
  { title: 'Clinical Notes', desc: 'Create SOAP notes, progress notes, discharge summaries and clinical documentation.', icon: NoteIcon, color: MC_COLORS.teal[500], count: 48 },
  { title: 'Prescriptions', desc: 'E-prescriptions, medication orders, dosage management, and pharmacy routing.', icon: MedicationIcon, color: MC_COLORS.emerald[500], count: 127 },
  { title: 'Lab Orders', desc: 'Order laboratory tests, manage specimens, and review diagnostic results.', icon: ScienceIcon, color: MC_COLORS.status.info, count: 34 },
  { title: 'Diagnostic Reports', desc: 'Radiology, pathology, cardiology, and other diagnostic imaging reports.', icon: LocalHospitalIcon, color: MC_COLORS.status.pending, count: 19 },
];

const RECENT_NOTES = [
  { patient: 'John Doe', type: 'SOAP Note', provider: 'Dr. Emily Smith', time: '2h ago', priority: 'routine' },
  { patient: 'Jane Wilson', type: 'Discharge Summary', provider: 'Dr. Emily Smith', time: '4h ago', priority: 'urgent' },
  { patient: 'Robert Brown', type: 'Progress Note', provider: 'Nurse Sarah Johnson', time: '6h ago', priority: 'routine' },
  { patient: 'Maria Garcia', type: 'Consultation Note', provider: 'Dr. Emily Smith', time: '1d ago', priority: 'routine' },
];

export default function ClinicalPage() {
  const navigate = useNavigate();

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700}>Clinical Operations</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Electronic health records, prescriptions, and clinical documentation</Typography>
      </Box>

      <Grid container spacing={3} mb={4}>
        {CLINICAL_MODULES.map(({ title, desc, icon: Icon, color, count }) => (
          <Grid item xs={12} sm={6} md={3} key={title}>
            <Card sx={{ cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Avatar sx={{ bgcolor: `${color}18`, width: 44, height: 44 }}>
                    <Icon sx={{ color, fontSize: 22 }} />
                  </Avatar>
                  <Chip label={count} size="small" sx={{ fontWeight: 700 }} />
                </Stack>
                <Typography variant="h6" fontWeight={700} gutterBottom>{title}</Typography>
                <Typography variant="body2" color="text.secondary" lineHeight={1.6}>{desc}</Typography>
                <Button size="small" variant="text" sx={{ mt: 2, p: 0, color }} onClick={() => navigate('/patients')}>
                  View All →
                </Button>
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
                <Typography variant="h6" fontWeight={700}>Recent Clinical Notes</Typography>
                <Button size="small" variant="contained">+ New Note</Button>
              </Stack>
              <Stack spacing={0}>
                {RECENT_NOTES.map((n, i) => (
                  <Box key={i}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" py={2}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: MC_COLORS.teal[100], color: MC_COLORS.teal[700], width: 36, height: 36, fontSize: '0.875rem' }}>
                          {n.patient.split(' ').map((w) => w[0]).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{n.patient}</Typography>
                          <Typography variant="caption" color="text.secondary">{n.type} · {n.provider}</Typography>
                        </Box>
                      </Stack>
                      <Stack alignItems="flex-end" spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">{n.time}</Typography>
                        <Chip label={n.priority} size="small" color={n.priority === 'urgent' ? 'warning' : 'default'} sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Stack>
                    </Stack>
                    {i < RECENT_NOTES.length - 1 && <Divider />}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>FHIR Compliance Status</Typography>
              <Stack spacing={2}>
                {[
                  { resource: 'Patient', status: 'Compliant', fhir: 'R4' },
                  { resource: 'Encounter', status: 'Compliant', fhir: 'R4' },
                  { resource: 'Observation', status: 'Compliant', fhir: 'R4' },
                  { resource: 'MedicationRequest', status: 'Compliant', fhir: 'R4' },
                  { resource: 'Appointment', status: 'Compliant', fhir: 'R4' },
                  { resource: 'DiagnosticReport', status: 'In Progress', fhir: 'R4' },
                ].map((r) => (
                  <Stack key={r.resource} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>{r.resource}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={r.fhir} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                      <Chip label={r.status} size="small" color={r.status === 'Compliant' ? 'success' : 'warning'} sx={{ fontSize: '0.65rem', height: 18 }} />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Button variant="outlined" size="small" fullWidth onClick={() => window.open('/fhir/r4/metadata', '_blank')}>
                View FHIR Capability Statement
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
