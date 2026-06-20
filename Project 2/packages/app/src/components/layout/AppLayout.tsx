import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Badge, Avatar, Tooltip,
  Divider, useMediaQuery, useTheme, Stack, alpha, Popover, Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ShoppingCart as CartIcon,
  Inventory2 as CatalogIcon,
  LocalShipping as OrdersIcon,
  Storefront as VendorIcon,
  BarChart as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
  LocalOffer as OfferIcon,
  NewReleases as NewIcon,
  Favorite as WishlistIcon,
  Person as ProfileIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  Logout as LogoutIcon,
  NotificationsNone as BellIcon,
} from '@mui/icons-material';
import { VV_COLORS } from '../../styles/theme';
import { useThemeMode } from '../../index';
import { useCartStore } from '../../hooks/useCart';

const DRAWER_WIDTH = 256;

const navItems = [
  { label: 'Dashboard',  path: '/dashboard',     icon: <DashboardIcon />, section: 'main' },
  { label: 'Catalog',    path: '/catalog',        icon: <CatalogIcon />,  section: 'main' },
  { label: 'Cart',       path: '/cart',           icon: <CartIcon />,     section: 'main', badge: true },
  { label: 'Orders',     path: '/orders',         icon: <OrdersIcon />,   section: 'main' },
  { label: 'Vendors',    path: '/vendors',        icon: <VendorIcon />,   section: 'main' },
  { label: 'Wishlist',   path: '/wishlist',       icon: <WishlistIcon />, section: 'shop' },
  { label: 'Analytics',  path: '/analytics',      icon: <AnalyticsIcon />,section: 'shop' },
  { label: 'Profile',    path: '/profile',        icon: <ProfileIcon />,  section: 'shop' },
];

const NOTIFICATIONS = [
  { id: 1, title: 'Order Delivered!',   body: 'Your order VV-10421 has been delivered.',          time: '2 min ago',  color: VV_COLORS.emerald,   icon: <CheckCircleIcon fontSize="small" />, read: false, path: '/orders/VV-10421' },
  { id: 2, title: 'Price Drop Alert',   body: 'Wireless Headphones dropped to ₹10,999 — 12% off!', time: '1 hr ago', color: VV_COLORS.coral,      icon: <OfferIcon fontSize="small" />,       read: false, path: '/catalog' },
  { id: 3, title: 'New Vendor Joined',  body: 'TechNova Store is now live with 120+ products.',    time: '3 hr ago',  color: VV_COLORS.violetMid, icon: <NewIcon fontSize="small" />,         read: false, path: '/vendors' },
  { id: 4, title: 'Wishlist Item Back', body: 'Yoga Mat Non-Slip is back in stock!',               time: 'Yesterday', color: VV_COLORS.amber,     icon: <OfferIcon fontSize="small" />,       read: true,  path: '/wishlist' },
];

export function AppLayout() {
  const theme       = useTheme();
  const isMobile    = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const { isDark, toggle } = useThemeMode();
  const navigate    = useNavigate();
  const location    = useLocation();
  const cartCount   = useCartStore(s => s.itemCount());
  const user        = JSON.parse(localStorage.getItem('vv-user') ?? '{}');

  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    localStorage.removeItem('vv-token');
    localStorage.removeItem('vv-user');
    navigate('/login');
  };

  const mainNav  = navItems.filter(n => n.section === 'main');
  const shopNav  = navItems.filter(n => n.section === 'shop');

  const NavSection = ({ items, label }: { items: typeof navItems; label: string }) => (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" sx={{
        px: 2, py: 0.5, display: 'block', fontWeight: 700,
        color: 'text.disabled', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10,
      }}>
        {label}
      </Typography>
      {items.map(({ label: lbl, path, icon, badge }) => {
        const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
        return (
          <ListItem key={path} disablePadding sx={{ px: 1, mb: 0.3 }}>
            <ListItemButton
              onClick={() => { navigate(path); if (isMobile) setOpen(false); }}
              sx={{
                borderRadius: '10px',
                py: 0.9,
                px: 1.5,
                position: 'relative',
                ...(active && {
                  background: `linear-gradient(135deg, ${alpha(VV_COLORS.violetMid, 0.15)}, ${alpha(VV_COLORS.violetLight, 0.08)})`,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0, top: '20%', bottom: '20%',
                    width: 3, borderRadius: '0 3px 3px 0',
                    bgcolor: VV_COLORS.violetMid,
                  },
                }),
                '&:hover': {
                  background: alpha(VV_COLORS.violetMid, 0.07),
                },
              }}
            >
              <ListItemIcon sx={{
                minWidth: 38,
                color: active ? VV_COLORS.violetMid : 'text.secondary',
              }}>
                {badge
                  ? <Badge badgeContent={cartCount} color="secondary" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}>{icon}</Badge>
                  : icon
                }
              </ListItemIcon>
              <ListItemText
                primary={lbl}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? VV_COLORS.violetMid : 'text.primary',
                }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </Box>
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Brand */}
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.violetDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(VV_COLORS.violetMid, 0.4)}`,
          }}>
            <VendorIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{
              background: `linear-gradient(135deg, ${VV_COLORS.violetMid}, ${VV_COLORS.coral})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}>
              VendorVault
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>
              MARKETPLACE
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ mx: 2, opacity: 0.5 }} />

      {/* Nav */}
      <List sx={{ flex: 1, py: 1.5, overflowY: 'auto' }}>
        <NavSection items={mainNav} label="Main" />
        <NavSection items={shopNav} label="Account" />
      </List>

      <Divider sx={{ mx: 2, opacity: 0.5 }} />

      {/* User */}
      <Box sx={{ p: 2 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? alpha(VV_COLORS.violetMid, 0.1) : alpha(VV_COLORS.violetMid, 0.05),
          border: `1px solid ${alpha(VV_COLORS.violetMid, 0.12)}`,
        }}>
          <Avatar sx={{
            bgcolor: VV_COLORS.violetMid, width: 34, height: 34, fontSize: 13, fontWeight: 700,
            boxShadow: `0 0 0 2px ${alpha(VV_COLORS.violetMid, 0.25)}`,
          }}>
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.3 }}>
              {user?.name ?? 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ textTransform: 'capitalize', fontSize: 11 }}>
              {user?.role ?? 'customer'}
            </Typography>
          </Box>
          <Tooltip title="Sign out">
            <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary', '&:hover': { color: VV_COLORS.coral } }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: isDark ? alpha('#090714', 0.95) : alpha('#FFFFFF', 0.92),
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${isDark ? alpha(VV_COLORS.violetMid, 0.15) : alpha(VV_COLORS.slate200, 0.8)}`,
          color: 'text.primary',
          width: { md: open ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { md: open ? `${DRAWER_WIDTH}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: 220,
          }),
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important', px: { xs: 2, md: 3 } }}>
          <IconButton edge="start" onClick={() => setOpen(p => !p)} sx={{ mr: 2, color: 'text.secondary' }}>
            <MenuIcon />
          </IconButton>

          {/* Page title from path */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, color: 'text.primary' }}>
            {navItems.find(n => location.pathname.startsWith(n.path))?.label ?? 'VendorVault'}
          </Typography>

          <Stack direction="row" spacing={0.5} alignItems="center">
            {/* ── Notifications Bell ── */}
            <Tooltip title="Notifications">
              <IconButton
                onClick={e => {
                  setNotifAnchor(e.currentTarget);
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                sx={{ color: 'text.secondary' }}
              >
                <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}>
                  <BellIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* ── Notifications Popover ── */}
            <Popover
              open={Boolean(notifAnchor)}
              anchorEl={notifAnchor}
              onClose={() => setNotifAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  width: 360,
                  borderRadius: 3,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                  border: `1px solid ${alpha(VV_COLORS.violetMid, 0.12)}`,
                  overflow: 'hidden',
                  mt: 1,
                },
              }}
            >
              {/* Header */}
              <Box sx={{
                px: 2.5, py: 2,
                background: `linear-gradient(135deg, ${VV_COLORS.violetDeep}, ${VV_COLORS.violetMid})`,
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BellIcon sx={{ color: '#fff', fontSize: 18 }} />
                    <Typography fontWeight={700} color="#fff">Notifications</Typography>
                  </Stack>
                  <Chip
                    label={`${notifications.length} total`}
                    size="small"
                    sx={{ bgcolor: alpha('#fff', 0.2), color: '#fff', fontWeight: 700, fontSize: 10, height: 20 }}
                  />
                </Stack>
              </Box>

              {/* List */}
              <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.map((n, idx) => (
                  <Box key={n.id}>
                    <Box
                      onClick={() => { setNotifAnchor(null); navigate(n.path); }}
                      sx={{
                        px: 2.5, py: 2,
                        cursor: 'pointer',
                        bgcolor: n.read ? 'transparent' : alpha(n.color, 0.04),
                        borderLeft: n.read ? '3px solid transparent' : `3px solid ${n.color}`,
                        transition: 'background 0.15s',
                        '&:hover': { bgcolor: alpha(n.color, 0.08) },
                      }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box sx={{
                          width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
                          bgcolor: alpha(n.color, 0.12),
                          color: n.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {n.icon}
                        </Box>
                        <Box flex={1} minWidth={0}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                              {n.title}
                            </Typography>
                            {!n.read && (
                              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: n.color, flexShrink: 0 }} />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, display: 'block', mt: 0.25 }}>
                            {n.body}
                          </Typography>
                          <Typography variant="caption" sx={{ color: alpha(n.color, 0.8), fontWeight: 600, fontSize: 10, mt: 0.5, display: 'block' }}>
                            {n.time}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                    {idx < notifications.length - 1 && <Divider sx={{ opacity: 0.4 }} />}
                  </Box>
                ))}
              </Box>

              {/* Footer */}
              <Box sx={{
                px: 2.5, py: 1.5,
                borderTop: `1px solid ${alpha(VV_COLORS.slate400, 0.15)}`,
                bgcolor: alpha(VV_COLORS.slate50, 0.6),
                textAlign: 'center',
              }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ color: VV_COLORS.violetMid, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  onClick={() => setNotifAnchor(null)}
                >
                  Mark all as read · View all notifications
                </Typography>
              </Box>
            </Popover>
            <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
              <IconButton onClick={toggle} sx={{ color: 'text.secondary' }}>
                {isDark ? <LightIcon fontSize="small" /> : <DarkIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Avatar
              onClick={() => navigate('/profile')}
              sx={{
                bgcolor: VV_COLORS.violetMid, width: 32, height: 32, fontSize: 13,
                cursor: 'pointer', ml: 1, fontWeight: 700,
                boxShadow: `0 0 0 2px ${alpha(VV_COLORS.violetMid, 0.3)}`,
              }}
            >
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: `1px solid ${isDark ? alpha(VV_COLORS.violetMid, 0.12) : VV_COLORS.slate200}`,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: '60px',
          minHeight: '100vh',
          bgcolor: 'background.default',
          transition: theme.transitions.create('margin', { duration: 220 }),
        }}
      >
        <Box sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 1400, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
