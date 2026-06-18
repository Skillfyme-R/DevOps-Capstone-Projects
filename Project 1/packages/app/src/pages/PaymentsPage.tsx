import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, TextField,
  Button, Alert, MenuItem, Avatar, Chip,
} from '@mui/material';
import { Send, Receipt, ElectricBolt, Wifi, WaterDrop, LocalGasStation, PhoneAndroid } from '@mui/icons-material';
import { useQuery, useQueryClient } from 'react-query';
import { useLocation } from 'react-router-dom';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS } from '../styles/theme';

interface Account {
  id: string; account_number: string; account_type: string;
  balance: string; nickname: string;
}

const BILL_CATEGORIES = [
  { label: 'Electricity', Icon: ElectricBolt,   color: '#F59E0B', payee: 'City Electric Co.' },
  { label: 'Internet',    Icon: Wifi,            color: '#3B82F6', payee: 'Comcast' },
  { label: 'Water',       Icon: WaterDrop,       color: '#06B6D4', payee: 'City Water Dept.' },
  { label: 'Gas',         Icon: LocalGasStation, color: '#EF4444', payee: 'National Gas Co.' },
  { label: 'Mobile',      Icon: PhoneAndroid,    color: '#8B5CF6', payee: 'T-Mobile' },
  { label: 'Other',       Icon: Receipt,         color: '#6B7280', payee: '' },
];

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();

  const isBillMode = new URLSearchParams(location.search).get('tab') === 'bill';

  // Transfer state
  const [fromAccountId,   setFromAccountId]   = useState('');
  const [toAccountId,     setToAccountId]     = useState('');
  const [transferAmount,  setTransferAmount]  = useState('');
  const [transferDesc,    setTransferDesc]    = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState('');
  const [transferError,   setTransferError]   = useState('');

  // Pay Bill state
  const [billCategory,  setBillCategory]  = useState('');
  const [billPayee,     setBillPayee]     = useState('');
  const [billAccount,   setBillAccount]   = useState('');
  const [billAmount,    setBillAmount]    = useState('');
  const [billRef,       setBillRef]       = useState('');
  const [billLoading,   setBillLoading]   = useState(false);
  const [billSuccess,   setBillSuccess]   = useState('');
  const [billError,     setBillError]     = useState('');

  const { data } = useQuery<{ accounts: Account[] }>(
    'accounts',
    () => api.get('/accounts') as Promise<{ accounts: Account[] }>
  );
  const accounts = data?.accounts ?? [];

  const handleTransfer = async () => {
    if (!fromAccountId || !toAccountId || !transferAmount) {
      setTransferError('Please select both accounts and enter an amount'); return;
    }
    if (fromAccountId === toAccountId) {
      setTransferError('From and To accounts must be different'); return;
    }
    setTransferLoading(true); setTransferError(''); setTransferSuccess('');
    try {
      await api.post('/transactions/transfer', {
        fromAccountId, toAccountId,
        amount: parseFloat(transferAmount),
        description: transferDesc || 'Transfer',
      });
      setTransferSuccess(`Transfer of $${parseFloat(transferAmount).toLocaleString()} completed!`);
      setTransferAmount(''); setToAccountId(''); setTransferDesc('');
      queryClient.invalidateQueries('accounts');
      queryClient.invalidateQueries('recent-transactions');
    } catch (err: any) {
      setTransferError(err?.response?.data?.error?.message || 'Transfer failed. Please try again.');
    } finally { setTransferLoading(false); }
  };

  const handleBillPay = async () => {
    if (!billAccount || !billAmount || !billPayee) {
      setBillError('Please fill in all required fields'); return;
    }
    setBillLoading(true); setBillError(''); setBillSuccess('');
    try {
      await api.post('/transactions/withdrawal', {
        accountId:   billAccount,
        amount:      parseFloat(billAmount),
        description: `${billPayee}${billRef ? ` — Ref: ${billRef}` : ''}`,
      });
      setBillSuccess(`Bill payment of $${parseFloat(billAmount).toLocaleString()} to ${billPayee} completed!`);
      setBillAmount(''); setBillRef(''); setBillCategory(''); setBillPayee('');
      queryClient.invalidateQueries('accounts');
      queryClient.invalidateQueries('recent-transactions');
    } catch (err: any) {
      setBillError(err?.response?.data?.error?.message || 'Payment failed. Please try again.');
    } finally { setBillLoading(false); }
  };

  return (
    <Box p={3} maxWidth={640} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        {isBillMode ? 'Pay Bill' : 'Send Money'}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {isBillMode ? 'Pay your utility and service bills' : 'Transfer funds between your accounts'}
      </Typography>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>

          {/* ── Send Money / Transfer ── */}
          {!isBillMode && (
            <Box display="flex" flexDirection="column" gap={2.5}>
              <Typography variant="h6" fontWeight={600}>Transfer Funds</Typography>

              {transferSuccess && <Alert severity="success">{transferSuccess}</Alert>}
              {transferError   && <Alert severity="error">{transferError}</Alert>}

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

              <TextField label="Amount ($)" fullWidth type="number" value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                inputProps={{ min: 0.01, step: 0.01 }} />

              <TextField label="Description (optional)" fullWidth value={transferDesc}
                onChange={e => setTransferDesc(e.target.value)}
                placeholder="What is this transfer for?" />

              <Button variant="contained" fullWidth size="large" startIcon={<Send />}
                onClick={handleTransfer} disabled={transferLoading}
                sx={{ py: 1.5, fontWeight: 700,
                  background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
                {transferLoading ? 'Sending...' : 'Send Money'}
              </Button>
            </Box>
          )}

          {/* ── Pay Bill ── */}
          {isBillMode && (
            <Box display="flex" flexDirection="column" gap={2.5}>
              <Typography variant="h6" fontWeight={600}>Pay a Bill</Typography>

              {billSuccess && <Alert severity="success">{billSuccess}</Alert>}
              {billError   && <Alert severity="error">{billError}</Alert>}

              <Box>
                <Typography variant="caption" color="text.secondary" mb={1} display="block">Select Category</Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {BILL_CATEGORIES.map(cat => (
                    <Chip
                      key={cat.label}
                      label={cat.label}
                      icon={<Avatar sx={{ width: 18, height: 18, bgcolor: 'transparent', '& svg': { fontSize: 14, color: cat.color } }}><cat.Icon fontSize="inherit" /></Avatar>}
                      onClick={() => { setBillCategory(cat.label); setBillPayee(cat.payee); }}
                      variant={billCategory === cat.label ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 600, cursor: 'pointer',
                        bgcolor:     billCategory === cat.label ? `${cat.color}18` : 'transparent',
                        borderColor: billCategory === cat.label ? cat.color : 'divider',
                        color:       billCategory === cat.label ? cat.color : 'text.secondary',
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <TextField label="Payee / Biller Name" fullWidth value={billPayee}
                onChange={e => setBillPayee(e.target.value)}
                placeholder="e.g. Comcast, City Electric" />

              <TextField select label="Pay From Account" fullWidth value={billAccount}
                onChange={e => setBillAccount(e.target.value)}>
                {accounts.map(acc => (
                  <MenuItem key={acc.id} value={acc.id}>
                    {acc.nickname || acc.account_type} ({acc.account_number}) — ${parseFloat(acc.balance).toLocaleString()}
                  </MenuItem>
                ))}
              </TextField>

              <Box display="flex" gap={2}>
                <TextField label="Amount ($)" fullWidth type="number" value={billAmount}
                  onChange={e => setBillAmount(e.target.value)}
                  inputProps={{ min: 0.01, step: 0.01 }} />
                <TextField label="Reference / Account #" fullWidth value={billRef}
                  onChange={e => setBillRef(e.target.value)}
                  placeholder="Optional" />
              </Box>

              <Button variant="contained" fullWidth size="large" startIcon={<Receipt />}
                onClick={handleBillPay} disabled={billLoading}
                sx={{ py: 1.5, fontWeight: 700,
                  background: `linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)` }}>
                {billLoading ? 'Processing...' : 'Pay Bill'}
              </Button>
            </Box>
          )}

        </CardContent>
      </Card>
    </Box>
  );
}
