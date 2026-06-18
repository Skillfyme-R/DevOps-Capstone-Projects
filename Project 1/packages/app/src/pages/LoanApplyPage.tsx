import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box, Typography, Card, CardContent, TextField,
  Button, MenuItem, Alert, Slider, Divider, Grid, Chip,
} from '@mui/material';
import { ArrowBack, Calculate } from '@mui/icons-material';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS } from '../styles/theme';

interface LoanForm {
  loan_type: string; requested_amount: number; term_months: number;
  purpose: string; annual_income: number; employment_status: string; credit_score: number;
}

const LOAN_TYPES         = ['personal', 'auto', 'student'];
const EMPLOYMENT_STATUSES = ['employed', 'self_employed', 'unemployed', 'retired'];
const TERMS              = [12, 24, 36, 48, 60];
const BASE_APR           = 0.065;

function calcEMI(principal: number, termMonths: number, annualRate: number) {
  const r = annualRate / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

export default function LoanApplyPage() {
  const navigate = useNavigate();
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // EMI calculator state
  const [calcAmount, setCalcAmount] = useState(10000);
  const [calcTerm,   setCalcTerm]   = useState(36);

  const emi       = useMemo(() => calcEMI(calcAmount, calcTerm, BASE_APR), [calcAmount, calcTerm]);
  const totalPay  = emi * calcTerm;
  const totalInt  = totalPay - calcAmount;

  const { register, handleSubmit, formState: { errors } } = useForm<LoanForm>();

  const onSubmit = async (data: LoanForm) => {
    setLoading(true); setError('');
    try {
      await api.post('/loans/apply', data);
      navigate('/loans');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Application failed');
    } finally { setLoading(false); }
  };

  return (
    <Box p={3} maxWidth={720} mx="auto">
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/loans')} sx={{ mb: 2 }}>Back to Loans</Button>
      <Typography variant="h5" fontWeight={700} mb={0.5}>Apply for a Loan</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Fill in your details and get an instant decision</Typography>

      {/* ── EMI Calculator ── */}
      <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${NEXUS_COLORS.navyDark}, ${NEXUS_COLORS.navyMid})`, color: '#fff' }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Calculate sx={{ color: NEXUS_COLORS.electricBlue }} />
            <Typography variant="h6" fontWeight={600}>EMI Calculator</Typography>
            <Chip label="Interactive" size="small" sx={{ bgcolor: `${NEXUS_COLORS.electricBlue}25`, color: NEXUS_COLORS.electricBlue, fontWeight: 600 }} />
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <Typography fontSize={13} sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                Loan Amount: <strong style={{ color: '#fff' }}>${calcAmount.toLocaleString()}</strong>
              </Typography>
              <Slider value={calcAmount} onChange={(_, v) => setCalcAmount(v as number)}
                min={1000} max={500000} step={1000}
                sx={{ color: NEXUS_COLORS.electricBlue }}
                marks={[{ value: 1000, label: '$1K' }, { value: 250000, label: '$250K' }, { value: 500000, label: '$500K' }]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography fontSize={13} sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                Term: <strong style={{ color: '#fff' }}>{calcTerm} months ({(calcTerm / 12).toFixed(1)} yrs)</strong>
              </Typography>
              <Slider value={calcTerm} onChange={(_, v) => setCalcTerm(v as number)}
                min={12} max={360} step={12}
                sx={{ color: NEXUS_COLORS.emerald }}
                marks={[{ value: 12, label: '1yr' }, { value: 120, label: '10yr' }, { value: 360, label: '30yr' }]}
              />
            </Grid>
          </Grid>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />

          <Grid container spacing={2}>
            {[
              { label: 'Monthly Payment', value: `$${emi.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: NEXUS_COLORS.electricBlue },
              { label: 'Total Interest',  value: `$${totalInt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: NEXUS_COLORS.amber },
              { label: 'Total Payment',   value: `$${totalPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: NEXUS_COLORS.emerald },
              { label: 'Annual Rate',     value: `${(BASE_APR * 100).toFixed(1)}% APR`, color: 'rgba(255,255,255,0.7)' },
            ].map(s => (
              <Grid item xs={6} sm={3} key={s.label}>
                <Box textAlign="center" p={1.5} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <Typography fontSize={13} sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5 }}>{s.label}</Typography>
                  <Typography fontWeight={700} fontSize={16} sx={{ color: s.color }}>{s.value}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* ── Application Form ── */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column" gap={2.5}>
            <TextField select label="Loan Type" fullWidth defaultValue="personal"
              {...register('loan_type', { required: 'Required' })}
              error={!!errors.loan_type} helperText={errors.loan_type?.message}>
              {LOAN_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
            </TextField>

            <Box display="flex" gap={2}>
              <TextField label="Loan Amount ($)" fullWidth type="number"
                defaultValue={calcAmount}
                {...register('requested_amount', { required: 'Required', min: { value: 1000, message: 'Min $1,000' } })}
                error={!!errors.requested_amount} helperText={errors.requested_amount?.message} />
              <TextField select label="Term (months)" fullWidth defaultValue={calcTerm}
                {...register('term_months', { required: 'Required' })}
                error={!!errors.term_months} helperText={errors.term_months?.message}>
                {TERMS.map(t => <MenuItem key={t} value={t}>{t} months</MenuItem>)}
              </TextField>
            </Box>

            <TextField label="Purpose" fullWidth multiline rows={2}
              {...register('purpose', { required: 'Required' })}
              error={!!errors.purpose} helperText={errors.purpose?.message} />

            <Box display="flex" gap={2}>
              <TextField label="Annual Income ($)" fullWidth type="number"
                {...register('annual_income', { required: 'Required' })}
                error={!!errors.annual_income} helperText={errors.annual_income?.message} />
              <TextField select label="Employment Status" fullWidth defaultValue="employed"
                {...register('employment_status', { required: 'Required' })} error={!!errors.employment_status}>
                {EMPLOYMENT_STATUSES.map(s => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Box>

            <TextField label="Credit Score (optional)" fullWidth type="number"
              {...register('credit_score')} helperText="Self-reported. Range 300–850" />

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
              sx={{ py: 1.5, fontWeight: 700, background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
