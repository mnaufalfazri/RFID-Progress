import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Container, Box, Typography, Paper, 
  TextField, Button, Grid, CircularProgress,
  Alert, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails,
  MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import { 
  Assessment, ExpandMore, Print, 
  Download, ArrowBack 
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { getCurrentTime, formatDateForInput, formatDateForDisplay, formatTime12Hour } from '../utils/timezone';
import Layout from '../components/Layout';
import { isAuthenticated } from '../utils/auth';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Reports() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(formatDateForInput(subDays(getCurrentTime(), 7)));
  const [endDate, setEndDate] = useState(formatDateForInput(getCurrentTime()));
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [totalDays, setTotalDays] = useState(0);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    // Check if user has permission to access reports (admin, teacher, staff only)
    if (auth.user.role !== 'admin' && auth.user.role !== 'teacher' && auth.user.role !== 'staff') {
      router.push('/');
      return;
    }
  }, [router]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      const auth = isAuthenticated();
      
      let url = `${process.env.NEXT_PUBLIC_API_URL}/attendance/report?startDate=${startDate}&endDate=${endDate}`;
      
      if (selectedClass) {
        url += `&class=${selectedClass}`;
      }
      
      if (selectedGrade) {
        url += `&grade=${selectedGrade}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (response.data.success) {
        setReportData(response.data.data);
        setTotalDays(response.data.totalDays);
        
        // Prepare chart data
        prepareChartData(response.data.data);
      }
    } catch (err) {
      setError('Failed to fetch attendance report');
      toast.error('Error loading report data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (data) => {
    // Only take top 10 students for the chart to avoid overcrowding
    const topStudents = [...data]
      .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
      .slice(0, 10);
    
    setChartData({
      labels: topStudents.map(student => student.student.name),
      datasets: [
        {
          label: 'Persentase Kehadiran',
          data: topStudents.map(student => parseFloat(student.attendancePercentage)),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Export data as CSV
    let csv = 'ID Siswa,Nama,kelas,Tingkat Studi,Total Masuk,Total Tidak Masuk,Total Terlambat,Total Setengah Hari,Persentase Kehadiran\n';
    
    reportData.forEach(item => {
      csv += `${item.student.studentId},${item.student.name},${item.student.class},${item.student.grade},${item.present},${item.absent},${item.late},${item.halfDay},${item.attendancePercentage}%\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Laporan_Kehadiran_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.success('Report exported successfully');
  };

  return (
    <Layout>
      <Head>
        <title>Laporan Kehadiran | Sistem Absensi Sekolah</title>
      </Head>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Laporan Kehadiran
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
                  label="Tanggal Mulai"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Tanggal Berakhir"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Kelas"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Tingkat Studi"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={fetchReport}
                  startIcon={<Assessment />}
                  disabled={loading}
                >
                  Tampilkan Laporan
                </Button>
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
          ) : reportData.length > 0 ? (
            <Box>
              <Paper sx={{ p: 3, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5">
                    Ringkasan Kehadiran
                  </Typography>
                  <Box>
                    <Button 
                      startIcon={<Print />} 
                      onClick={handlePrint}
                      sx={{ mr: 1 }}
                    >
                      Cetak
                    </Button>
                    <Button 
                      startIcon={<Download />} 
                      onClick={handleExport}
                    >
                      Ekspor CSV
                    </Button>
                  </Box>
                </Box>
                
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Periode Laporan: <strong>{formatDateForDisplay(startDate)}</strong> Sampai <strong>{formatDateForDisplay(endDate)}</strong>
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Total Hari Sekolah: <strong>{totalDays}</strong>
                </Typography>
                
                {chartData && (
                  <Box sx={{ height: 300, mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      10 Siswa Terbaik Berdasarkan Kehadiran
                    </Typography>
                    <Bar 
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Persentase Kehadiran (%)'
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: 'Siswa'
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                )}
                
                <TableContainer>
                  <Table sx={{ minWidth: 650 }} aria-label="attendance report table">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID Siswa</TableCell>
                        <TableCell>Nama</TableCell>
                        <TableCell>Kelas</TableCell>
                        <TableCell>Tingkat Studi</TableCell>
                        <TableCell align="center">Hadir</TableCell>
                        <TableCell align="center">Tidak Hadir</TableCell>
                        <TableCell align="center">Terlambat</TableCell>
                        <TableCell align="center">Setengah hari</TableCell>
                        <TableCell align="center">Kehadiran %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.map((item) => (
                        <TableRow key={item.student._id}>
                          <TableCell>{item.student.studentId}</TableCell>
                          <TableCell>{item.student.name}</TableCell>
                          <TableCell>{item.student.class}</TableCell>
                          <TableCell>{item.student.grade}</TableCell>
                          <TableCell align="center">{item.present}</TableCell>
                          <TableCell align="center">{item.absent}</TableCell>
                          <TableCell align="center">{item.late}</TableCell>
                          <TableCell align="center">{item.halfDay}</TableCell>
                          <TableCell align="center">{item.attendancePercentage}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
              
              <Typography variant="h5" sx={{ mb: 2 }}>
                Catatan Detail
              </Typography>
              
              {reportData.map((item) => (
                <Accordion key={item.student._id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography sx={{ fontWeight: 'bold' }}>
                      {item.student.name} ({item.student.studentId}) - {item.attendancePercentage}% Kehadiran
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {item.records.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Entry Time</TableCell>
                              <TableCell>Exit Time</TableCell>
                              <TableCell>Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {item.records.map((record) => (
                              <TableRow key={record._id}>
                                <TableCell>{formatDateForDisplay(record.date)}</TableCell>
                                <TableCell>
                                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </TableCell>
                                <TableCell>
                                  {record.entryTime ? formatTime12Hour(record.entryTime) : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {record.exitTime ? formatTime12Hour(record.exitTime) : 'N/A'}
                                </TableCell>
                                <TableCell>{record.notes || 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography>Tidak ada catatan detail yang tersedia</Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6">Tidak ada data laporan yang tersedia.</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Pilih rentang tanggal dan klik &quot;Cetak Laporan&quot; untuk melihat data kehadiran.
              </Typography>
            </Paper>
          )}
        </Box>
      </Container>
    </Layout>
  );
}
