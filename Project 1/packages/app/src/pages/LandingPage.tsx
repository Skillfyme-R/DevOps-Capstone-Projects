import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Grid, Container, Chip, Avatar,
} from '@mui/material';
import {
  AccountBalance, Security, TrendingUp, Speed, CreditCard,
  Analytics, ArrowForward, CheckCircle,
} from '@mui/icons-material';
import { NEXUS_COLORS } from '../styles/theme';

const FEATURES = [
  { icon: <AccountBalance />,  title: 'Multi-Account Banking',  desc: 'Checking, savings, investment & credit accounts in one place.' },
  { icon: <Security />,        title: 'Bank-Grade Security',    desc: 'JWT auth, bcrypt encryption, rate limiting & fraud detection.' },
  { icon: <TrendingUp />,      title: 'Smart Analytics',        desc: 'Spending breakdowns, cash flow charts & net worth tracking.' },
  { icon: <CreditCard />,      title: 'Instant Transfers',      desc: 'Move money between accounts in seconds with full audit trail.' },
  { icon: <Analytics />,       title: 'Loan Management',        desc: 'Apply for loans, view amortization schedules, track repayments.' },
  { icon: <Speed />,           title: 'Lightning Fast',         desc: 'Redis-cached APIs, React Query, and optimistic UI updates.' },
];

const STATS = [
  { value: '9',      label: 'Currencies Supported' },
  { value: '$500K',  label: 'Monthly Transfer Limit' },
  { value: '99.9%',  label: 'Uptime SLA' },
  { value: '20x',    label: 'Auto-Scaling Pods' },
];

const CHECKLIST = [
  'React 18 + TypeScript frontend',
  'Node.js + Express REST API',
  'PostgreSQL + Redis backend',
  'Docker + Kubernetes on AWS EKS',
  'Terraform Infrastructure as Code',
  'GitHub Actions CI/CD Pipeline',
  'Prometheus + Grafana Monitoring',
  'Stripe Payment Integration',
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ background: NEXUS_COLORS.navyDark, minHeight: '100vh', color: '#fff' }}>

      {/* ── Navbar ── */}
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', px: 4, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue}, #00C48C)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountBalance sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Typography variant="h6" fontWeight={700} letterSpacing={-0.5}>NexusFinance</Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button onClick={() => navigate('/login')} sx={{ color: '#fff', fontWeight: 600 }}>Sign In</Button>
          <Button onClick={() => navigate('/register')} variant="contained"
            sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue}, #0ea5e9)`, borderRadius: 2 }}>
            Get Started
          </Button>
        </Box>
      </Box>

      {/* ── Hero ── */}
      <Container maxWidth="lg">
        <Box textAlign="center" py={{ xs: 8, md: 12 }}>
          <Chip label="Enterprise Digital Banking Platform" size="small"
            sx={{ mb: 3, background: 'rgba(27,110,243,0.15)', color: NEXUS_COLORS.electricBlue, border: `1px solid ${NEXUS_COLORS.electricBlue}40`, fontWeight: 600 }} />
          <Typography variant="h1" fontWeight={800} sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, lineHeight: 1.1, mb: 3 }}>
            Banking Built for the{' '}
            <Box component="span" sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue}, #00C48C)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Modern Era
            </Box>
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 600, mx: 'auto', mb: 5, fontWeight: 400, lineHeight: 1.7 }}>
            A production-grade FinTech platform with real-time analytics, multi-account management,
            loan origination, and enterprise-grade DevOps infrastructure.
          </Typography>
          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
            <Button size="large" variant="contained" endIcon={<ArrowForward />}
              onClick={() => navigate('/register')}
              sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue}, #0ea5e9)`, px: 4, py: 1.5, borderRadius: 2, fontSize: '1rem' }}>
              Open Free Account
            </Button>
            <Button size="large" variant="outlined" onClick={() => navigate('/login')}
              sx={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff', px: 4, py: 1.5, borderRadius: 2, fontSize: '1rem',
                '&:hover': { borderColor: '#fff', background: 'rgba(255,255,255,0.05)' } }}>
              Sign In
            </Button>
          </Box>
        </Box>

        {/* ── Stats ── */}
        <Grid container spacing={3} mb={10}>
          {STATS.map(s => (
            <Grid item xs={6} md={3} key={s.label}>
              <Box textAlign="center" p={3} sx={{ background: 'rgba(255,255,255,0.04)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography variant="h3" fontWeight={800} sx={{ color: NEXUS_COLORS.electricBlue, mb: 0.5 }}>{s.value}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* ── Features ── */}
        <Box mb={10}>
          <Typography variant="h4" fontWeight={700} textAlign="center" mb={1}>Everything You Need</Typography>
          <Typography variant="body1" textAlign="center" sx={{ color: 'rgba(255,255,255,0.5)', mb: 6 }}>
            Built with enterprise-grade technology from the ground up
          </Typography>
          <Grid container spacing={3}>
            {FEATURES.map(f => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <Box p={3} sx={{ background: 'rgba(255,255,255,0.03)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 0.2s', '&:hover': { background: 'rgba(27,110,243,0.08)', borderColor: `${NEXUS_COLORS.electricBlue}40`, transform: 'translateY(-2px)' } }}>
                  <Avatar sx={{ bgcolor: `${NEXUS_COLORS.electricBlue}20`, color: NEXUS_COLORS.electricBlue, mb: 2, width: 48, height: 48 }}>
                    {f.icon}
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} mb={1}>{f.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{f.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ── Tech Stack Checklist ── */}
        <Box mb={10} p={5} sx={{ background: 'rgba(255,255,255,0.03)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.07)' }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip label="Full-Stack DevOps Capstone" size="small"
                sx={{ mb: 2, bgcolor: `${NEXUS_COLORS.emerald}15`, color: NEXUS_COLORS.emerald, border: `1px solid ${NEXUS_COLORS.emerald}30` }} />
              <Typography variant="h4" fontWeight={700} mb={2}>Production-Ready Tech Stack</Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
                Every component is battle-tested and used by real enterprises.
                From frontend to Kubernetes, every layer is production-grade.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={1}>
                {CHECKLIST.map(item => (
                  <Grid item xs={12} sm={6} key={item}>
                    <Box display="flex" alignItems="center" gap={1.5} py={0.75}>
                      <CheckCircle sx={{ color: NEXUS_COLORS.emerald, fontSize: 18, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>{item}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Box>

        {/* ── CTA ── */}
        <Box textAlign="center" py={8}>
          <Typography variant="h4" fontWeight={700} mb={2}>Ready to Get Started?</Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', mb: 4 }}>
            Use the demo account to explore all features instantly.
          </Typography>
          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap" mb={2}>
            <Button size="large" variant="contained" endIcon={<ArrowForward />}
              onClick={() => navigate('/login')}
              sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue}, #0ea5e9)`, px: 5, py: 1.5, borderRadius: 2 }}>
              Try Demo Now
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
            Demo: alex.johnson@demo.nexusfinance.io / password123
          </Typography>
        </Box>
      </Container>

      {/* ── Footer ── */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', py: 3, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
          © Learnsyte Learning Private Limited (Skillfyme) — Built with enterprise DevOps practices
        </Typography>
      </Box>
    </Box>
  );
}
