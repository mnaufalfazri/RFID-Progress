import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  AppBar, Toolbar, Typography, Box, Drawer,
  List, ListItem, ListItemIcon, ListItemText,
  Divider, IconButton, Avatar, Tooltip, Menu,
  MenuItem, useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Person,
  Assessment,
  School,
  QrCodeScanner,
  Logout,
  PersonAdd,
  DevicesOther
} from '@mui/icons-material';
import { styled, useTheme } from '@mui/material/styles';
import { isAuthenticated } from '../utils/auth';
import toast from 'react-hot-toast';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    }),
    marginLeft: 0,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen
      }),
      marginLeft: drawerWidth
    })
  })
);

export default function Layout({ children }) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = isAuthenticated();
    if (auth) {
      setUser(auth.user);
    }
  }, []);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/',
      roles: ['admin', 'teacher', 'staff']
    },
    {
      text: 'Kehadiran',
      icon: <QrCodeScanner />,
      path: '/attendance',
      roles: ['admin', 'teacher', 'staff']
    },
    {
      text: 'Siswa',
      icon: <Person />,
      path: '/students',
      roles: ['admin', 'teacher', 'staff']
    },
    {
      text: 'Perangkat',
      icon: <DevicesOther />,
      path: '/devices',
      roles: ['admin', 'teacher', 'staff']
    },
    {
      text: 'Laporan',
      icon: <Assessment />,
      path: '/reports',
      roles: ['admin', 'teacher', 'staff']
    },
    {
      text: 'Registrasi Siswa',
      icon: <PersonAdd />,
      path: '/register-student',
      roles: ['admin', 'teacher']
    }
  ];

  if (!user) return <Box>{children}</Box>;

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          backgroundColor: '#fff',
          color: '#111',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Sistem Absensi Sekolah
          </Typography>
          <Tooltip title="Account settings">
            <IconButton onClick={handleMenuOpen} color="inherit">
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 4,
              sx: {
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1
                },
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))'
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem>
              <ListItemIcon>
                <School fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={user?.name}
                secondary={user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
              />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Keluar
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          }
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              item.roles.includes(user.role) && (
                <ListItem
                  button
                  key={item.text}
                  onClick={() => {
                    router.push(item.path);
                    setDrawerOpen(false);
                  }}
                  selected={router.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              )
            ))}
          </List>
        </Box>
      </Drawer>

      <Main open={drawerOpen}>
        <Toolbar />
        {children}
      </Main>
    </Box>
  );
}
