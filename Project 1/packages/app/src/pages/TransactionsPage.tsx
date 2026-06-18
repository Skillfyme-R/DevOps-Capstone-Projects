import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import {
  Box, Typography, Card, CardContent, List, ListItem,
  ListItemText, Chip, Skeleton, Divider, TextField,
  MenuItem, Button, InputAdornment, Avatar,
} from '@mui/material';
import { TrendingUp, TrendingDown, Search, FileDownload } from '@mui/icons-material';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS } from '../styles/theme';

interface Transaction {
  id: string; type: string; amount: string;
  description: string; status: string; created_at: string; currency: string;
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <Box textAlign="center" py={7}>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={{ marginBottom: 12 }}>
        <circle cx="40" cy="40" r="40" fill="#F1F5F9"/>
        <rect x="20" y="24" width="40" height="32" rx="4" fill="#E2E8F0"/>
        <rect x="26" y="32" width="28" height="3" rx="1.5" fill="#CBD5E1"/>
        <rect x="26" y="38" width="20" height="3" rx="1.5" fill="#CBD5E1"/>
        <rect x="26" y="44" width="14" height="3" rx="1.5" fill="#E2E8F0"/>
      </svg>
      <Typography color="text.secondary" fontWeight={500}>
        {filtered ? 'No transactions match your filters' : 'No transactions yet'}
      </Typography>
      <Typography color="text.disabled" fontSize={13} mt={0.5}>
        {filtered ? 'Try adjusting your search or filter' : 'Your transactions will appear here'}
      </Typography>
    </Box>
  );
}

function exportCSV(transactions: Transaction[]) {
  const header = 'Date,Description,Type,Amount,Status';
  const rows = transactions.map(tx =>
    `"${new Date(tx.created_at).toLocaleString()}","${tx.description || tx.type}","${tx.type}","${tx.amount}","${tx.status}"`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'nexusfinance-transactions.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function TransactionsPage() {
  const [search,     setSearch]  = useState('');
  const [typeFilter, setType]    = useState('all');
  const [dateFilter, setDate]    = useState('all');

  const { data, isLoading } = useQuery<{ transactions: Transaction[] }>(
    'all-transactions',
    () => api.get('/transactions') as Promise<{ transactions: Transaction[] }>,
    { staleTime: 0, refetchOnMount: true }
  );

  const filtered = useMemo(() => {
    const now = new Date();
    return (data?.transactions ?? []).filter(tx => {
      const matchSearch = !search ||
        tx.description?.toLowerCase().includes(search.toLowerCase()) ||
        tx.type.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' ||
        (typeFilter === 'credit' ? parseFloat(tx.amount) > 0 : parseFloat(tx.amount) < 0);
      let matchDate = true;
      if (dateFilter !== 'all') {
        const d = new Date(tx.created_at);
        const diff = now.getTime() - d.getTime();
        if (dateFilter === '7d')  matchDate = diff <= 7  * 86400000;
        if (dateFilter === '30d') matchDate = diff <= 30 * 86400000;
        if (dateFilter === '90d') matchDate = diff <= 90 * 86400000;
      }
      return matchSearch && matchType && matchDate;
    });
  }, [data, search, typeFilter, dateFilter]);

  const isFiltered = !!(search || typeFilter !== 'all' || dateFilter !== 'all');

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Transactions</Typography>
          <Typography variant="body2" color="text.secondary">Your complete transaction history</Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileDownload />}
          onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
          Export CSV
        </Button>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField placeholder="Search transactions…" size="small" value={search}
          onChange={e => setSearch(e.target.value)} sx={{ minWidth: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
        <TextField select size="small" value={typeFilter} onChange={e => setType(e.target.value)} sx={{ minWidth: 140 }} label="Type">
          <MenuItem value="all">All Types</MenuItem>
          <MenuItem value="credit">Credits (+)</MenuItem>
          <MenuItem value="debit">Debits (−)</MenuItem>
        </TextField>
        <TextField select size="small" value={dateFilter} onChange={e => setDate(e.target.value)} sx={{ minWidth: 140 }} label="Period">
          <MenuItem value="all">All Time</MenuItem>
          <MenuItem value="7d">Last 7 days</MenuItem>
          <MenuItem value="30d">Last 30 days</MenuItem>
          <MenuItem value="90d">Last 90 days</MenuItem>
        </TextField>
        {isFiltered && (
          <Button size="small" onClick={() => { setSearch(''); setType('all'); setDate('all'); }}>Clear filters</Button>
        )}
      </Box>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} px={3} py={2}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="30%" />
              </Box>
            ))
          ) : filtered.length === 0 ? (
            <EmptyState filtered={isFiltered} />
          ) : (
            <List disablePadding>
              {filtered.map((tx, index) => {
                const isCredit = parseFloat(tx.amount) > 0;
                return (
                  <React.Fragment key={tx.id}>
                    <ListItem sx={{ px: 3, py: 2 }}>
                      <Avatar sx={{ mr: 2, width: 38, height: 38,
                        bgcolor: isCredit ? `${NEXUS_COLORS.emerald}18` : `${NEXUS_COLORS.redAlert}12` }}>
                        {isCredit
                          ? <TrendingUp sx={{ fontSize: 18, color: NEXUS_COLORS.emerald }} />
                          : <TrendingDown sx={{ fontSize: 18, color: NEXUS_COLORS.redAlert }} />}
                      </Avatar>
                      <ListItemText
                        primary={tx.description || (tx.type.charAt(0).toUpperCase() + tx.type.slice(1))}
                        secondary={new Date(tx.created_at).toLocaleString('en-US', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                      <Box textAlign="right">
                        <Typography fontWeight={700}
                          color={isCredit ? NEXUS_COLORS.emerald : NEXUS_COLORS.redAlert}>
                          {isCredit ? '+' : ''}${Math.abs(parseFloat(tx.amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Typography>
                        <Chip label={tx.status} size="small"
                          color={tx.status === 'completed' ? 'success' : 'default'} sx={{ mt: 0.5 }} />
                      </Box>
                    </ListItem>
                    {index < filtered.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>
      <Typography variant="caption" color="text.disabled" mt={1} display="block">
        Showing {filtered.length} of {data?.transactions?.length ?? 0} transactions
      </Typography>
    </Box>
  );
}
