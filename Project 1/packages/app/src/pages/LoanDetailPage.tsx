import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Box, Typography, Card, CardContent, Button, Chip, LinearProgress, Skeleton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS } from '../styles/theme';

interface Loan {
  id: string;
  loan_type: string;
  principal_amount: string;
  outstanding_balance: string;
  interest_rate: string;
  monthly_payment: string;
  term_months: number;
  status: string;
  next_payment_date: string;
  created_at: string;
}

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ loan: Loan }>(
    ['loan', id],
    () => api.get(`/loans/${id}`) as Promise<{ loan: Loan }>
  );

  const loan = data?.loan;

  const progress = loan
    ? ((parseFloat(loan.principal_amount) - parseFloat(loan.outstanding_balance)) / parseFloat(loan.principal_amount)) * 100
    : 0;

  return (
    <Box p={3}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/loans')} sx={{ mb: 2 }}>Back to Loans</Button>

      {isLoading ? (
        <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
      ) : loan ? (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" mb={3}>
              <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark} textTransform="capitalize">
                {loan.loan_type} Loan
              </Typography>
              <Chip label={loan.status} color={loan.status === 'active' ? 'success' : 'default'} />
            </Box>

            <Typography variant="h3" fontWeight={800} color={NEXUS_COLORS.navyDark}>
              ${parseFloat(loan.outstanding_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>Outstanding balance</Typography>

            <Box mb={3}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Repayment Progress</Typography>
                <Typography variant="body2" fontWeight={600}>{progress.toFixed(1)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progress}
                sx={{ height: 8, borderRadius: 1, bgcolor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': { bgcolor: NEXUS_COLORS.emerald } }} />
            </Box>

            <Box display="flex" gap={4} flexWrap="wrap">
              {[
                { label: 'Original Amount', value: `$${parseFloat(loan.principal_amount).toLocaleString()}` },
                { label: 'Monthly Payment', value: `$${parseFloat(loan.monthly_payment).toFixed(2)}` },
                { label: 'Interest Rate', value: `${(parseFloat(loan.interest_rate) * 100).toFixed(2)}% APR` },
                { label: 'Term', value: `${loan.term_months} months` },
                { label: 'Next Payment', value: new Date(loan.next_payment_date).toLocaleDateString() },
                { label: 'Opened', value: new Date(loan.created_at).toLocaleDateString() },
              ].map(item => (
                <Box key={item.label}>
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  <Typography variant="body1" fontWeight={600}>{item.value}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Typography color="error">Loan not found</Typography>
      )}
    </Box>
  );
}
