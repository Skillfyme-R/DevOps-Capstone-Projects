import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Tooltip, IconButton, Avatar, Chip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useAuthContext } from '../../App';
import { MC_COLORS } from '../../styles/theme';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: DashboardIcon, path: '/dashboard', roles: ['patient', 'clinician', 'nurse', 'admin', 'superadmin'] },
  { label: 'Patients', icon: PeopleIcon, path: '/patients', roles: ['clinician', 'nurse', 'admin', 'superadmin'] },
  { label: 'Appointments', icon: CalendarMonthIcon, path: '/appointments', roles: ['patient', 'clinician', 'nurse', 'admin', 'superadmin'] },
  { label: 'Clinical', icon: LocalHospitalIcon, path: '/clinical', roles: ['clinician', 'nurse', 'admin', 'superadmin'] },
  { label: 'Analytics', icon: BarChartIcon, path: '/analytics', roles: ['clinician', 'admin', 'superadmin'] },
  { label: 'Admin', icon: AdminPanelSettingsIcon, path: '/admin', roles: ['admin', 'superadmin'] },
  { label: 'Profile', icon: PersonIcon, path: '/profile', roles: ['patient', 'clinician', 'nurse', 'admin', 'superadmin'] },
];

const ROLE_COLOR: Record<string, string> = {
  superadmin: MC_COLORS.status.critical,
  admin: MC_COLORS.status.warning,
  clinician: MC_COLORS.teal[500],
  nurse: MC_COLORS.emerald[500],
  patient: MC_COLORS.clinical.textGray,
};

interface Props { width: number; collapsed: boolean; mobileOpen: boolean; onMobileClose: () => void; onCollapse: () => void; }

function SidebarContent({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) {
  const { user } = useAuthContext();
  const location = useLocation();

  const visible = NAV_ITEMS.filter((n) => !user?.role || n.roles.includes(user.role));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 1 }}>
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, minHeight: 64 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, background: `linear-gradient(135deg, ${MC_COLORS.teal[500]}, ${MC_COLORS.emerald[500]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FavoriteIcon sx={{ color: 'white', fontSize: 20 }} />
        </Box>
        {!collapsed && (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="primary.main" lineHeight={1.2}>MediCore</Typography>
            <Typography variant="caption" color="text.secondary">Healthcare Platform</Typography>
          </Box>
        )}
        <IconButton size="small" onClick={onCollapse} sx={{ ml: 'auto', display: { xs: 'none', md: 'flex' } }}>
          {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Divider sx={{ mx: 1 }} />

      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {visible.map(({ label, icon: Icon, path }) => {
          const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
          return (
            <ListItem key={path} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={collapsed ? label : ''} placement="right" arrow>
                <ListItemButton
                  component={NavLink}
                  to={path}
                  selected={active}
                  sx={{
                    borderRadius: 2,
                    minHeight: 44,
                    px: collapsed ? 1.5 : 2,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    '&.Mui-selected': {
                      bgcolor: `${MC_COLORS.teal[500]}18`,
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                      '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 },
                    },
                    '&:hover': { bgcolor: `${MC_COLORS.teal[500]}10` },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: active ? 'primary.main' : 'text.secondary', mr: collapsed ? 0 : 1 }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: 1 }} />
      {user && (
        <Box sx={{ p: collapsed ? 1 : 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: MC_COLORS.teal[500], fontSize: '0.875rem', flexShrink: 0 }}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </Avatar>
          {!collapsed && (
            <Box overflow="hidden">
              <Typography variant="body2" fontWeight={600} noWrap>{user.firstName} {user.lastName}</Typography>
              <Chip label={user.role} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: ROLE_COLOR[user.role] + '20', color: ROLE_COLOR[user.role], mt: 0.25 }} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function Sidebar({ width, collapsed, mobileOpen, onMobileClose, onCollapse }: Props) {
  const drawerSx = { '& .MuiDrawer-paper': { width, transition: 'width 0.2s ease', overflowX: 'hidden', boxSizing: 'border-box' } };

  return (
    <>
      <Drawer variant="temporary" open={mobileOpen} onClose={onMobileClose} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, ...drawerSx }}>
        <SidebarContent collapsed={false} onCollapse={onMobileClose} />
      </Drawer>
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, ...drawerSx }}>
        <SidebarContent collapsed={collapsed} onCollapse={onCollapse} />
      </Drawer>
    </>
  );
}
