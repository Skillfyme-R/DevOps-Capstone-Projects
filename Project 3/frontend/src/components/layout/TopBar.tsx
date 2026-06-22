import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Tooltip, Avatar, Menu, MenuItem, Divider, Badge, List, ListItem, ListItemText, ListItemAvatar, Paper, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuthContext } from '../../App';
import { useThemeMode } from '../../index';
import { appointmentsClient } from '../../utils/apiClient';
import { MC_COLORS } from '../../styles/theme';

interface RawAppointment {
  id: string;
  patient_id: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_mrn?: string;
  status: string;
  scheduled_at: string;
  type: string;
  chief_complaint?: string;
}

interface Notification {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  body: string;
  time: string;
  path: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(Math.abs(diff) / 60000);
  if (diff < 0) return `in ${mins} min`;
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function appointmentTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildNotifications(appointments: RawAppointment[]): Notification[] {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const ago2h = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const notifs: Notification[] = [];

  for (const a of appointments) {
    const scheduled = new Date(a.scheduled_at);
    const patientName = a.patient_first_name && a.patient_last_name
      ? `${a.patient_first_name} ${a.patient_last_name}`
      : 'Patient';
    const patientPath = `/patients/${a.patient_id}`;
    const typeLabel = appointmentTypeLabel(a.type);
    const complaint = a.chief_complaint ? ` — ${a.chief_complaint}` : '';

    // Upcoming in next 24h
    if (['confirmed', 'scheduled'].includes(a.status) && scheduled > now && scheduled <= in24h) {
      const minsUntil = Math.round((scheduled.getTime() - now.getTime()) / 60000);
      notifs.push({
        id: `upcoming-${a.id}`,
        icon: EventIcon,
        color: MC_COLORS.teal[500],
        title: `${patientName} — in ${minsUntil < 60 ? `${minsUntil} min` : `${Math.floor(minsUntil / 60)}h`}`,
        body: typeLabel + complaint,
        time: relativeTime(a.scheduled_at),
        path: patientPath,
      });
    }

    // Overdue — confirmed but past scheduled time
    if (['confirmed', 'scheduled'].includes(a.status) && scheduled <= now && scheduled >= ago2h) {
      notifs.push({
        id: `overdue-${a.id}`,
        icon: EventIcon,
        color: MC_COLORS.status.warning,
        title: `${patientName} — overdue`,
        body: typeLabel + complaint + ' · awaiting check-in',
        time: relativeTime(a.scheduled_at),
        path: patientPath,
      });
    }

    // Checked in — patient is waiting
    if (a.status === 'checked_in') {
      notifs.push({
        id: `checkin-${a.id}`,
        icon: HowToRegIcon,
        color: MC_COLORS.status.stable,
        title: `${patientName} checked in`,
        body: typeLabel + complaint + ' · waiting to be seen',
        time: relativeTime(a.scheduled_at),
        path: patientPath,
      });
    }

    // In progress
    if (a.status === 'in_progress') {
      notifs.push({
        id: `inprog-${a.id}`,
        icon: HowToRegIcon,
        color: MC_COLORS.teal[500],
        title: `${patientName} — in consultation`,
        body: typeLabel + complaint,
        time: relativeTime(a.scheduled_at),
        path: patientPath,
      });
    }

    // Completed recently — prompt to write report
    if (a.status === 'completed' && scheduled >= ago2h) {
      notifs.push({
        id: `completed-${a.id}`,
        icon: EventIcon,
        color: MC_COLORS.emerald[500],
        title: `${patientName} — visit completed`,
        body: typeLabel + complaint + ' · write visit report',
        time: relativeTime(a.scheduled_at),
        path: patientPath,
      });
    }

    // No show
    if (a.status === 'no_show') {
      notifs.push({
        id: `noshow-${a.id}`,
        icon: PersonOffIcon,
        color: MC_COLORS.status.critical,
        title: `${patientName} — no-show`,
        body: typeLabel + ' · did not arrive',
        time: relativeTime(a.scheduled_at),
        path: patientPath,
      });
    }
  }

  const order = (n: Notification) =>
    n.id.startsWith('overdue') ? 0 :
    n.id.startsWith('checkin') ? 1 :
    n.id.startsWith('inprog') ? 2 :
    n.id.startsWith('upcoming') ? 3 :
    n.id.startsWith('completed') ? 4 : 5;

  notifs.sort((a, b) => order(a) - order(b));
  return notifs.slice(0, 10);
}

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuthContext();
  const { isDark, toggle } = useThemeMode();
  const navigate = useNavigate();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = React.useState<null | HTMLElement>(null);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());

  const isStaff = user && !['patient'].includes(user.role);

  // Fetch real appointments: upcoming 24h + recent checked_in/no_show
  const now = new Date();
  const from = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(); // 8h back
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();  // 24h forward

  const { data: apptData, isLoading: notifLoading } = useQuery(
    ['topbar-notifications', user?.id],
    () => appointmentsClient.get('/appointments', { params: { from, to, limit: 50 } }).then((r: { data: any }) => r.data),
    {
      enabled: !!user,
      refetchInterval: 60000, // refresh every minute
      staleTime: 30000,
      retry: false,
    }
  );

  const notifications = React.useMemo(
    () => buildNotifications(apptData?.appointments || []),
    [apptData]
  );

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function openNotif(e: React.MouseEvent<HTMLButtonElement>) {
    setNotifAnchor(e.currentTarget);
  }

  function closeNotif() {
    setNotifAnchor(null);
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function handleNotifClick(n: Notification) {
    setReadIds((prev) => new Set([...prev, n.id]));
    setNotifAnchor(null);
    navigate(n.path);
  }

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ gap: 1, minHeight: 64 }}>
        <IconButton edge="start" onClick={onMenuClick} sx={{ color: 'text.secondary' }}>
          <MenuIcon />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            MediCore Healthcare Platform
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggle} sx={{ color: 'text.secondary' }}>
              {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton onClick={openNotif} sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={notifLoading ? undefined : unreadCount} color="error">
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications Panel */}
          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={closeNotif}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: { width: 340, mt: 0.5, maxHeight: 440 } }}
          >
            <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
              {unreadCount > 0 && (
                <Typography variant="caption" color="text.secondary">{unreadCount} unread</Typography>
              )}
            </Box>
            <Divider />
            <Paper elevation={0} sx={{ maxHeight: 340, overflow: 'auto' }}>
              {notifLoading ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : notifications.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <NotificationsIcon sx={{ color: 'text.disabled', fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {isStaff ? 'No upcoming appointments or alerts' : 'No notifications'}
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {notifications.map((n, i) => {
                    const isUnread = !readIds.has(n.id);
                    return (
                      <React.Fragment key={n.id}>
                        <ListItem
                          alignItems="flex-start"
                          sx={{ py: 1.5, px: 2, bgcolor: isUnread ? `${n.color}08` : 'transparent', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                          onClick={() => handleNotifClick(n)}
                        >
                          <ListItemAvatar sx={{ minWidth: 40, mt: 0.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: `${n.color}18` }}>
                              <n.icon sx={{ color: n.color, fontSize: 18 }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={isUnread ? 700 : 400}>{n.title}</Typography>
                            }
                            secondary={
                              <>
                                <Typography variant="caption" color="text.secondary" display="block">{n.body}</Typography>
                                <Typography variant="caption" color="text.disabled">{n.time}</Typography>
                              </>
                            }
                          />
                        </ListItem>
                        {i < notifications.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </Paper>
          </Menu>

          {user && (
            <>
              <Tooltip title={`${user.firstName} ${user.lastName}`}>
                <IconButton onClick={(e: React.MouseEvent<HTMLButtonElement>) => setAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: MC_COLORS.teal[500], fontSize: '0.8rem' }}>
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </Avatar>
                </IconButton>
              </Tooltip>

              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{ sx: { minWidth: 200, mt: 0.5 } }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>{user.firstName} {user.lastName}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => { navigate('/profile'); setAnchor(null); }}>
                  <PersonIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Profile
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { logout(); setAnchor(null); }} sx={{ color: 'error.main' }}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} /> Sign out
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
