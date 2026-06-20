import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Tooltip, Avatar, Menu, MenuItem, Divider, Badge } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../App';
import { useThemeMode } from '../../index';
import { MC_COLORS } from '../../styles/theme';

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuthContext();
  const { isDark, toggle } = useThemeMode();
  const navigate = useNavigate();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);

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
            <IconButton sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={3} color="error">
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

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
