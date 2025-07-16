import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Container, Box, Typography, Paper, 
  TextField, Button, Grid, IconButton, 
  Card, CardContent, Chip, Divider,
  Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem,
  Tabs, Tab
} from '@mui/material';
import { Search, FilterList, Refresh, ArrowBack, School as LessonIcon } from '@mui/icons-material';
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
  const [lessonAttendanceRecords, setLessonAttendanceRecords] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [date, setDate] = useState(formatDateForInput(getCurrentTime()));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [lessonFilters, setLessonFilters] = useState({
    startDate: '',
    endDate: '',
    student: '',
    subject: '',
    room: '',
    status: ''
  });

  useEffect(() => {
    // Check if user is authenticated
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    // Check if user has permission to access attendance (all roles can view)
    if (!['admin', 'teacher', 'staff', 'student'].includes(auth.user.role)) {
      router.push('/');
      return;
    }

    fetchAttendanceRecords();
    fetchLessonAttendanceRecords();
    fetchSubjects();
    fetchRooms();
  }, [router, date, statusFilter, tabValue]);

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

  const fetchLessonAttendanceRecords = async () => {
    try {
      const auth = isAuthenticated();
      
      const queryParams = new URLSearchParams({
        date: date,
        ...Object.fromEntries(Object.entries(lessonFilters).filter(([_, v]) => v !== ''))
      });

      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/attendance/lessons?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (response.data.success) {
        setLessonAttendanceRecords(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching lesson attendance records:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const auth = isAuthenticated();
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subjects?limit=100`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (response.data.success) {
        setSubjects(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const auth = isAuthenticated();
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/rooms?limit=100`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const handleSearch = () => {
    // Filter records based on search term
    // This is client-side filtering, but you could also send the search term to the server
  };

  const handleRefresh = () => {
    if (tabValue === 0) {
      fetchAttendanceRecords();
    } else {
      fetchLessonAttendanceRecords();
    }
    toast.success('Attendance data refreshed');
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleLessonFilterChange = (field, value) => {
    setLessonFilters(prev => ({ ...prev, [field]: value }));
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
              Daftar Hadir
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<ArrowBack />}
              onClick={() => router.push('/')}
            >
              Kembali ke Dashboard
            </Button>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Absensi Harian" />
              <Tab label="Absensi Pelajaran" icon={<LessonIcon />} />
            </Tabs>
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
              {tabValue === 0 ? (
                <>
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
                </>
              ) : (
                <>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Mata Pelajaran</InputLabel>
                      <Select
                        value={lessonFilters.subject}
                        label="Mata Pelajaran"
                        onChange={(e) => handleLessonFilterChange('subject', e.target.value)}
                      >
                        <MenuItem value="">Semua</MenuItem>
                        {subjects.map((subject) => (
                          <MenuItem key={subject._id} value={subject._id}>
                            {subject.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Ruangan</InputLabel>
                      <Select
                        value={lessonFilters.room}
                        label="Ruangan"
                        onChange={(e) => handleLessonFilterChange('room', e.target.value)}
                      >
                        <MenuItem value="">Semua</MenuItem>
                        {rooms.map((room) => (
                          <MenuItem key={room._id} value={room._id}>
                            {room.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Status Filter</InputLabel>
                      <Select
                        value={lessonFilters.status}
                        label="Status Filter"
                        onChange={(e) => handleLessonFilterChange('status', e.target.value)}
                      >
                        <MenuItem value="">Semua</MenuItem>
                        <MenuItem value="present">Hadir</MenuItem>
                        <MenuItem value="absent">Tidak Hadir</MenuItem>
                        <MenuItem value="late">Terlambat</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
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
                {tabValue === 0 ? attendanceRecords.length : lessonAttendanceRecords.length} Data Ditemukan
              </Typography>
              
              <Grid container spacing={3}>
                {tabValue === 0 ? (
                  attendanceRecords.length > 0 ? (
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
                        <Typography variant="h6">Tidak ada data absensi harian yang ditemukan untuk tanggal ini.</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Coba ubah tanggal atau hapus filter.
                        </Typography>
                      </Paper>
                    </Grid>
                  )
                ) : (
                  lessonAttendanceRecords.length > 0 ? (
                    lessonAttendanceRecords.map((record) => (
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
                                  Subject:
                                </Typography>
                                <Typography variant="body2">
                                  {record.subject?.name || 'N/A'}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">
                                  Room:
                                </Typography>
                                <Typography variant="body2">
                                  {record.room?.name || 'N/A'}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary">
                                  Scan Time:
                                </Typography>
                                <Typography variant="body2">
                                  {record.scanTime ? formatTimeForDisplay(record.scanTime) : 'N/A'}
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
                        <Typography variant="h6">Tidak ada data absensi pelajaran yang ditemukan untuk tanggal ini.</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Coba ubah tanggal atau hapus filter.
                        </Typography>
                      </Paper>
                    </Grid>
                  )
                )}
              </Grid>
            </>
          )}
        </Box>
      </Container>
    </Layout>
  );
}
