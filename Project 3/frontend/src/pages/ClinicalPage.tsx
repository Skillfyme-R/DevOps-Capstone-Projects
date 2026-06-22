import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Stack, Avatar, Chip, Button, Divider, Alert, List, ListItem, ListItemText, ListItemAvatar } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import NoteIcon from '@mui/icons-material/Note';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConstructionIcon from '@mui/icons-material/Construction';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useNavigate, useParams } from 'react-router-dom';
import { MC_COLORS } from '../styles/theme';

const MODULES = [
  {
    key: 'notes',
    title: 'Clinical Notes',
    desc: 'Create SOAP notes, progress notes, discharge summaries and clinical documentation.',
    icon: NoteIcon,
    color: MC_COLORS.teal[500],
    longDesc: 'Document patient encounters using structured SOAP notes, progress notes, and discharge summaries. All notes are stored securely and linked to the patient record.',
    features: ['SOAP Notes', 'Progress Notes', 'Discharge Summaries', 'Consultation Notes', 'Referral Letters'],
  },
  {
    key: 'prescriptions',
    title: 'Prescriptions',
    desc: 'E-prescriptions, medication orders, dosage management, and pharmacy routing.',
    icon: MedicationIcon,
    color: MC_COLORS.emerald[500],
    longDesc: 'Issue electronic prescriptions, manage medication orders, set dosage schedules, and route to the patient\'s preferred pharmacy.',
    features: ['E-Prescriptions', 'Medication Orders', 'Dosage Management', 'Drug Interaction Checks', 'Pharmacy Routing'],
  },
  {
    key: 'lab-orders',
    title: 'Lab Orders',
    desc: 'Order laboratory tests, manage specimens, and review diagnostic results.',
    icon: ScienceIcon,
    color: MC_COLORS.status.info,
    longDesc: 'Order blood panels, urinalysis, cultures, and other lab tests. Track specimen collection status and review results as soon as they are available.',
    features: ['Blood Panels', 'Urinalysis', 'Microbiology Cultures', 'Pathology Orders', 'Result Review'],
  },
  {
    key: 'reports',
    title: 'Diagnostic Reports',
    desc: 'Radiology, pathology, cardiology, and other diagnostic imaging reports.',
    icon: LocalHospitalIcon,
    color: MC_COLORS.status.pending,
    longDesc: 'Access radiology reads, pathology reports, ECG results, and imaging studies. All reports are attached to the patient record automatically.',
    features: ['Radiology (X-Ray / CT / MRI)', 'Pathology Reports', 'Cardiology (ECG/Echo)', 'Ultrasound', 'PET Scans'],
  },
];

function ModuleDetail({ moduleKey }: { moduleKey: string }) {
  const navigate = useNavigate();
  const mod = MODULES.find((m) => m.key === moduleKey);
  if (!mod) return <Alert severity="error">Module not found.</Alert>;

  const Icon = mod.icon;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/clinical')} sx={{ mb: 3 }}>
        Back to Clinical Operations
      </Button>

      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: `${mod.color}18` }}>
          <Icon sx={{ color: mod.color, fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight={700}>{mod.title}</Typography>
          <Typography variant="body2" color="text.secondary">{mod.desc}</Typography>
        </Box>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>About this module</Typography>
              <Typography variant="body2" color="text.secondary" lineHeight={1.8} mb={3}>
                {mod.longDesc}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>Available features</Typography>
              <Stack spacing={1}>
                {mod.features.map((f) => (
                  <Stack key={f} direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: mod.color, flexShrink: 0 }} />
                    <Typography variant="body2">{f}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, textAlign: 'center' }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: `${mod.color}12`, mb: 2 }}>
                <ConstructionIcon sx={{ color: mod.color, fontSize: 36 }} />
              </Avatar>
              <Typography variant="h6" fontWeight={700} mb={1}>
                {mod.title} — Coming Soon
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={400} lineHeight={1.7}>
                This module is under active development and will be available in the next release.
                Patient records and appointments are fully operational — use those workflows in the meantime.
              </Typography>
              <Stack direction="row" spacing={2} mt={3}>
                <Button variant="contained" onClick={() => navigate('/patients')}>
                  Go to Patients
                </Button>
                <Button variant="outlined" onClick={() => navigate('/appointments')}>
                  Go to Appointments
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function ClinicalHub() {
  const navigate = useNavigate();

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700}>Clinical Operations</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Electronic health records, prescriptions, and clinical documentation</Typography>
      </Box>

      <Grid container spacing={3} mb={4}>
        {MODULES.map(({ key, title, desc, icon: Icon, color, features }) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Card
              sx={{ cursor: 'pointer', transition: '0.2s', height: '100%', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}
              onClick={() => navigate(`/clinical/${key}`)}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Avatar sx={{ bgcolor: `${color}18`, width: 44, height: 44 }}>
                    <Icon sx={{ color, fontSize: 22 }} />
                  </Avatar>
                  <Chip label={`${features.length} features`} size="small" sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                </Stack>
                <Typography variant="h6" fontWeight={700} gutterBottom>{title}</Typography>
                <Typography variant="body2" color="text.secondary" lineHeight={1.6}>{desc}</Typography>
                <Button
                  size="small"
                  variant="text"
                  sx={{ mt: 2, p: 0, color }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/clinical/${key}`); }}
                >
                  View All →
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Medical Knowledge Base card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{ cursor: 'pointer', transition: '0.2s', height: '100%', border: `2px solid ${MC_COLORS.teal[500]}30`, '&:hover': { transform: 'translateY(-2px)', boxShadow: 4, borderColor: MC_COLORS.teal[500] } }}
            onClick={() => navigate('/clinical/knowledge')}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Avatar sx={{ bgcolor: `${MC_COLORS.teal[500]}18`, width: 44, height: 44 }}>
                  <MenuBookIcon sx={{ color: MC_COLORS.teal[500], fontSize: 22 }} />
                </Avatar>
                <Chip label="20 diseases" size="small" color="primary" sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
              </Stack>
              <Typography variant="h6" fontWeight={700} gutterBottom>Medical Knowledge Base</Typography>
              <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                ICD-10 disease reference with symptoms, standard medications, dosages and clinical precautions.
              </Typography>
              <Button size="small" variant="text" sx={{ mt: 2, p: 0, color: MC_COLORS.teal[500] }}>
                Search Diseases →
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={3}>Module Overview</Typography>
              <List disablePadding>
                {MODULES.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <React.Fragment key={m.key}>
                      <ListItem
                        sx={{ px: 0, py: 1.5, cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => navigate(`/clinical/${m.key}`)}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: `${m.color}18`, width: 36, height: 36 }}>
                            <Icon sx={{ color: m.color, fontSize: 18 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>{m.title}</Typography>}
                          secondary={<Typography variant="caption" color="text.secondary">{m.features.join(' · ')}</Typography>}
                        />
                        <Chip label="Coming Soon" size="small" color="default" sx={{ fontSize: '0.65rem', height: 20 }} />
                      </ListItem>
                      {i < MODULES.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
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
              <Button variant="outlined" size="small" fullWidth onClick={() => window.open('http://localhost:9002/fhir/r4/metadata', '_blank')}>
                View FHIR Capability Statement
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function ClinicalPage() {
  const { module } = useParams<{ module?: string }>();

  if (module) {
    return <ModuleDetail moduleKey={module} />;
  }
  return <ClinicalHub />;
}
