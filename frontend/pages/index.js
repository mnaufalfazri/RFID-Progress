import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container, Typography, Box, Grid, Paper, Divider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress
} from '@mui/material';
import {
  QrCodeScanner,
  Person,
  Assessment,
  DevicesOther,
  PersonAdd,
  AddToQueue,
  MenuBook,
  MeetingRoom,
  School,
  Schedule,
} from '@mui/icons-material';
import axios from 'axios';
import { isAuthenticated } from '../utils/auth';
import Layout from '../components/Layout';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
    } else {
      // Check if user has a valid role
      if (!['admin', 'teacher', 'staff', 'student'].includes(auth.user.role)) {
        router.push('/login');
        return;
      }
      
      setUser(auth.user);
      setLoading(false);
      fetchDevices(auth.token);
    }
  }, [router]);

  const fetchDevices = async (token) => {
    try {
      setDevicesLoading(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/devices`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setDevices(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // Cards Data based on user role
  const getCardsForRole = (role) => {
    const baseCards = [
      {
        title: 'Kehadiran',
        description: "Melihat Absensi Siswa Saat Ini.",
        icon: <QrCodeScanner sx={{ fontSize: 60 }} />,
        link: '/attendance',
        bgcolor: 'primary.light',
        roles: ['admin', 'teacher', 'staff', 'student']
      },
      {
        title: 'Jadwal',
        description: "Melihat Jadwal Pelajaran.",
        icon: <Schedule sx={{ fontSize: 60 }} />,
        link: '/schedules',
        bgcolor: 'secondary.light',
        roles: ['admin', 'teacher', 'staff', 'student']
      }
    ];

    const adminTeacherStaffCards = [
      {
        title: 'Laporan',
        description: "Melihat dan Mencetak Laporan Kehadiran.",
        icon: <Assessment sx={{ fontSize: 60 }} />,
        link: '/reports',
        bgcolor: 'warning.light',
        roles: ['admin', 'teacher', 'staff']
      }
    ];

    const adminStaffCards = [
      {
        title: 'Perangkat',
        description: "Mengatur dan Mengelola Perangkat RFID.",
        icon: <DevicesOther sx={{ fontSize: 60}} />,
        link: '/devices',
        bgcolor: 'error.light',
        roles: ['admin', 'staff']
      }
    ];

    const adminCards = [
      {
        title: 'Registrasi Perangkat',
        description: "Menambahkan Perangkat RFID Untuk Absensi.",
        icon: <AddToQueue sx={{ fontSize: 60}} />,
        link: '/register-device',
        bgcolor: 'error.light',
        roles: ['admin']
      },
      {
        title: 'Ruangan',
        description: "Mengelola Data Ruangan Kelas.",
        icon: <MeetingRoom sx={{ fontSize: 60}} />,
        link: '/rooms',
        bgcolor: 'secondary.light',
        roles: ['admin']
      },
      {
        title: 'Guru',
        description: "Mengelola Data Guru dan Pengajar.",
        icon: <School sx={{ fontSize: 60}} />,
        link: '/teachers',
        bgcolor: 'primary.dark',
        roles: ['admin']
      }
    ];

    const adminTeacherCards = [
      {
        title: 'Siswa',
        description: "Mengelola Data Siswa.",
        icon: <Person sx={{ fontSize: 60}} />,
        link: '/students',
        bgcolor: 'success.light',
        roles: ['admin', 'teacher']
      },
      {
        title: 'Mata Pelajaran',
        description: "Mengelola Mata Pelajaran.",
        icon: <MenuBook sx={{ fontSize: 60}} />,
        link: '/subjects',
        bgcolor: 'info.light',
        roles: ['admin', 'teacher']
      }
    ];

    const allCards = [...baseCards, ...adminTeacherStaffCards, ...adminStaffCards, ...adminCards, ...adminTeacherCards];
    return allCards.filter(card => card.roles.includes(role));
  };

  const cards = getCardsForRole(user?.role || 'student');

  // if (user?.role === 'admin') {
  //   cards.push({
  //     title: 'Registrasi',
  //     description: "Menambahkan Siswa Baru Ke Sistem.",
  //     icon: <PersonAdd sx={{ fontSize: 60}} />,
  //     link: '/register-student',
  //     bgcolor: 'info.light'
  //   });
  // }

  // Summary Counts
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === 'NORMAL').length;
  const issuesDevices = devices.filter((d) => d.status !== 'NORMAL').length;

  return (
    <Layout>
      <Head>
        <title>School Attendance System</title>
        <meta name="description" content="RFID-based attendance system for schools" />
      </Head>

      <Container
        maxWidth="lg"
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Selamat Datang, {user?.name}!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Sistem Kehadiran Sekolah dengan Integrasi RFID
          </Typography>

          {/* Menu Cards */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {cards.map((card, index) => (
              <Grid item xs={12} sm={12} md={6} key={index}>
                <Paper
                  elevation={3}
                  sx={{
                    mx: 'auto', // center horizontally
                    maxWidth: '100%',
                    width: '100%',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'scale(1.02)'
                    },
                    transition: 'all 0.3s ease-in-out',
                  }}
                  onClick={() => router.push(card.link)}
                >
                  <Grid container>
                    <Grid
                      item xs={4}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: card.bgcolor,
                        color: 'white',
                        borderTopLeftRadius: '16px',
                        borderBottomLeftRadius: '16px'
                      }}
                    >
                      {card.icon}
                    </Grid>
                    <Grid
                      item xs={8}
                      sx={{
                        p: { xs: 2, sm: 3 },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h5" sx={{ mb: 1 }}>
                        {card.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.6 }}
                      >
                        {card.description}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Devices List Title - Only for admin and staff */}
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <Box sx={{ mt: 6 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Daftar Perangkat 
              </Typography>

              {/* Summary Cards under Devices List title */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4">{totalDevices}</Typography>
                    <Typography variant="subtitle1">Total Perangkat</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
                    <Typography variant="h4">{onlineDevices}</Typography>
                    <Typography variant="subtitle1">Online</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.main', color: 'white' }}>
                    <Typography variant="h4">{issuesDevices}</Typography>
                    <Typography variant="subtitle1">Bermasalah</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Devices Table */}
              <Divider sx={{ mb: 2 }} />
              {devicesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nama Perangkat</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Deskripsi</TableCell>
                        <TableCell>IP</TableCell>
                        <TableCell>Uptime</TableCell>
                        <TableCell>Cached Records</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {devices.map((device, index) => (
                        <TableRow key={index}>
                          <TableCell>{device.deviceId || 'Unknown Device'}</TableCell>
                          <TableCell>
                            <Chip
                              label={device.status || 'Unknown'}
                              color={
                                device.status === 'NORMAL'
                                  ? 'success'
                                  : device.status === 'TAMPERED'
                                  ? 'error'
                                  : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{device.description || 'No description'}</TableCell>
                          <TableCell>{device.ipAddress || 'No IP'}</TableCell>
                          <TableCell>{device.uptime ? `${device.uptime} s` : 'Unknown'}</TableCell>
                          <TableCell>{device.cacheSize || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Box>
      </Container>
    </Layout>
  );
}
