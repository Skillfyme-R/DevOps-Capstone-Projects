import React, { useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Grid, Stack, Avatar, Chip,
  Accordion, AccordionSummary, AccordionDetails, Select, MenuItem, FormControl, InputLabel,
  Divider, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicationIcon from '@mui/icons-material/Medication';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { patientsClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

interface MedEntry {
  name: string; generic: string; dosage: string; frequency: string; route: string; notes: string;
}
interface Disease {
  icd10: string; disease: string; category: string; specialty: string; description: string;
  symptoms: string[]; medications: MedEntry[]; precautions: string[];
}

const CATEGORY_COLOR: Record<string, string> = {
  Cardiovascular: MC_COLORS.status.critical,
  Respiratory: MC_COLORS.status.info,
  Endocrine: MC_COLORS.teal[500],
  Gastroenterology: MC_COLORS.emerald[500],
  Musculoskeletal: MC_COLORS.status.warning,
  Psychiatry: MC_COLORS.status.pending,
  Urology: MC_COLORS.teal[300],
  'Infectious Disease': MC_COLORS.status.warning,
  Neurology: MC_COLORS.status.pending,
  Dermatology: MC_COLORS.emerald[300],
  Surgical: MC_COLORS.status.critical,
  Oncology: MC_COLORS.status.critical,
  Nephrology: MC_COLORS.status.info,
  Rheumatology: MC_COLORS.emerald[500],
};

export default function MedicalKnowledgePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const { data, isLoading, isError } = useQuery(
    ['medical-knowledge', search, category],
    () => patientsClient.get('/patients/medical-knowledge', {
      params: {
        ...(search && { search }),
        ...(category && { category }),
      },
    }).then((r: { data: any }) => r.data),
    { keepPreviousData: true, retry: false, staleTime: 60000 }
  );

  const diseases: Disease[] = data?.diseases || [];
  const categories: string[] = data?.categories || [];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/clinical')} sx={{ mb: 3 }}>
        Back to Clinical Operations
      </Button>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Medical Knowledge Base</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            ICD-10 disease reference with standard treatment protocols and medication guidelines
          </Typography>
        </Box>
        <Chip
          label={`${data?.total ?? '—'} conditions`}
          sx={{ bgcolor: `${MC_COLORS.teal[500]}18`, color: MC_COLORS.teal[700], fontWeight: 700, fontSize: '0.8rem', height: 32 }}
        />
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <TextField
          placeholder="Search disease, ICD-10 code, symptom or medication..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value as string)}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">Failed to load medical knowledge base. Ensure the patients service is running.</Alert>
      )}

      {!isLoading && !isError && diseases.length === 0 && (
        <Alert severity="info">No results found for your search. Try a different term or clear the filters.</Alert>
      )}

      {!isLoading && diseases.length > 0 && (
        <Box>
          {diseases.map((d) => {
            const color = CATEGORY_COLOR[d.category] || MC_COLORS.teal[500];
            return (
              <Accordion
                key={d.icd10}
                expanded={expanded === d.icd10}
                onChange={(_, open) => setExpanded(open ? d.icd10 : false)}
                sx={{ mb: 1.5, borderRadius: '8px !important', '&:before': { display: 'none' }, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, py: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={2} width="100%" pr={2}>
                    <Avatar sx={{ bgcolor: `${color}18`, width: 40, height: 40, flexShrink: 0 }}>
                      <LocalHospitalIcon sx={{ color, fontSize: 20 }} />
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                        <Typography variant="body1" fontWeight={700}>{d.disease}</Typography>
                        <Chip label={d.icd10} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20, bgcolor: `${color}12`, color }} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" noWrap>{d.description}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, flexShrink: 0 }}>
                      <Chip label={d.category} size="small" sx={{ bgcolor: `${color}12`, color, fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
                      <Chip label={d.specialty} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                    </Stack>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
                  <Divider sx={{ mb: 2.5 }} />
                  <Grid container spacing={3}>

                    {/* Symptoms */}
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.primary">
                          Clinical Presentation
                        </Typography>
                        <Stack spacing={0.75}>
                          {d.symptoms.map((s) => (
                            <Stack key={s} direction="row" spacing={1} alignItems="flex-start">
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, mt: 0.7, flexShrink: 0 }} />
                              <Typography variant="body2" color="text.secondary">{s}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Paper>
                    </Grid>

                    {/* Medications */}
                    <Grid item xs={12} md={8}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                          <MedicationIcon sx={{ color: MC_COLORS.emerald[500], fontSize: 18 }} />
                          <Typography variant="subtitle2" fontWeight={700}>Standard Medications</Typography>
                        </Stack>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Drug Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Dosage</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Frequency</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Route</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Notes</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {d.medications.map((m) => (
                                <TableRow key={m.name} hover>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{m.generic}</Typography>
                                  </TableCell>
                                  <TableCell><Typography variant="body2">{m.dosage}</Typography></TableCell>
                                  <TableCell><Typography variant="body2">{m.frequency}</Typography></TableCell>
                                  <TableCell>
                                    <Chip label={m.route} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" color="text.secondary">{m.notes}</Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    </Grid>

                    {/* Precautions */}
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: `${MC_COLORS.status.warning}08`, borderColor: `${MC_COLORS.status.warning}40` }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                          <WarningAmberIcon sx={{ color: MC_COLORS.status.warning, fontSize: 18 }} />
                          <Typography variant="subtitle2" fontWeight={700} color="warning.dark">Clinical Precautions & Monitoring</Typography>
                        </Stack>
                        <Grid container spacing={1}>
                          {d.precautions.map((p) => (
                            <Grid item xs={12} sm={6} key={p}>
                              <Stack direction="row" spacing={1} alignItems="flex-start">
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: MC_COLORS.status.warning, mt: 0.7, flexShrink: 0 }} />
                                <Typography variant="body2" color="text.secondary">{p}</Typography>
                              </Stack>
                            </Grid>
                          ))}
                        </Grid>
                      </Paper>
                    </Grid>

                  </Grid>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
