import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, TextField, Typography, Alert, CircularProgress, Stack, Divider, Link, Chip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { apiClient } from '../utils/apiClient';
import { MC_COLORS } from '../styles/theme';

const ROLES = [
  {
    value: 'patient',
    label: 'Patient',
    description: 'Book appointments, view your health records',
    icon: PersonIcon,
    color: MC_COLORS.teal[500],
  },
  {
    value: 'clinician',
    label: 'Clinician / Physician',
    description: 'Manage patients, consultations and clinical records',
    icon: LocalHospitalIcon,
    color: MC_COLORS.emerald[500],
  },
  {
    value: 'nurse',
    label: 'Nurse / Paramedic',
    description: 'Support patient care and appointment workflows',
    icon: MedicalServicesIcon,
    color: MC_COLORS.status.info,
  },
];

const EMPTY_FORM = {
  email: '', password: '', confirmPassword: '',
  firstName: '', lastName: '', role: '',
  // patient fields
  phone: '', dateOfBirth: '',
  // clinician / nurse fields
  licenseNumber: '', specialization: '', department: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function update(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function selectRole(role: string) {
    setForm((f) => ({ ...f, role }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role) { setError('Please select an account type'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/register', {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        ...(form.phone && { phone: form.phone.startsWith('+') ? form.phone.replace(/\s+/g, '') : `+91${form.phone.replace(/\s+/g, '')}` }),
        ...(form.dateOfBirth && { dateOfBirth: form.dateOfBirth }),
        ...(form.licenseNumber && { licenseNumber: form.licenseNumber }),
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const selectedRole = ROLES.find((r) => r.value === form.role);
  const isStaff = form.role === 'clinician' || form.role === 'nurse';
  const isPatient = form.role === 'patient';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: MC_COLORS.clinical.lightGray, p: 3 }}>
      <Card sx={{ width: '100%', maxWidth: 540 }}>
        <CardContent sx={{ p: 4 }}>

          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, background: `linear-gradient(135deg, ${MC_COLORS.teal[500]}, ${MC_COLORS.emerald[500]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <FavoriteIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Create your account</Typography>
            <Typography variant="body2" color="text.secondary">Join the MediCore healthcare platform</Typography>
          </Box>

          {success && <Alert severity="success" sx={{ mb: 3 }}>Account created! Redirecting to login...</Alert>}
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>

              {/* Step 1: Role selection cards */}
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary" mb={1.5}>
                  I am a... <span style={{ color: 'red' }}>*</span>
                </Typography>
                <Stack spacing={1.5}>
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const selected = form.role === r.value;
                    return (
                      <Box
                        key={r.value}
                        onClick={() => selectRole(r.value)}
                        sx={{
                          border: `2px solid ${selected ? r.color : '#e0e0e0'}`,
                          borderRadius: 2,
                          p: 1.5,
                          cursor: 'pointer',
                          bgcolor: selected ? `${r.color}10` : 'transparent',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          '&:hover': { borderColor: r.color, bgcolor: `${r.color}08` },
                        }}
                      >
                        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: selected ? r.color : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon sx={{ fontSize: 20, color: selected ? 'white' : r.color }} />
                        </Box>
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight={selected ? 700 : 500}>{r.label}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.description}</Typography>
                        </Box>
                        {selected && <Chip label="Selected" size="small" sx={{ bgcolor: r.color, color: 'white', fontSize: '0.65rem', height: 20 }} />}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              {/* Step 2: Fields — only show after role is selected */}
              {form.role && (
                <>
                  <Divider>
                    <Typography variant="caption" color="text.secondary">
                      {selectedRole?.label} Details
                    </Typography>
                  </Divider>

                  {/* Common fields */}
                  <Stack direction="row" spacing={2}>
                    <TextField label="First Name" value={form.firstName} onChange={update('firstName')} fullWidth required autoFocus />
                    <TextField label="Last Name" value={form.lastName} onChange={update('lastName')} fullWidth required />
                  </Stack>
                  <TextField label="Email address" type="email" value={form.email} onChange={update('email')} fullWidth required />
                  <TextField label="Password" type="password" value={form.password} onChange={update('password')} fullWidth required
                    helperText="Min. 12 chars with uppercase, number & special character" />
                  <TextField label="Confirm Password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} fullWidth required
                    error={Boolean(form.confirmPassword && form.password !== form.confirmPassword)}
                    helperText={form.confirmPassword && form.password !== form.confirmPassword ? 'Passwords do not match' : ''} />

                  {/* Patient-specific fields */}
                  {isPatient && (
                    <>
                      <Divider><Typography variant="caption" color="text.secondary">Personal Info (optional)</Typography></Divider>
                      <Stack direction="row" spacing={2}>
                        <TextField label="Phone Number" value={form.phone} onChange={update('phone')} fullWidth placeholder="9876543210 (auto +91)" />
                        <TextField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} fullWidth InputLabelProps={{ shrink: true }} />
                      </Stack>
                    </>
                  )}

                  {/* Clinician / Nurse specific fields */}
                  {isStaff && (
                    <>
                      <Divider><Typography variant="caption" color="text.secondary">Professional Details</Typography></Divider>
                      <TextField
                        label={form.role === 'clinician' ? 'Medical License Number' : 'Nursing License Number'}
                        value={form.licenseNumber}
                        onChange={update('licenseNumber')}
                        fullWidth
                        required
                        helperText={form.role === 'clinician' ? 'Your medical council registration number' : 'Your nursing council registration number'}
                      />
                      <Stack direction="row" spacing={2}>
                        <TextField
                          label={form.role === 'clinician' ? 'Specialization' : 'Department'}
                          value={form.role === 'clinician' ? form.specialization : form.department}
                          onChange={update(form.role === 'clinician' ? 'specialization' : 'department')}
                          fullWidth
                          placeholder={form.role === 'clinician' ? 'e.g. Cardiology, Orthopedics' : 'e.g. ICU, Emergency, OPD'}
                        />
                        <TextField label="Work Phone" value={form.phone} onChange={update('phone')} fullWidth placeholder="9876543210 (auto +91)" />
                      </Stack>
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        Your account will be reviewed and activated by the admin before you can log in.
                      </Alert>
                    </>
                  )}

                  <Button type="submit" variant="contained" size="large" fullWidth disabled={loading || success} sx={{ py: 1.5, fontSize: '1rem', mt: 1 }}>
                    {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : `Create ${selectedRole?.label} Account`}
                  </Button>
                </>
              )}

            </Stack>
          </form>

          <Divider sx={{ my: 3 }} />
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" fontWeight={600} color="primary.main">Sign in</Link>
            </Typography>
          </Box>

        </CardContent>
      </Card>
    </Box>
  );
}
