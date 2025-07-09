import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container, Box, Typography, Button,
  TextField, IconButton, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions,Tooltip 
} from '@mui/material';
import {
  Add, Search, Edit, Delete, School,
  CheckCircle, Cancel, ArrowBack
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { isAuthenticated } from '../utils/auth';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Students() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalStudents, setTotalStudents] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    setUser(auth.user);
    fetchStudents();
  }, [router, page, rowsPerPage]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const auth = isAuthenticated();

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/students?page=${page + 1}&limit=${rowsPerPage}${searchTerm ? `&search=${searchTerm}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setStudents(response.data.data);
        setTotalStudents(response.data.total);
      }
    } catch (err) {
      setError('Failed to fetch students');
      toast.error('Error loading student data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchStudents();
  };

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const openDeleteDialog = (student) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const deleteStudent = async () => {
    try {
      const auth = isAuthenticated();

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/students/${studentToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Student deleted successfully');
        fetchStudents();
      }
    } catch (err) {
      setError('Failed to delete student');
      toast.error('Error deleting student');
      console.error(err);
    } finally {
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Data Siswa | Sistem Absensi Sekolah</title>
      </Head>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Siswa
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => router.push('/')}
            >
              Kembali ke Dashboard
            </Button>
          </Box>

          <Paper elevation={3}>
            <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <TextField
                size="small"
                placeholder="Pencarian Siswa"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={handleSearch}>
                      <Search />
                    </IconButton>
                  )
                }}
              />
              {(user?.role === 'admin' || user?.role === 'teacher') && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => router.push('/register-student')}
                  size="small"
                >
                  Tambah Siswa Baru
                </Button>
              )}
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nama</TableCell>
                        <TableCell>ID Siswa</TableCell>
                        <TableCell>Tag RFID</TableCell>
                        <TableCell>Kelas</TableCell>
                        <TableCell>Tingkat</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Aksi</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.length > 0 ? (
                        students.map((student) => (
                          <TableRow key={student._id}>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{student.studentId}</TableCell>
                            <TableCell>{student.rfidTag}</TableCell>
                            <TableCell>{student.class}</TableCell>
                            <TableCell>{student.grade}</TableCell>
                            <TableCell>
                              {student.active ? (
                                <Chip
                                  icon={<CheckCircle fontSize="small" />}
                                  label="Aktif"
                                  color="success"
                                  size="small"
                                />
                              ) : (
                                <Chip
                                  icon={<Cancel fontSize="small" />}
                                  label="Tidak Aktif"
                                  color="error"
                                  size="small"
                                />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Lihat Detail Siswa" arrow>
                                <IconButton
                                  color="primary"
                                  onClick={() => router.push(`/students/${student._id}`)}
                                  size="small"
                                >
                                  <School />
                                </IconButton>
                              </Tooltip>

                              {(user?.role === 'admin' || user?.role === 'teacher') && (
                                <>
                                  <Tooltip title="Edit Siswa" arrow>
                                    <IconButton
                                      color="info"
                                      onClick={() => router.push(`/edit-student/${student._id}`)}
                                      size="small"
                                    >
                                      <Edit />
                                    </IconButton>
                                  </Tooltip>

                                  {user?.role === 'admin' && (
                                    <Tooltip title="Hapus Siswa" arrow>
                                      <IconButton
                                        color="error"
                                        onClick={() => openDeleteDialog(student)}
                                        size="small"
                                      >
                                        <Delete />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </>
                              )}
                            </TableCell>

                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            Tidak ada siswa
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={totalStudents}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </>
            )}
          </Paper>
        </Box>
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Konfirmasi Hapus</DialogTitle>
        <DialogContent>
          <Typography>
            Apakah Anda yakin ingin menghapus siswa: <strong>{studentToDelete?.name}</strong>?
          </Typography>
          <Typography color="error" sx={{ mt: 2 }}>
            Data yang dihapus tidak bisa dikembalikan.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
          <Button onClick={deleteStudent} color="error" variant="contained">
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
