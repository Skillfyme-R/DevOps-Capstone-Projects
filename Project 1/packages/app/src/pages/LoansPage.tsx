import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent,
  Button, Chip, Skeleton, LinearProgress,
} from '@mui/material';
import { Add } from '@mui/icons-material';
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
}

export default function LoansPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<{ loans: Loan[] }>(
    'loans',
    () => api.get('/loans') as Promise<{ loans: Loan[] }>
  );

  const loans = data?.loans ?? [];

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark}>My Loans</Typography>
          <Typography variant="body2" color="text.secondary">Manage your active loans</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />}
          onClick={() => navigate('/loans/apply')}
          sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
          Apply for Loan
        </Button>
      </Box>

      <Grid container spacing={3}>
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              </Grid>
            ))
          : loans.map(loan => {
              const paid = parseFloat(loan.principal_amount) - parseFloat(loan.outstanding_balance);
              const progress = (paid / parseFloat(loan.principal_amount)) * 100;
              return (
                <Grid item xs={12} md={6} key={loan.id}>
                  <Card sx={{ borderRadius: 2, cursor: 'pointer' }}
                    onClick={() => navigate(`/loans/${loan.id}`)}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" fontWeight={700} textTransform="capitalize">
                          {loan.loan_type} Loan
                        </Typography>
                        <Chip label={loan.status} size="small"
                          color={loan.status === 'active' ? 'success' : 'default'} />
                      </Box>
                      <Typography variant="h5" fontWeight={800} color={NEXUS_COLORS.navyDark}>
                        ${parseFloat(loan.outstanding_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        <Typography component="span" variant="body2" color="text.secondary">
                          {' '}remaining
                        </Typography>
                      </Typography>
                      <Box mt={2} mb={1}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="caption" color="text.secondary">Repayment progress</Typography>
                          <Typography variant="caption">{progress.toFixed(0)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={progress}
                          sx={{ borderRadius: 1, height: 6, bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': { bgcolor: NEXUS_COLORS.emerald } }} />
                      </Box>
                      <Box display="flex" gap={3} mt={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Monthly Payment</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            ${parseFloat(loan.monthly_payment).toFixed(2)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Interest Rate</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {(parseFloat(loan.interest_rate) * 100).toFixed(2)}% APR
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Next Payment</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {new Date(loan.next_payment_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
      </Grid>

      {!isLoading && loans.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" mb={2}>No active loans</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/loans/apply')}>
            Apply for a Loan
          </Button>
        </Box>
      )}
    </Box>
  );
}
