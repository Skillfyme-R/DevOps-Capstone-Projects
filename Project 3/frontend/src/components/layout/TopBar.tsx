import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Tooltip, Avatar, Menu, MenuItem, Divider, Badge, List, ListItem, ListItemText, ListItemAvatar, Paper } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../App';
import { useThemeMode } from '../../index';
import { MC_COLORS } from '../../styles/theme';

const NOTIFICATIONS = [
  { id: 1, icon: EventIcon, color: MC_COLORS.teal[500], title: 'Appointment in 30 min', body: 'John Doe — Consultation at 2:00 PM', time: '25 min' },
  { id: 2, icon: WarningAmberIcon, color: MC_COLORS.status.warning, title: 'Lab result ready', body: 'CBC results for Maria Garcia', time: '1h' },
  { id: 3, icon: CheckCircleOutlineIcon, color: MC_COLORS.status.stable, title: 'Patient checked in', body: 'Robert Brown has checked in', time: '2h' },
  { id: 4, icon: InfoOutlinedIcon, color: MC_COLORS.status.info, title: 'System update', body: 'MediCore v1.2.0 deployed successfully', time: '3h' },
];

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuthContext();
  const { isDark, toggle } = useThemeMode();
  const navigate = useNavigate();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = React.useState<null | HTMLElement>(null);
  const [readIds, setReadIds] = React.useState<Set<number>>(new Set());

  const unreadCount = NOTIFICATIONS.filter((n) => !readIds.has(n.id)).length;

  function openNotif(e: React.MouseEvent<HTMLButtonElement>) {
    setNotifAnchor(e.currentTarget);
  }

  function closeNotif() {
    setNotifAnchor(null);
    setReadIds(new Set(NOTIFICATIONS.map((n) => n.id)));
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
              <Badge badgeContent={unreadCount} color="error">
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
            PaperProps={{ sx: { width: 340, mt: 0.5, maxHeight: 420 } }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
              {unreadCount > 0 && (
                <Typography variant="caption" color="text.secondary">{unreadCount} unread</Typography>
              )}
            </Box>
            <Divider />
            <Paper elevation={0} sx={{ maxHeight: 320, overflow: 'auto' }}>
              <List disablePadding>
                {NOTIFICATIONS.map((n, i) => {
                  const isUnread = !readIds.has(n.id);
                  return (
                    <React.Fragment key={n.id}>
                      <ListItem
                        alignItems="flex-start"
                        sx={{ py: 1.5, px: 2, bgcolor: isUnread ? `${n.color}08` : 'transparent', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => setReadIds((prev) => new Set([...prev, n.id]))}
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
                              <Typography variant="caption" color="text.disabled">{n.time} ago</Typography>
                            </>
                          }
                        />
                      </ListItem>
                      {i < NOTIFICATIONS.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  );
                })}
              </List>
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
