import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SettingsIcon from '@mui/icons-material/Settings';

const Layout = () => {
  const location = useLocation();

  // A small helper to check if the current path starts with a given link
  // (You can tweak this if you want exact matches or sub-route matches.)
  const isActive = (path) => location.pathname === path;

  return (
    <Box sx={{ minHeight: '80vh', bgcolor: '#fafafa', userSelect: 'none' }}>
      {/* Top AppBar with gradient background */}
      <AppBar
        position="static"
        sx={{
          background: 'linear-gradient(90deg, #673ab7 0%, #512da8 100%)',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          {/* Brand / Title */}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Task Manager
          </Typography>

          {/* Navigation Buttons with icons */}
          <Button
            component={Link}
            to="/"
            startIcon={<HomeIcon />}
            sx={{
              fontWeight: 600,
              // highlight if active
              backgroundColor: isActive('/') ? 'rgba(255,255,255,0.2)' : 'inherit',
            }}
            color="inherit"
          >
            Home
          </Button>

          <Button
            component={Link}
            to="/employees"
            startIcon={<PeopleIcon />}
            sx={{
              fontWeight: 600,
              backgroundColor: isActive('/employees') ? 'rgba(255,255,255,0.2)' : 'inherit',
            }}
            color="inherit"
          >
            Employees
          </Button>

          <Button
            component={Link}
            to="/tasks"
            startIcon={<ListAltIcon />}
            sx={{
              fontWeight: 600,
              backgroundColor: isActive('/tasks') ? 'rgba(255,255,255,0.2)' : 'inherit',
            }}
            color="inherit"
          >
            Tasks
          </Button>

          <Button
            component={Link}
            to="/settings"
            startIcon={<SettingsIcon />}
            sx={{
              fontWeight: 600,
              backgroundColor: isActive('/settings') ? 'rgba(255,255,255,0.2)' : 'inherit',
            }}
            color="inherit"
          >
            Settings
          </Button>
        </Toolbar>
      </AppBar>

      {/* Render whichever page is active */}
      <Outlet />
    </Box>
  );
};

export default Layout;
