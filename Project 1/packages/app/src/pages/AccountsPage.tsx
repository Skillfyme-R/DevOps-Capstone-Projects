import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Skeleton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert,
} from '@mui/material';
import { AccountBalance, Savings, CreditCard, Add } from '@mui/icons-material';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS } from '../styles/theme';

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: string;
  available_balance: string;
  nickname: string;
  currency: string;
  status: string;
  interest_rate: string;
}

const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
  checking:   <AccountBalance />,
  savings:    <Savings />,
  credit:     <CreditCard />,
  investment: <AccountBalance />,
};

const ACCOUNT_COLORS: Record<string, string> = {
  checking:   NEXUS_COLORS.electricBlue,
  savings:    NEXUS_COLORS.emerald,
  credit:     '#9c27b0',
  investment: NEXUS_COLORS.amber,
};

export default function AccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountType, setAccountType] = useState('checking');
  const [nickname, setNickname] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const { data, isLoading } = useQuery<{ accounts: Account[] }>(
    'accounts',
    () => api.get('/accounts') as Promise<{ accounts: Account[] }>,
    { staleTime: 0, cacheTime: 0, refetchOnMount: true }
  );

  const accounts = data?.accounts ?? [];

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      await api.post('/accounts', { accountType, nickname });
      queryClient.invalidateQueries('accounts');
      setDialogOpen(false);
      setAccountType('checking');
      setNickname('');
    } catch (err: any) {
      setCreateError(err?.response?.data?.error?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark}>My Accounts</Typography>
          <Typography variant="body2" color="text.secondary">Manage all your bank accounts</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}
          sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
          New Account
        </Button>
      </Box>

      <Grid container spacing={3}>
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
              </Grid>
            ))
          : accounts.map(acc => (
              <Grid item xs={12} sm={6} md={4} key={acc.id}>
                <Card onClick={() => navigate(`/accounts/${acc.id}`)}
                  sx={{ borderRadius: 2, border: `1px solid ${ACCOUNT_COLORS[acc.account_type] || NEXUS_COLORS.electricBlue}44`, cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box sx={{ color: ACCOUNT_COLORS[acc.account_type] || NEXUS_COLORS.electricBlue }}>
                        {ACCOUNT_ICONS[acc.account_type] || <AccountBalance />}
                      </Box>
                      <Chip label={acc.status} size="small"
                        color={acc.status === 'active' ? 'success' : 'default'} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" textTransform="capitalize">
                      {acc.account_type}{acc.nickname ? ` — ${acc.nickname}` : ''}
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark} mt={1}>
                      ${parseFloat(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Available: ${parseFloat(acc.available_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                    <Box mt={1}>
                      <Typography variant="caption" color="text.secondary">
                        {acc.account_number} &nbsp;•&nbsp; {(parseFloat(acc.interest_rate || '0') * 100).toFixed(2)}% APY
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
      </Grid>

      {!isLoading && accounts.length === 0 && (
        <Box textAlign="center" py={8}>
          <AccountBalance sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No accounts yet</Typography>
          <Typography variant="body2" color="text.disabled" mb={3}>Open your first account to get started</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>Open Account</Button>
        </Box>
      )}

      {/* New Account Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Open New Account</DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField select label="Account Type" fullWidth value={accountType}
              onChange={e => setAccountType(e.target.value)}>
              <MenuItem value="checking">Checking</MenuItem>
              <MenuItem value="savings">Savings</MenuItem>
              <MenuItem value="investment">Investment</MenuItem>
              <MenuItem value="credit">Credit</MenuItem>
            </TextField>
            <TextField label="Nickname (optional)" fullWidth value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="e.g. Emergency Fund" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}
            sx={{ background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue} 0%, #1557d4 100%)` }}>
            {creating ? 'Creating...' : 'Open Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
