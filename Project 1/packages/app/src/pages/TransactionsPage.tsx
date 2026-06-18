import React from 'react';
import { useQuery } from 'react-query';
import {
  Box, Typography, Card, CardContent, List, ListItem,
  ListItemText, Chip, Skeleton, Divider,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { api } from '../utils/apiClient';
import { NEXUS_COLORS } from '../styles/theme';

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description: string;
  status: string;
  created_at: string;
  currency: string;
}

export default function TransactionsPage() {
  const { data, isLoading } = useQuery<{ transactions: Transaction[] }>(
    'all-transactions',
    () => api.get('/transactions') as Promise<{ transactions: Transaction[] }>
  );

  const transactions = data?.transactions ?? [];

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} color={NEXUS_COLORS.navyDark} mb={1}>Transactions</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Your complete transaction history</Typography>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} px={3} py={2}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="30%" />
              </Box>
            ))
          ) : (
            <List disablePadding>
              {transactions.map((tx, index) => {
                const isCredit = parseFloat(tx.amount) > 0;
                return (
                  <React.Fragment key={tx.id}>
                    <ListItem sx={{ px: 3, py: 2 }}>
                      <Box sx={{ mr: 2, color: isCredit ? NEXUS_COLORS.emerald : NEXUS_COLORS.redAlert }}>
                        {isCredit ? <TrendingUp /> : <TrendingDown />}
                      </Box>
                      <ListItemText
                        primary={tx.description || (tx.type.charAt(0).toUpperCase() + tx.type.slice(1))}
                        secondary={new Date(tx.created_at).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                      <Box textAlign="right">
                        <Typography fontWeight={700}
                          color={isCredit ? NEXUS_COLORS.emerald : NEXUS_COLORS.redAlert}>
                          {isCredit ? '+' : ''}${Math.abs(parseFloat(tx.amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Typography>
                        <Chip label={tx.status} size="small"
                          color={tx.status === 'completed' ? 'success' : 'default'}
                          sx={{ mt: 0.5 }} />
                      </Box>
                    </ListItem>
                    {index < transactions.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
              {transactions.length === 0 && (
                <Box textAlign="center" py={6}>
                  <Typography color="text.secondary">No transactions yet</Typography>
                </Box>
              )}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
