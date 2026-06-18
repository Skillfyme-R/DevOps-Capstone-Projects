import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Box, IconButton, Avatar,
  Menu, MenuItem, Divider, Badge, ListItemIcon, ListItemText,
  Popover, List, ListItem, Tooltip,
} from '@mui/material';
import {
  Notifications, Menu as MenuIcon, Person, Logout,
  AccountBalance, Payment, TrendingUp, DarkMode, LightMode,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../index';
import { NEXUS_COLORS } from '../../styles/theme';

interface TopHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const DEMO_NOTIFICATIONS = [
  { id: 1, icon: <TrendingUp fontSize="small" sx={{ color: NEXUS_COLORS.emerald }} />,       text: 'Your savings earned $28.12 interest',   time: 'Today'  },
  { id: 2, icon: <Payment fontSize="small" sx={{ color: NEXUS_COLORS.redAlert }} />,         text: 'Rent Payment of $1,200 completed',       time: 'Jun 18' },
  { id: 3, icon: <AccountBalance fontSize="small" sx={{ color: NEXUS_COLORS.electricBlue }} />, text: 'Transfer of $1,000 successful',        time: 'Jun 18' },
];

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggle } = useThemeMode();

  const [avatarAnchor, setAvatarAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor,  setNotifAnchor]  = useState<null | HTMLElement>(null);

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton onClick={onToggleSidebar} edge="start" sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>

        <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '8px', background: `linear-gradient(135deg, ${NEXUS_COLORS.electricBlue}, #00C48C)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountBalance sx={{ fontSize: 16, color: '#fff' }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>NexusFinance</Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={0.5}>
          {/* Dark mode toggle */}
          <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton onClick={toggle}>
              {isDark ? <LightMode sx={{ color: NEXUS_COLORS.amber }} /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          {/* Notification Bell */}
          <IconButton onClick={e => setNotifAnchor(e.currentTarget)}>
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* Avatar */}
          <Avatar
            sx={{ width: 34, height: 34, bgcolor: NEXUS_COLORS.electricBlue, fontSize: 14, cursor: 'pointer', ml: 0.5 }}
            onClick={e => setAvatarAnchor(e.currentTarget)}>
            {user?.firstName?.[0] ?? 'U'}
          </Avatar>
        </Box>
      </Toolbar>

      {/* Notifications Popover */}
      <Popover open={Boolean(notifAnchor)} anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Box width={320}>
          <Box px={2} py={1.5} borderBottom="1px solid" sx={{ borderColor: 'divider' }}>
            <Typography fontWeight={700} fontSize={15}>Notifications</Typography>
          </Box>
          <List disablePadding>
            {DEMO_NOTIFICATIONS.map((n, i) => (
              <React.Fragment key={n.id}>
                <ListItem sx={{ px: 2, py: 1.5, gap: 1.5, alignItems: 'flex-start' }}>
                  <Box mt={0.3}>{n.icon}</Box>
                  <Box>
                    <Typography fontSize={13}>{n.text}</Typography>
                    <Typography fontSize={11} color="text.secondary">{n.time}</Typography>
                  </Box>
                </ListItem>
                {i < DEMO_NOTIFICATIONS.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Popover>

      {/* Avatar Dropdown */}
      <Menu open={Boolean(avatarAnchor)} anchorEl={avatarAnchor}
        onClose={() => setAvatarAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 1, minWidth: 200 } }}>
        <Box px={2} py={1.5}>
          <Typography fontWeight={700} fontSize={14}>{user?.firstName} {user?.lastName}</Typography>
          <Typography fontSize={12} color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAvatarAnchor(null); navigate('/profile'); }}>
          <ListItemIcon><Person fontSize="small" /></ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAvatarAnchor(null); logout(); }} sx={{ color: NEXUS_COLORS.redAlert }}>
          <ListItemIcon><Logout fontSize="small" sx={{ color: NEXUS_COLORS.redAlert }} /></ListItemIcon>
          <ListItemText>Sign Out</ListItemText>
        </MenuItem>
      </Menu>
    </AppBar>
  );
}
