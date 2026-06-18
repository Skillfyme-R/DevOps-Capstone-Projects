/**
 * NexusFinance Sidebar Navigation
 *
 * Shows the NexusFinance logo, all main navigation links,
 * and the user's name at the bottom.
 *
 * Active route is highlighted in blue.
 * Hover state shows subtle background.
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, Box, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, Divider, Avatar, Chip,
} from '@mui/material';
import DashboardIcon      from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SwapHorizIcon      from '@mui/icons-material/SwapHoriz';
import CreditScoreIcon    from '@mui/icons-material/CreditScore';
import PaymentsIcon       from '@mui/icons-material/Payments';
import BarChartIcon       from '@mui/icons-material/BarChart';
import PersonIcon         from '@mui/icons-material/Person';
import LogoutIcon         from '@mui/icons-material/Logout';
import { NEXUS_COLORS }   from '../../styles/theme';
import { useAuth }        from '../../hooks/useAuth';

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: <DashboardIcon />,      path: '/dashboard' },
  { label: 'Accounts',     icon: <AccountBalanceIcon />,  path: '/accounts' },
  { label: 'Transactions', icon: <SwapHorizIcon />,       path: '/transactions' },
  { label: 'Loans',        icon: <CreditScoreIcon />,     path: '/loans' },
  { label: 'Payments',     icon: <PaymentsIcon />,        path: '/payments' },
  { label: 'Analytics',    icon: <BarChartIcon />,        path: '/analytics' },
];

interface SidebarProps {
  width:    number;
  open:     boolean;
  onClose:  () => void;
}

export function Sidebar({ width, open, onClose }: SidebarProps) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          background: `linear-gradient(180deg, ${NEXUS_COLORS.navyDark} 0%, ${NEXUS_COLORS.navyMid} 100%)`,
          color: '#fff',
          border: 'none',
        },
      }}
    >
      {/* ── Brand Logo ─────────────────────────────────────────────────── */}
      <Box px={2.5} py={3} display="flex" alignItems="center" gap={1.5}>
        {/* Logo: NX in a blue circle */}
        <Box
          width={36} height={36} borderRadius={2}
          bgcolor={NEXUS_COLORS.electricBlue}
          display="flex" alignItems="center" justifyContent="center"
        >
          <Typography fontWeight={800} fontSize={14} color="#fff">NX</Typography>
        </Box>
        <Box>
          <Typography fontWeight={700} fontSize={16} color="#fff" lineHeight={1.1}>
            NexusFinance
          </Typography>
          <Typography fontSize={11} color="rgba(255,255,255,0.5)">
            Digital Banking
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* ── Navigation Items ────────────────────────────────────────────── */}
      <Box px={1.5} py={2} flexGrow={1}>
        <Typography
          variant="overline"
          sx={{ color: 'rgba(255,255,255,0.4)', px: 1.5, mb: 1, display: 'block' }}
        >
          Main Menu
        </Typography>
        <List disablePadding>
          {NAV_ITEMS.map(item => (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              selected={isActive(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1,
                px: 1.5,
                color: isActive(item.path) ? '#fff' : 'rgba(255,255,255,0.65)',
                bgcolor: isActive(item.path) ? 'rgba(27,110,243,0.35)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                '&.Mui-selected': { bgcolor: 'rgba(27,110,243,0.35)' },
                '&.Mui-selected:hover': { bgcolor: 'rgba(27,110,243,0.45)' },
                transition: 'all 0.15s ease',
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: isActive(item.path) ? 600 : 400 }}
              />
              {/* Active indicator dot */}
              {isActive(item.path) && (
                <Box width={6} height={6} borderRadius="50%" bgcolor={NEXUS_COLORS.electricBlue} />
              )}
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* ── User Profile Footer ─────────────────────────────────────────── */}
      <Box px={2} py={2}>
        <ListItemButton
          onClick={() => navigate('/profile')}
          sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: NEXUS_COLORS.electricBlue, fontSize: 12 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={`${user?.firstName} ${user?.lastName}`}
            secondary={user?.email}
            primaryTypographyProps={{ fontSize: 13, fontWeight: 600, color: '#fff' }}
            secondaryTypographyProps={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}
          />
        </ListItemButton>
        <ListItemButton
          onClick={logout}
          sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.5)', mt: 0.5, '&:hover': { color: '#fff' } }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: 13 }} />
        </ListItemButton>
      </Box>
    </Drawer>
  );
}
