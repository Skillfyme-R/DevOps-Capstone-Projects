import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Stack, Avatar, Button,
  TextField, Switch, FormControlLabel, Divider, Chip, Grid,
  Tab, Tabs, InputAdornment, IconButton, LinearProgress,
  Select, MenuItem, FormControl, InputLabel, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, CircularProgress,
} from '@mui/material';
import {
  Edit, Security, Notifications, CameraAlt, Person,
  LocationOn, Phone, Email, Cake, Language, Palette,
  Visibility, VisibilityOff, Shield, Devices,
  ShoppingBag, Favorite, Star, AccountCircle,
  CheckCircle, ContentCopy, KeyboardArrowRight,
  DeleteForever, WarningAmber, HeadsetMic,
} from '@mui/icons-material';
import { VV_COLORS } from '../styles/theme';
import { formatINR } from '../utils/currency';

/* ─── Types ─── */
interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }

function TabPanel({ children, index, value }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

/* ─── Password strength helper ─── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: VV_COLORS.slate200 };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: [string, string][] = [
    ['Weak', VV_COLORS.coral],
    ['Fair', VV_COLORS.amber],
    ['Good', '#3B82F6'],
    ['Strong', VV_COLORS.emerald],
    ['Very Strong', VV_COLORS.emeraldDark],
  ];
  const [label, color] = map[score] ?? ['Weak', VV_COLORS.coral];
  return { score, label, color };
}

const SESSIONS = [
  { device: 'Chrome on MacBook Pro', location: 'Austin, TX', lastActive: 'Active now',    current: true  },
  { device: 'Safari on iPhone 15',   location: 'Austin, TX', lastActive: '2 hours ago',   current: false },
  { device: 'Firefox on Windows 11', location: 'New York, NY', lastActive: '3 days ago',  current: false },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('vv-user') ?? '{"name":"Alex Smith","email":"alex@example.com","role":"customer"}');

  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [twoFA, setTwoFA] = useState(false);
  const [language, setLanguage] = useState('en');
  const [themePreference, setThemePreference] = useState('light');

  /* ── Photo upload ── */
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    localStorage.getItem('vv-profile-photo') ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showSnack('Only JPG, PNG or WebP files are allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showSnack('File size must be under 5 MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setPhotoUrl(url);
      localStorage.setItem('vv-profile-photo', url);
      showSnack('Profile photo updated!', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function triggerFilePicker() {
    if (editing) fileInputRef.current?.click();
  }

  /* ── Delete Account dialog ── */
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting]           = useState(false);

  /* ── Snackbar ── */
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const showSnack = (message: string, severity: 'success' | 'info' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  /* ── Handlers ── */
  function handleCopyReferral() {
    navigator.clipboard.writeText('ALEX2024VV').then(() => showSnack('Referral code copied to clipboard!', 'success'));
  }

  function handleDeleteAccount() {
    setDeleting(true);
    setTimeout(() => {
      localStorage.removeItem('vv-user');
      localStorage.removeItem('vv-token');
      localStorage.removeItem('vv-cart');
      localStorage.removeItem('vv-wishlist-removed');
      setDeleting(false);
      setDeleteOpen(false);
      navigate('/login');
    }, 1800);
  }

  const [notifToggles, setNotifToggles] = useState({
    orderEmail:    true,
    orderSMS:      true,
    promotions:    false,
    priceDrops:    true,
    wishlistRestock: true,
    newsletter:    false,
    securityAlerts: true,
  });

  const strength = getPasswordStrength(newPassword);
  const initials = (user.name as string).split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const accountStats = [
    { icon: <ShoppingBag />,   label: 'Total Orders',   value: '24',          color: VV_COLORS.violetMid },
    { icon: <Star />,          label: 'Total Spent',    value: formatINR(59190), color: VV_COLORS.amber },
    { icon: <Favorite />,      label: 'Wishlist Items', value: '7',            color: VV_COLORS.coral },
    { icon: <AccountCircle />, label: 'Member Since',   value: 'Jan 2024',     color: VV_COLORS.emerald },
  ];

  return (
    <Box>
      {/* ── Hero Banner ── */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${VV_COLORS.violetDeep} 0%, ${VV_COLORS.violetMid} 55%, ${VV_COLORS.violetLight} 100%)`,
          borderRadius: 3,
          p: { xs: 3, md: 4 },
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""', position: 'absolute',
            top: -70, right: -70, width: 260, height: 260,
            borderRadius: '50%', background: alpha('#fff', 0.05),
          },
          '&::after': {
            content: '""', position: 'absolute',
            bottom: -50, left: '40%', width: 150, height: 150,
            borderRadius: '50%', background: alpha('#fff', 0.04),
          },
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          {/* Avatar */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={photoUrl ?? undefined}
              sx={{
                width: 88, height: 88,
                fontSize: 32, fontWeight: 800,
                background: `linear-gradient(135deg, ${VV_COLORS.coral}, ${VV_COLORS.violetMid})`,
                border: `3px solid ${alpha('#fff', 0.3)}`,
                boxShadow: `0 8px 24px ${alpha(VV_COLORS.violetDeep, 0.4)}`,
              }}
            >
              {initials}
            </Avatar>
            <Box
              onClick={() => { setTab(0); setEditing(true); setTimeout(() => fileInputRef.current?.click(), 50); }}
              sx={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                bgcolor: VV_COLORS.amber,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff',
                cursor: 'pointer',
                '&:hover': { transform: 'scale(1.1)' },
                transition: 'transform 0.2s',
              }}
            >
              <CameraAlt sx={{ fontSize: 14, color: '#fff' }} />
            </Box>
          </Box>

          {/* Name + info */}
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
              <Typography variant="h4" fontWeight={800} color="#fff">
                {user.name}
              </Typography>
              <Chip
                label={user.role === 'vendor' ? 'Vendor' : 'Customer'}
                size="small"
                sx={{
                  bgcolor: alpha('#fff', 0.2),
                  color: '#fff',
                  fontWeight: 700,
                  border: `1px solid ${alpha('#fff', 0.3)}`,
                  textTransform: 'capitalize',
                }}
              />
            </Stack>
            <Stack direction="row" spacing={2} mt={0.75} flexWrap="wrap" sx={{ rowGap: 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Email sx={{ color: alpha('#fff', 0.65), fontSize: 14 }} />
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.75) }}>{user.email}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Star sx={{ color: alpha('#fff', 0.65), fontSize: 14 }} />
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.75) }}>Member since Jan 2024</Typography>
              </Stack>
            </Stack>
          </Box>

          {/* Edit button */}
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => { setTab(0); setEditing(e => !e); }}
            sx={{
              color: '#fff',
              borderColor: alpha('#fff', 0.4),
              '&:hover': { bgcolor: alpha('#fff', 0.1), borderColor: '#fff' },
              flexShrink: 0,
            }}
          >
            {editing ? 'Cancel Edit' : 'Edit Profile'}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* ── Main Column ── */}
        <Grid item xs={12} md={8}>
          {/* Tabs */}
          <Card sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                  '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 52 },
                  '& .Mui-selected': { color: VV_COLORS.violetMid },
                  '& .MuiTabs-indicator': { bgcolor: VV_COLORS.violetMid, height: 3, borderRadius: '3px 3px 0 0' },
                }}
              >
                <Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" label="Profile Info" />
                <Tab icon={<Security sx={{ fontSize: 18 }} />} iconPosition="start" label="Security" />
                <Tab icon={<Notifications sx={{ fontSize: 18 }} />} iconPosition="start" label="Preferences" />
              </Tabs>
            </Box>

            {/* ── TAB 0: Profile Info ── */}
            <TabPanel value={tab} index={0}>
              <CardContent sx={{ pt: 0, px: { xs: 2, md: 3 }, pb: 3 }}>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />

                {/* Avatar upload area */}
                <Box
                  onClick={triggerFilePicker}
                  sx={{
                    border: `2px dashed ${editing ? VV_COLORS.violetMid : VV_COLORS.slate200}`,
                    borderRadius: 3,
                    p: 3,
                    mb: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    bgcolor: editing ? alpha(VV_COLORS.violetMid, 0.04) : VV_COLORS.slate50,
                    transition: 'all 0.2s',
                    cursor: editing ? 'pointer' : 'default',
                    '&:hover': editing ? { bgcolor: alpha(VV_COLORS.violetMid, 0.07) } : {},
                  }}
                >
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      src={photoUrl ?? undefined}
                      sx={{
                        width: 64, height: 64, fontSize: 24, fontWeight: 800,
                        background: `linear-gradient(135deg, ${VV_COLORS.coral}, ${VV_COLORS.violetMid})`,
                      }}
                    >
                      {initials}
                    </Avatar>
                    {editing && (
                      <Box sx={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        bgcolor: alpha('#000', 0.35),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CameraAlt sx={{ color: '#fff', fontSize: 22 }} />
                      </Box>
                    )}
                  </Box>
                  <Box flex={1}>
                    <Typography variant="body1" fontWeight={600}>Profile Photo</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {editing
                        ? photoUrl
                          ? 'Click to change your photo — JPG, PNG or WebP, max 5 MB'
                          : 'Click anywhere here to upload — JPG, PNG or WebP, max 5 MB'
                        : 'Enable editing to update your photo'}
                    </Typography>
                    {editing && (
                      <Stack direction="row" spacing={1} mt={1}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CameraAlt />}
                          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          {photoUrl ? 'Change Photo' : 'Choose Photo'}
                        </Button>
                        {photoUrl && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={e => {
                              e.stopPropagation();
                              setPhotoUrl(null);
                              localStorage.removeItem('vv-profile-photo');
                              showSnack('Profile photo removed', 'info');
                            }}
                            sx={{ fontSize: '0.75rem' }}
                          >
                            Remove
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Box>
                  {photoUrl && (
                    <Chip
                      label="Photo set"
                      size="small"
                      icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
                      sx={{
                        bgcolor: alpha(VV_COLORS.emerald, 0.1),
                        color: VV_COLORS.emeraldDark,
                        fontWeight: 700,
                        '& .MuiChip-icon': { color: VV_COLORS.emerald },
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Box>

                {/* Personal Info section */}
                <SectionHeader icon={<Person />} title="Personal Information" color={VV_COLORS.violetMid} />
                <Grid container spacing={2} mb={3}>
                  {[
                    { label: 'First Name',    value: 'Alex',         icon: <Person />,    sm: 6 },
                    { label: 'Last Name',     value: 'Smith',        icon: <Person />,    sm: 6 },
                    { label: 'Email Address', value: user.email,     icon: <Email />,     sm: 6 },
                    { label: 'Phone Number',  value: '+91 98765 43210', icon: <Phone />,  sm: 6 },
                    { label: 'Date of Birth', value: '1992-03-15',   icon: <Cake />,      sm: 6 },
                    { label: 'Gender',        value: 'Male',         icon: <Person />,    sm: 6 },
                  ].map(({ label, value, icon, sm }) => (
                    <Grid item xs={12} sm={sm} key={label}>
                      <TextField
                        fullWidth
                        label={label}
                        defaultValue={value}
                        disabled={!editing}
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              {React.cloneElement(icon as React.ReactElement, {
                                sx: { fontSize: 18, color: VV_COLORS.slate400 },
                              })}
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>

                {/* Address section */}
                <SectionHeader icon={<LocationOn />} title="Default Shipping Address" color={VV_COLORS.emerald} />
                <Grid container spacing={2}>
                  {[
                    { label: 'Street Address', value: '123 Main St',  sm: 12 },
                    { label: 'City',           value: 'Austin',       sm: 6 },
                    { label: 'State',          value: 'Texas',        sm: 3 },
                    { label: 'ZIP / Postal',   value: '78701',        sm: 3 },
                    { label: 'Country',        value: 'United States', sm: 6 },
                    { label: 'Landmark',       value: 'Near City Hall', sm: 6 },
                  ].map(({ label, value, sm }) => (
                    <Grid item xs={12} sm={sm} key={label}>
                      <TextField
                        fullWidth
                        label={label}
                        defaultValue={value}
                        disabled={!editing}
                        size="small"
                        InputProps={label === 'Street Address' ? {
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOn sx={{ fontSize: 18, color: VV_COLORS.slate400 }} />
                            </InputAdornment>
                          ),
                        } : undefined}
                      />
                    </Grid>
                  ))}
                </Grid>

                {editing && (
                  <Stack direction="row" spacing={2} mt={3}>
                    <Button variant="contained" onClick={() => setEditing(false)} sx={{ px: 4 }}>
                      Save Changes
                    </Button>
                    <Button variant="outlined" onClick={() => setEditing(false)}>
                      Discard
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </TabPanel>

            {/* ── TAB 1: Security ── */}
            <TabPanel value={tab} index={1}>
              <CardContent sx={{ pt: 0, px: { xs: 2, md: 3 }, pb: 3 }}>
                {/* Change password */}
                <SectionHeader icon={<Shield />} title="Change Password" color={VV_COLORS.violetMid} />
                <Stack spacing={2} mb={4}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type={showCurrent ? 'text' : 'password'}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowCurrent(v => !v)}>
                            {showCurrent ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowNew(v => !v)}>
                            {showNew ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {newPassword && (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" mb={0.75}>
                        <Typography variant="caption" color="text.secondary">Password strength</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: strength.color }}>
                          {strength.label}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(strength.score / 4) * 100}
                        sx={{
                          height: 5, borderRadius: 3,
                          bgcolor: VV_COLORS.slate100,
                          '& .MuiLinearProgress-bar': { bgcolor: strength.color, borderRadius: 3 },
                        }}
                      />
                      <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" sx={{ rowGap: 0.5 }}>
                        {[
                          { label: '8+ chars',      met: newPassword.length >= 8 },
                          { label: 'Uppercase',      met: /[A-Z]/.test(newPassword) },
                          { label: 'Number',         met: /[0-9]/.test(newPassword) },
                          { label: 'Special char',   met: /[^A-Za-z0-9]/.test(newPassword) },
                        ].map(req => (
                          <Chip
                            key={req.label}
                            size="small"
                            icon={req.met ? <CheckCircle sx={{ fontSize: '14px !important' }} /> : undefined}
                            label={req.label}
                            sx={{
                              fontSize: '0.68rem',
                              bgcolor: req.met ? alpha(VV_COLORS.emerald, 0.12) : VV_COLORS.slate100,
                              color: req.met ? VV_COLORS.emeraldDark : VV_COLORS.slate600,
                              fontWeight: 600,
                              '& .MuiChip-icon': { color: VV_COLORS.emerald },
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type={showConfirm ? 'text' : 'password'}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowConfirm(v => !v)}>
                            {showConfirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button variant="contained" sx={{ alignSelf: 'flex-start', px: 4 }}>
                    Update Password
                  </Button>
                </Stack>

                <Divider sx={{ my: 3 }} />

                {/* 2FA */}
                <SectionHeader icon={<Shield />} title="Two-Factor Authentication" color={VV_COLORS.emerald} />
                <Card
                  sx={{
                    mb: 4,
                    background: twoFA
                      ? `linear-gradient(135deg, ${alpha(VV_COLORS.emerald, 0.06)}, ${alpha(VV_COLORS.emerald, 0.02)})`
                      : VV_COLORS.slate50,
                    border: `1.5px solid ${twoFA ? alpha(VV_COLORS.emerald, 0.3) : VV_COLORS.slate200}`,
                    boxShadow: 'none',
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                          <Typography variant="body1" fontWeight={700}>
                            Authenticator App
                          </Typography>
                          {twoFA && (
                            <Chip label="Enabled" size="small" sx={{ bgcolor: alpha(VV_COLORS.emerald, 0.15), color: VV_COLORS.emeraldDark, fontWeight: 700, fontSize: '0.68rem' }} />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Use an authenticator app like Google Authenticator or Authy to generate time-based one-time codes.
                        </Typography>
                      </Box>
                      <Switch
                        checked={twoFA}
                        onChange={e => setTwoFA(e.target.checked)}
                        color="success"
                        sx={{ ml: 2, flexShrink: 0 }}
                      />
                    </Stack>
                  </CardContent>
                </Card>

                {/* Active sessions */}
                <SectionHeader icon={<Devices />} title="Active Sessions" color={VV_COLORS.amber} />
                <Stack spacing={1.5}>
                  {SESSIONS.map(session => (
                    <Card
                      key={session.device}
                      sx={{
                        boxShadow: 'none',
                        border: `1px solid ${session.current ? alpha(VV_COLORS.violetMid, 0.25) : VV_COLORS.slate200}`,
                        bgcolor: session.current ? alpha(VV_COLORS.violetMid, 0.03) : 'transparent',
                      }}
                    >
                      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                              sx={{
                                width: 40, height: 40, borderRadius: 2,
                                bgcolor: session.current
                                  ? alpha(VV_COLORS.violetMid, 0.1)
                                  : VV_COLORS.slate100,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <Devices sx={{ color: session.current ? VV_COLORS.violetMid : VV_COLORS.slate400, fontSize: 20 }} />
                            </Box>
                            <Box>
                              <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Typography variant="body2" fontWeight={600}>{session.device}</Typography>
                                {session.current && (
                                  <Chip label="This device" size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: alpha(VV_COLORS.violetMid, 0.12), color: VV_COLORS.violetMid, fontWeight: 700 }} />
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {session.location} · {session.lastActive}
                              </Typography>
                            </Box>
                          </Stack>
                          {!session.current && (
                            <Button size="small" color="error" variant="text" sx={{ fontSize: '0.72rem' }}>
                              Revoke
                            </Button>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </TabPanel>

            {/* ── TAB 2: Preferences ── */}
            <TabPanel value={tab} index={2}>
              <CardContent sx={{ pt: 0, px: { xs: 2, md: 3 }, pb: 3 }}>
                {/* Notification toggles */}
                <SectionHeader icon={<Notifications />} title="Notification Preferences" color={VV_COLORS.violetMid} />
                <Stack spacing={0.5} mb={4}>
                  {(Object.entries({
                    orderEmail:      'Order updates via Email',
                    orderSMS:        'Order updates via SMS',
                    promotions:      'Promotional offers & deals',
                    priceDrops:      'Price drop alerts',
                    wishlistRestock: 'Wishlist item restocks',
                    newsletter:      'Weekly newsletter',
                    securityAlerts:  'Security & login alerts',
                  }) as [keyof typeof notifToggles, string][]).map(([key, label]) => (
                    <Box
                      key={key}
                      sx={{
                        px: 2, py: 1.5, borderRadius: 2,
                        '&:hover': { bgcolor: VV_COLORS.slate50 },
                        transition: 'background 0.15s',
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={notifToggles[key]}
                            onChange={e => setNotifToggles(prev => ({ ...prev, [key]: e.target.checked }))}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{label}</Typography>
                          </Box>
                        }
                        labelPlacement="start"
                        sx={{ justifyContent: 'space-between', ml: 0, width: '100%' }}
                      />
                    </Box>
                  ))}
                </Stack>

                <Divider sx={{ my: 3 }} />

                {/* Theme preference */}
                <SectionHeader icon={<Palette />} title="Appearance" color={VV_COLORS.amber} />
                <Stack spacing={2} mb={4}>
                  <Stack direction="row" spacing={1.5}>
                    {(['light', 'dark', 'system'] as const).map(opt => (
                      <Box
                        key={opt}
                        onClick={() => setThemePreference(opt)}
                        sx={{
                          flex: 1, py: 2, borderRadius: 2, textAlign: 'center', cursor: 'pointer',
                          border: `2px solid ${themePreference === opt ? VV_COLORS.violetMid : VV_COLORS.slate200}`,
                          bgcolor: themePreference === opt ? alpha(VV_COLORS.violetMid, 0.06) : VV_COLORS.slate50,
                          transition: 'all 0.18s',
                        }}
                      >
                        <Typography fontSize={22}>
                          {opt === 'light' ? '☀️' : opt === 'dark' ? '🌙' : '💻'}
                        </Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                          {opt}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>

                {/* Language */}
                <SectionHeader icon={<Language />} title="Language & Region" color={VV_COLORS.emerald} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Language</InputLabel>
                      <Select value={language} label="Language" onChange={e => setLanguage(e.target.value)}>
                        <MenuItem value="en">English (US)</MenuItem>
                        <MenuItem value="en-in">English (India)</MenuItem>
                        <MenuItem value="hi">Hindi — हिन्दी</MenuItem>
                        <MenuItem value="ta">Tamil — தமிழ்</MenuItem>
                        <MenuItem value="te">Telugu — తెలుగు</MenuItem>
                        <MenuItem value="mr">Marathi — मराठी</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Currency</InputLabel>
                      <Select value="inr" label="Currency" disabled>
                        <MenuItem value="inr">Indian Rupee (₹ INR)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Button variant="contained" sx={{ mt: 3, px: 4 }}>
                  Save Preferences
                </Button>
              </CardContent>
            </TabPanel>
          </Card>
        </Grid>

        {/* ── Sidebar ── */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Account stats */}
            <Card>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Typography variant="h6" fontWeight={700} mb={2.5}>Account Overview</Typography>
                <Grid container spacing={1.5}>
                  {accountStats.map(stat => (
                    <Grid item xs={6} key={stat.label}>
                      <Box
                        sx={{
                          borderRadius: 2.5, p: 2, textAlign: 'center',
                          bgcolor: alpha(stat.color, 0.08),
                          border: `1px solid ${alpha(stat.color, 0.15)}`,
                        }}
                      >
                        <Box sx={{ color: stat.color, mb: 0.5, display: 'flex', justifyContent: 'center' }}>
                          {React.cloneElement(stat.icon as React.ReactElement, { sx: { fontSize: 22 } })}
                        </Box>
                        <Typography variant="body1" fontWeight={800} color={stat.color}>
                          {stat.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          {stat.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Referral */}
            <Card>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Typography variant="h6" fontWeight={700} mb={0.5}>Refer & Earn</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Share your referral code and earn ₹200 for every friend who shops.
                </Typography>
                <Box
                  sx={{
                    borderRadius: 2,
                    border: `1.5px dashed ${VV_COLORS.violetMid}`,
                    bgcolor: alpha(VV_COLORS.violetMid, 0.04),
                    p: 1.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="body2" fontWeight={800} color={VV_COLORS.violetMid} letterSpacing={2}>
                    ALEX2024VV
                  </Typography>
                  <IconButton size="small" sx={{ color: VV_COLORS.violetMid }} onClick={handleCopyReferral}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>

            {/* Quick links */}
            <Card>
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Typography variant="h6" fontWeight={700} mb={2}>Quick Links</Typography>
                <Stack spacing={0.5}>
                  {[
                    { label: 'My Orders',     icon: <ShoppingBag sx={{ fontSize: 18 }} />, color: VV_COLORS.violetMid, path: '/orders' },
                    { label: 'Wishlist',      icon: <Favorite sx={{ fontSize: 18 }} />,    color: VV_COLORS.coral,     path: '/wishlist' },
                    { label: 'My Reviews',    icon: <Star sx={{ fontSize: 18 }} />,         color: VV_COLORS.amber,     path: '/orders' },
                    { label: 'Support Center',icon: <HeadsetMic sx={{ fontSize: 18 }} />,  color: VV_COLORS.emerald,   path: '/orders' },
                  ].map(link => (
                    <Box
                      key={link.label}
                      onClick={() => navigate(link.path)}
                      sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        px: 1.5, py: 1.25, borderRadius: 2, cursor: 'pointer',
                        '&:hover': { bgcolor: alpha(link.color, 0.07) },
                        transition: 'background 0.15s',
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ color: link.color }}>{link.icon}</Box>
                        <Typography variant="body2" fontWeight={600}>{link.label}</Typography>
                      </Stack>
                      <KeyboardArrowRight sx={{ fontSize: 18, color: VV_COLORS.slate400 }} />
                    </Box>
                  ))}
                </Stack>
                <Divider sx={{ my: 1.5 }} />
                <Button
                  fullWidth
                  variant="text"
                  color="error"
                  size="small"
                  startIcon={<DeleteForever fontSize="small" />}
                  onClick={() => { setDeleteConfirmText(''); setDeleteOpen(true); }}
                  sx={{ '&:hover': { bgcolor: alpha(VV_COLORS.coral, 0.06) } }}
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* ════════════════════════════════════════════
          DIALOG: Delete Account
      ════════════════════════════════════════════ */}
      <Dialog
        open={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                bgcolor: alpha(VV_COLORS.coral, 0.12),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <DeleteForever sx={{ color: VV_COLORS.coral }} />
            </Box>
            <Box>
              <Typography fontWeight={700} color="error.main">Delete Account</Typography>
              <Typography variant="caption" color="text.secondary">This action cannot be undone</Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Box
            sx={{
              p: 2, mb: 2.5, borderRadius: 2,
              bgcolor: alpha(VV_COLORS.coral, 0.06),
              border: `1px solid ${alpha(VV_COLORS.coral, 0.25)}`,
              display: 'flex', gap: 1.5, alignItems: 'flex-start',
            }}
          >
            <WarningAmber sx={{ color: VV_COLORS.coral, fontSize: 20, mt: 0.1, flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary">
              Deleting your account will permanently remove all your <strong>orders, wishlist, reviews, and personal data</strong>.
              You will be logged out immediately and will not be able to recover this account.
            </Typography>
          </Box>

          <Stack spacing={1.5}>
            {[
              '✗  All order history will be deleted',
              '✗  Wishlist and saved items will be lost',
              '✗  Reviews and ratings will be removed',
              '✗  Any active referral credits will be forfeited',
            ].map(item => (
              <Typography key={item} variant="body2" color="error.main" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                {item}
              </Typography>
            ))}
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="body2" fontWeight={600} mb={1}>
            Type <strong style={{ color: VV_COLORS.coral }}>DELETE</strong> to confirm
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Type DELETE here"
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            error={deleteConfirmText.length > 0 && deleteConfirmText !== 'DELETE'}
            helperText={deleteConfirmText.length > 0 && deleteConfirmText !== 'DELETE' ? 'Type DELETE in uppercase' : ''}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': { borderColor: VV_COLORS.coral },
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteOpen(false)}
            disabled={deleting}
            sx={{ flex: 1 }}
          >
            Cancel, Keep Account
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteConfirmText !== 'DELETE' || deleting}
            startIcon={deleting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <DeleteForever />}
            onClick={handleDeleteAccount}
            sx={{ flex: 1 }}
          >
            {deleting ? 'Deleting...' : 'Delete Forever'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ── Local helper component ── */
function SectionHeader({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} mb={2} mt={1}>
      <Box
        sx={{
          width: 32, height: 32, borderRadius: 1.5,
          bgcolor: alpha(color, 0.1),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color,
        }}
      >
        {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 17 } })}
      </Box>
      <Typography variant="subtitle1" fontWeight={700} color={VV_COLORS.slate800}>
        {title}
      </Typography>
    </Stack>
  );
}
