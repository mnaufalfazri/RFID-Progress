import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Container, Box, Typography, Paper, 
  TextField, Button, Grid, IconButton, 
  Card, CardContent, Chip, Divider,
  Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Search, FilterList, Refresh, ArrowBack } from '@mui/icons-material';
import { format } from 'date-fns';
import { getCurrentTime, formatDateForInput, formatTimeForDisplay } from '../utils/timezone';
import Layout from '../components/Layout';
import { isAuthenticated } from '../utils/auth';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Attendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [error, setError] = useState('');
  const [date, setDate] = useState(formatDateForInput(getCurrentTime()));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Check if user is authenticated
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    fetchAttendanceRecords();
  }, [router, date, statusFilter]);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const auth = isAuthenticated();
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/attendance?date=${date}`;
      
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (response.data.success) {
        setAttendanceRecords(response.data.data);
      }
    } catch (err) {
      setError('Failed to fetch attendance records');
      toast.error('Error loading attendance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Filter records based on search term
    // This is client-side filtering, but you could also send the search term to the server
  };

  const handleRefresh = () => {
    fetchAttendanceRecords();
    toast.success('Attendance data refreshed');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'present': return 'success';
      case 'absent': return 'error';
      case 'late': return 'warning';
      case 'half-day': return 'info';
      default: return 'default';
    }
  };

  return (
    <Layout>
      <Head>
        <title>Attendance | School Attendance System</title>
      </Head>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Daftar Hadir Harian
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<ArrowBack />}
              onClick={() => router.push('/')}
            >
              Kembali ke Dashboard
            </Button>
          </Box>

          <Paper sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  label="Tanggal"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Pencarian Siswa"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={handleSearch}>
                        <Search />
                      </IconButton>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status Filter"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">Semua</MenuItem>
                    <MenuItem value="present">Hadir</MenuItem>
                    <MenuItem value="absent">Tidak Hadir</MenuItem>
                    <MenuItem value="late">Terlambat</MenuItem>
                    <MenuItem value="half-day">Setengah Hari</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton onClick={handleRefresh} color="primary">
                  <Refresh />
                </IconButton>
                <IconButton onClick={() => setFilterOpen(!filterOpen)} color="primary">
                  <FilterList />
                </IconButton>
              </Grid>
            </Grid>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {attendanceRecords.length} Data Ditemukan
              </Typography>
              
              <Grid container spacing={3}>
                {attendanceRecords.length > 0 ? (
                  attendanceRecords.map((record) => (
                    <Grid item xs={12} sm={6} md={4} key={record._id}>
                      <Card elevation={2}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6">
                              {record.student.name}
                            </Typography>
                            <Chip 
                              label={record.status.charAt(0).toUpperCase() + record.status.slice(1)} 
                              color={getStatusColor(record.status)}
                              size="small"
                            />
                          </Box>
                          <Typography color="text.secondary" gutterBottom>
                            ID: {record.student.studentId}
                          </Typography>
                          <Typography color="text.secondary" gutterBottom>
                            Class: {record.student.class} | Grade: {record.student.grade}
                          </Typography>
                          
                          <Divider sx={{ my: 1 }} />
                          
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Entry Time:
                              </Typography>
                              <Typography variant="body2">
                                {record.entryTime ? formatTimeForDisplay(record.entryTime) : 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="text.secondary">
                                Exit Time:
                              </Typography>
                              <Typography variant="body2">
                                {record.exitTime ? formatTimeForDisplay(record.exitTime) : 'N/A'}
                              </Typography>
                            </Grid>
                          </Grid>
                          
                          {record.notes && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Notes: {record.notes}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="h6">Tidak ada data absensi yang ditemukan untuk tanggal ini.</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Coba ubah tanggal atau hapus filter.
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </Box>
      </Container>
    </Layout>
  );
}
