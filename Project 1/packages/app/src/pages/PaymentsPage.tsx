import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, TextField,
  Button, Alert, MenuItem,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { useQuery, useQueryClient } from 'react-query';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS } from '../styles/theme';

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: string;
  nickname: string;
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { data } = useQuery<{ accounts: Account[] }>(
    'accounts',
    () => api.get('/accounts') as Promise<{ accounts: Account[] }>
  );

  const accounts = data?.accounts ?? [];

  const handleTransfer = async () => {
    if (!fromAccountId || !toAccountId || !amount) {
      setError('Please select both accounts and enter an amount');
      return;
    }
    if (fromAccountId === toAccountId) {
      setError('From and To accounts must be different');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/transactions/transfer', {
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        description,
      });
      setSuccess(`Transfer of $${parseFloat(amount).toLocaleString()} completed successfully!`);
      setAmount('');
      setToAccountId('');
      setDescription('');
      queryClient.invalidateQueries('accounts');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3} maxWidth={600} mx="auto">
      <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark} mb={1}>Payments</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Transfer money between your accounts</Typography>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>Transfer Funds</Typography>

          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box display="flex" flexDirection="column" gap={2.5}>
            <TextField select label="From Account" fullWidth value={fromAccountId}
              onChange={e => setFromAccountId(e.target.value)}>
              {accounts.map(acc => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.nickname || acc.account_type} ({acc.account_number}) — ${parseFloat(acc.balance).toLocaleString()}
                </MenuItem>
              ))}
            </TextField>

            <TextField select label="To Account" fullWidth value={toAccountId}
              onChange={e => setToAccountId(e.target.value)}
              helperText="Select the destination account">
              {accounts.filter(a => a.id !== fromAccountId).map(acc => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.nickname || acc.account_type} ({acc.account_number})
                </MenuItem>
              ))}
            </TextField>

            <TextField label="Amount ($)" fullWidth type="number" value={amount}
              onChange={e => setAmount(e.target.value)}
              inputProps={{ min: 0.01, step: 0.01 }} />

            <TextField label="Description (optional)" fullWidth value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this transfer for?" />

            <Button variant="contained" fullWidth size="large" startIcon={<Send />}
              onClick={handleTransfer} disabled={loading}
              sx={{ py: 1.5, fontWeight: 700,
                background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
              {loading ? 'Sending...' : 'Send Money'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
