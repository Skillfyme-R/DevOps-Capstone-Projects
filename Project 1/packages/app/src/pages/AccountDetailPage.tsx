import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import {
  Box, Typography, Card, CardContent, Button, Chip, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
} from '@mui/material';
import { ArrowBack, Add, DeleteOutline } from '@mui/icons-material';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS } from '../styles/theme';

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: string;
  available_balance: string;
  nickname: string;
  interest_rate: string;
  status: string;
  created_at: string;
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDesc, setDepositDesc] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');

  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');

  const { data: account, isLoading, refetch } = useQuery<Account>(
    ['account', id],
    () => api.get(`/accounts/${id}`) as Promise<Account>,
    { staleTime: 0, cacheTime: 0, refetchOnMount: true }
  );

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setDepositError('Enter a valid amount');
      return;
    }
    setDepositing(true);
    setDepositError('');
    try {
      await api.post('/transactions/deposit', {
        accountId: id,
        amount: parseFloat(depositAmount),
        description: depositDesc || 'Deposit',
      });
      setDepositSuccess(`$${parseFloat(depositAmount).toLocaleString()} deposited successfully!`);
      setDepositAmount('');
      setDepositDesc('');
      refetch();
      queryClient.invalidateQueries('accounts');
      queryClient.invalidateQueries('recent-transactions');
      queryClient.invalidateQueries('analytics-summary');
    } catch (err: any) {
      setDepositError(err?.response?.data?.error?.message || 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  const handleCloseAccount = async () => {
    setClosing(true);
    setCloseError('');
    try {
      await api.delete(`/accounts/${id}`);
      queryClient.removeQueries('accounts');
      queryClient.removeQueries('analytics-summary');
      navigate('/accounts');
    } catch (err: any) {
      setCloseError(err?.response?.data?.error?.message || 'Failed to close account');
      setClosing(false);
    }
  };

  return (
    <Box p={3}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/accounts')} sx={{ mb: 2 }}>
        Back to Accounts
      </Button>

      {isLoading ? (
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      ) : account ? (
        <>
          <Card sx={{ borderRadius: 2, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark}>
                  {account.nickname || account.account_number}
                </Typography>
                <Box display="flex" gap={1} alignItems="center">
                  <Chip label={account.status} color={account.status === 'active' ? 'success' : 'default'} />
                  <Button variant="contained" startIcon={<Add />}
                    onClick={() => { setDepositSuccess(''); setDepositError(''); setDepositOpen(true); }}
                    sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
                    Add Money
                  </Button>
                  <Button variant="outlined" color="error" startIcon={<DeleteOutline />}
                    onClick={() => { setCloseError(''); setCloseOpen(true); }}>
                    Close Account
                  </Button>
                </Box>
              </Box>

              <Typography variant="h3" fontWeight={800} color={NEXUS_COLORS.navyDark}>
                ${parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Available: ${parseFloat(account.available_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>

              <Box display="flex" gap={4} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" color="text.secondary">Account Number</Typography>
                  <Typography variant="body1" fontWeight={600}>{account.account_number}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <Typography variant="body1" fontWeight={600} textTransform="capitalize">{account.account_type}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Interest Rate</Typography>
                  <Typography variant="body1" fontWeight={600}>{(parseFloat(account.interest_rate || '0') * 100).toFixed(2)}% APY</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Opened</Typography>
                  <Typography variant="body1" fontWeight={600}>{new Date(account.created_at).toLocaleDateString()}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {depositSuccess && <Alert severity="success" sx={{ mb: 2 }}>{depositSuccess}</Alert>}
        </>
      ) : (
        <Typography color="error">Account not found</Typography>
      )}

      {/* Close Account Confirmation Dialog */}
      <Dialog open={closeOpen} onClose={() => setCloseOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Close Account</DialogTitle>
        <DialogContent>
          {closeError && <Alert severity="error" sx={{ mb: 2 }}>{closeError}</Alert>}
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will permanently close the account <strong>{account?.account_number}</strong>. This action cannot be undone.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Make sure the balance is $0 before closing. Any remaining balance will need to be transferred first.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCloseOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleCloseAccount} disabled={closing}>
            {closing ? 'Closing...' : 'Yes, Close Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onClose={() => setDepositOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Money</DialogTitle>
        <DialogContent>
          {depositError && <Alert severity="error" sx={{ mb: 2 }}>{depositError}</Alert>}
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Amount ($)" type="number" fullWidth
              value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
              inputProps={{ min: 0.01, step: 0.01 }}
              autoFocus />
            <TextField label="Description (optional)" fullWidth
              value={depositDesc} onChange={e => setDepositDesc(e.target.value)}
              placeholder="e.g. Salary, Transfer in" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDepositOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleDeposit} disabled={depositing}
            sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
            {depositing ? 'Depositing...' : 'Add Money'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
