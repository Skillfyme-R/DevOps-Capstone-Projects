import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Avatar, IconButton, Stack, Skeleton, Pagination, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import { useQuery } from 'react-query';
import { format, differenceInYears, parseISO } from 'date-fns';
import { apiClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

const GENDER_COLOR: Record<string, string> = { male: MC_COLORS.teal[500], female: MC_COLORS.emerald[500], other: MC_COLORS.status.info };

export default function PatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const { data, isLoading } = useQuery(
    ['patients', search, page],
    () => apiClient.get('/patients', { params: { search, page, limit: LIMIT } }).then((r) => r.data),
    { keepPreviousData: true, retry: false }
  );

  const patients = data?.patients || [];
  const total = data?.total || 0;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Patient Registry</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{total.toLocaleString()} total patients</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/patients/new')}>New Patient</Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <TextField
            placeholder="Search by name, MRN, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            fullWidth
            sx={{ mb: 3 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
          />

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>MRN</TableCell>
                  <TableCell>Age / Gender</TableCell>
                  <TableCell>Blood Group</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Registered</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                  : patients.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                          <PersonIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
                          <Typography>No patients found</Typography>
                        </TableCell>
                      </TableRow>
                    )
                    : patients.map((p: Record<string, string>) => {
                      const age = p.date_of_birth ? differenceInYears(new Date(), parseISO(p.date_of_birth)) : null;
                      return (
                        <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Avatar sx={{ bgcolor: MC_COLORS.teal[100], color: MC_COLORS.teal[700], width: 36, height: 36, fontSize: '0.875rem' }}>
                                {(p.first_name?.[0] || '') + (p.last_name?.[0] || '')}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{p.first_name} {p.last_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{p.email || '—'}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell><Typography variant="body2" fontFamily="monospace">{p.mrn}</Typography></TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2">{age !== null ? `${age} yrs` : '—'}</Typography>
                              <Chip label={p.gender} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${GENDER_COLOR[p.gender] || MC_COLORS.clinical.textGray}20`, color: GENDER_COLOR[p.gender] || MC_COLORS.clinical.textGray, width: 'fit-content' }} />
                            </Stack>
                          </TableCell>
                          <TableCell>{p.blood_group ? <Chip label={p.blood_group} size="small" color="error" variant="outlined" /> : '—'}</TableCell>
                          <TableCell><Typography variant="body2">{p.phone || '—'}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{p.created_at ? format(new Date(p.created_at), 'MMM d, yyyy') : '—'}</Typography></TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="View Patient"><IconButton size="small" onClick={() => navigate(`/patients/${p.id}`)} sx={{ color: 'primary.main' }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </TableContainer>

          {total > LIMIT && (
            <Box mt={3} display="flex" justifyContent="center">
              <Pagination count={Math.ceil(total / LIMIT)} page={page} onChange={(_, v) => setPage(v)} color="primary" />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
