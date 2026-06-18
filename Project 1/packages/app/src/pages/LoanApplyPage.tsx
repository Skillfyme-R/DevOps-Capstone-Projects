import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box, Typography, Card, CardContent, TextField,
  Button, MenuItem, Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS } from '../styles/theme';

interface LoanForm {
  loan_type: string;
  requested_amount: number;
  term_months: number;
  purpose: string;
  annual_income: number;
  employment_status: string;
  credit_score: number;
}

const LOAN_TYPES = ['personal', 'auto', 'student'];
const EMPLOYMENT_STATUSES = ['employed', 'self_employed', 'unemployed', 'retired'];
const TERMS = [12, 24, 36, 48, 60];

export default function LoanApplyPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoanForm>();

  const onSubmit = async (data: LoanForm) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/loans/apply', data);
      navigate('/loans');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3} maxWidth={640} mx="auto">
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/loans')} sx={{ mb: 2 }}>
        Back to Loans
      </Button>
      <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark} mb={1}>Apply for a Loan</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Fill in your details and get an instant decision
      </Typography>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column" gap={2.5}>
            <TextField select label="Loan Type" fullWidth
              defaultValue="personal"
              {...register('loan_type', { required: 'Required' })}
              error={!!errors.loan_type} helperText={errors.loan_type?.message}>
              {LOAN_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
            </TextField>

            <Box display="flex" gap={2}>
              <TextField label="Loan Amount ($)" fullWidth type="number"
                {...register('requested_amount', { required: 'Required', min: { value: 1000, message: 'Min $1,000' } })}
                error={!!errors.requested_amount} helperText={errors.requested_amount?.message} />
              <TextField select label="Term (months)" fullWidth
                defaultValue={36}
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
              <TextField select label="Employment Status" fullWidth
                defaultValue="employed"
                {...register('employment_status', { required: 'Required' })}
                error={!!errors.employment_status}>
                {EMPLOYMENT_STATUSES.map(s => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Box>

            <TextField label="Credit Score (optional)" fullWidth type="number"
              {...register('credit_score')}
              helperText="Self-reported. Range 300–850" />

            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
              sx={{ py: 1.5, fontWeight: 700,
                background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
