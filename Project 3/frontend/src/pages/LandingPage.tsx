import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Typography, Grid, Card, CardContent,
  Stack, Chip, Avatar, AppBar, Toolbar, Divider,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import CloudIcon from '@mui/icons-material/Cloud';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import BarChartIcon from '@mui/icons-material/BarChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { MC_COLORS } from '../styles/theme';

const FEATURES = [
  { icon: PeopleIcon, title: 'Patient Registry', desc: 'FHIR R4-compliant patient records with complete medical history, allergies, conditions, and medications.', color: MC_COLORS.teal[500] },
  { icon: CalendarMonthIcon, title: 'Smart Scheduling', desc: 'Intelligent appointment booking with real-time slot availability, telemedicine support, and automated reminders.', color: MC_COLORS.emerald[500] },
  { icon: LocalHospitalIcon, title: 'Clinical Operations', desc: 'Electronic health records, clinical notes, prescription management, lab results, and diagnostic reports.', color: MC_COLORS.status.info },
  { icon: BarChartIcon, title: 'Healthcare Analytics', desc: 'Real-time operational KPIs, patient demographics, appointment trends, and clinical outcome metrics.', color: MC_COLORS.status.pending },
  { icon: SecurityIcon, title: 'HIPAA Compliant', desc: 'End-to-end encryption, role-based access control, immutable audit trails, and MFA enforcement.', color: MC_COLORS.status.stable },
  { icon: CloudIcon, title: 'Cloud-Native', desc: 'Kubernetes-orchestrated microservices, auto-scaling, GitOps CI/CD, and multi-region deployment support.', color: MC_COLORS.status.warning },
];

const STATS = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: 'HIPAA', label: 'Compliant' },
  { value: 'FHIR R4', label: 'Standard' },
  { value: '<50ms', label: 'API Response' },
];

const COMPLIANCE = ['HIPAA', 'HL7 FHIR R4', 'SOC 2 Type II', 'ISO 27001', 'GDPR Ready', 'ONC Certified'];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: MC_COLORS.clinical.lightGray }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: `1px solid ${MC_COLORS.clinical.borderGray}` }}>
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: `linear-gradient(135deg, ${MC_COLORS.teal[500]}, ${MC_COLORS.emerald[500]})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FavoriteIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="primary.main">MediCore</Typography>
          </Box>
          <Button onClick={() => navigate('/login')} variant="outlined" size="small" sx={{ fontWeight: 600 }}>Sign In</Button>
          <Button onClick={() => navigate('/register')} variant="contained" size="small">Get Started</Button>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box sx={{
        background: `linear-gradient(135deg, ${MC_COLORS.teal[900]} 0%, ${MC_COLORS.teal[700]} 50%, ${MC_COLORS.emerald[700]} 100%)`,
        color: 'white', py: { xs: 10, md: 16 }, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <Box>
                  <Chip label="Enterprise Healthcare Platform" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, mb: 2 }} />
                  <Typography variant="h2" fontWeight={800} sx={{ lineHeight: 1.2, mb: 2 }}>
                    Modern Healthcare,<br />Engineered for Scale
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.85, fontWeight: 400, lineHeight: 1.6 }}>
                    MediCore is a production-grade, HIPAA-compliant Healthcare Cloud Platform built on a cloud-native microservices architecture. Designed for hospitals, clinics, and healthcare networks.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button variant="contained" size="large" onClick={() => navigate('/register')}
                    sx={{ bgcolor: 'white', color: MC_COLORS.teal[700], fontWeight: 700, '&:hover': { bgcolor: MC_COLORS.clinical.lightGray }, px: 4 }}>
                    Start Free Trial
                  </Button>
                  <Button variant="outlined" size="large" onClick={() => navigate('/login')}
                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }, px: 4 }}>
                    Sign In
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {COMPLIANCE.map((c) => (
                    <Chip key={c} icon={<CheckCircleIcon />} label={c} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', '& .MuiChip-icon': { color: MC_COLORS.emerald[300] } }} />
                  ))}
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Grid container spacing={2}>
                {STATS.map((s) => (
                  <Grid item xs={6} key={s.label}>
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', p: 2, textAlign: 'center' }}>
                      <Typography variant="h3" fontWeight={800} color="white">{s.value}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8, color: 'white', mt: 0.5 }}>{s.label}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box textAlign="center" mb={8}>
          <Typography variant="h3" fontWeight={800} gutterBottom>Everything your healthcare team needs</Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontWeight: 400 }}>
            A unified platform for patient management, clinical workflows, and operational intelligence.
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <Grid item xs={12} sm={6} md={4} key={title}>
              <Card sx={{ height: '100%', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
                <CardContent sx={{ p: 3 }}>
                  <Avatar sx={{ bgcolor: `${color}18`, width: 48, height: 48, mb: 2 }}>
                    <Icon sx={{ color }} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={700} gutterBottom>{title}</Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.7}>{desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA */}
      <Box sx={{ bgcolor: MC_COLORS.teal[500], py: 10 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <SpeedIcon sx={{ fontSize: 48, color: 'white', opacity: 0.8, mb: 2 }} />
          <Typography variant="h3" fontWeight={800} color="white" gutterBottom>Ready to transform your clinical operations?</Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)', mb: 4, fontWeight: 400 }}>
            Join healthcare organizations worldwide who trust MediCore to manage their patient operations.
          </Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/register')}
            sx={{ bgcolor: 'white', color: MC_COLORS.teal[700], fontWeight: 700, px: 6, py: 1.5, '&:hover': { bgcolor: MC_COLORS.clinical.lightGray } }}>
            Get Started Today
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: MC_COLORS.teal[900], py: 4 }}>
        <Container maxWidth="lg">
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FavoriteIcon sx={{ color: MC_COLORS.teal[300], fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>MediCore — Enterprise Healthcare Platform</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              © {new Date().getFullYear()} Learnsyte Learning Private Limited · Skillfyme. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
