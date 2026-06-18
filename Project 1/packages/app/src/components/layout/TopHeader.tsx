import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Box, IconButton, Avatar,
  Menu, MenuItem, Divider, Badge, ListItemIcon, ListItemText,
  Popover, List, ListItem,
} from '@mui/material';
import {
  Notifications, Menu as MenuIcon, Person, Logout,
  AccountBalance, Payment, TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { NEXUS_COLORS } from '../../styles/theme';

interface TopHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const DEMO_NOTIFICATIONS = [
  { id: 1, icon: <TrendingUp fontSize="small" sx={{ color: NEXUS_COLORS.emerald }} />, text: 'Your savings earned $28.12 interest', time: 'Today' },
  { id: 2, icon: <Payment fontSize="small" sx={{ color: NEXUS_COLORS.redAlert }} />, text: 'Rent Payment of $1,200 completed', time: 'Jun 18' },
  { id: 3, icon: <AccountBalance fontSize="small" sx={{ color: NEXUS_COLORS.electricBlue }} />, text: 'Transfer of $1,000 successful', time: 'Jun 18' },
];

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [avatarAnchor, setAvatarAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  return (
    <AppBar position="fixed"
      sx={{
        background: '#fff',
        color: NEXUS_COLORS.navyDark,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}>
      <Toolbar>
        <IconButton onClick={onToggleSidebar} edge="start" sx={{ mr: 2, color: NEXUS_COLORS.navyDark }}>
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" fontWeight={700} color={NEXUS_COLORS.navyDark} sx={{ flexGrow: 1 }}>
          NexusFinance
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          {/* Notification Bell */}
          <IconButton sx={{ color: NEXUS_COLORS.navyDark }}
            onClick={e => setNotifAnchor(e.currentTarget)}>
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* Avatar Menu */}
          <Avatar
            sx={{ width: 34, height: 34, bgcolor: NEXUS_COLORS.electricBlue, fontSize: 14, cursor: 'pointer' }}
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
          <Box px={2} py={1.5} borderBottom="1px solid #eee">
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

      {/* Avatar Dropdown Menu */}
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
        <MenuItem onClick={() => { setAvatarAnchor(null); logout(); }}
          sx={{ color: NEXUS_COLORS.redAlert }}>
          <ListItemIcon><Logout fontSize="small" sx={{ color: NEXUS_COLORS.redAlert }} /></ListItemIcon>
          <ListItemText>Sign Out</ListItemText>
        </MenuItem>
      </Menu>
    </AppBar>
  );
}
