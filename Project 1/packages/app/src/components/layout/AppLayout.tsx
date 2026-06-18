import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

const SIDEBAR_WIDTH = 240;

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Box display="flex" minHeight="100vh" bgcolor="background.default">
      <Sidebar
        width={SIDEBAR_WIDTH}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Box
        component="main"
        flexGrow={1}
        display="flex"
        flexDirection="column"
        sx={{
          marginLeft: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0,
          transition: 'margin 0.2s ease',
          minWidth: 0,
          mt: '64px',
        }}
      >
        <TopHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />
        <Box flexGrow={1} overflow="auto">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
