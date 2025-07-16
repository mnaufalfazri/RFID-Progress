import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container, Typography, Box, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Tooltip, Chip, CircularProgress,
  Grid, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Search, Add, Edit, Delete, ArrowBack, Person,
  CheckCircle, Cancel, Email, Phone
} from '@mui/icons-material';
import axios from 'axios';
import { isAuthenticated } from '../utils/auth';
import Layout from '../components/Layout';

export default function Teachers() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    employeeId: '',
    department: '',
    specialization: ''
  });

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    if (auth.user.role !== 'admin') {
      router.push('/');
      return;
    }

    setUser(auth.user);
    fetchTeachers();
  }, [page, rowsPerPage]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const auth = isAuthenticated();

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers?page=${page + 1}&limit=${rowsPerPage}${searchTerm ? `&search=${searchTerm}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setTeachers(response.data.data);
        setTotalTeachers(response.data.total);
      }
    } catch (err) {
      setError('Failed to fetch teachers');
      console.error('Error fetching teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = () => {
    setPage(0);
    fetchTeachers();
  };

  const handleCreateTeacher = async () => {
    try {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      const auth = isAuthenticated();
      
      const submitData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        employeeId: formData.employeeId,
        department: formData.department,
        specialization: formData.specialization
      };
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setCreateDialogOpen(false);
        setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', employeeId: '', department: '', specialization: '' });
        fetchTeachers();
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create teacher');
      console.error('Error creating teacher:', err);
    }
  };

  const handleUpdateTeacher = async () => {
    try {
      if (formData.password && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (formData.password && formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      const auth = isAuthenticated();
      
      const submitData = {
        name: formData.name,
        email: formData.email
      };

      // Only include password if it's provided
      if (formData.password) {
        submitData.password = formData.password;
      }
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/${teacherToEdit._id}`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setEditDialogOpen(false);
        setTeacherToEdit(null);
        setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', employeeId: '', department: '', specialization: '' });
        fetchTeachers();
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update teacher');
      console.error('Error updating teacher:', err);
    }
  };

  const deleteTeacher = async () => {
    try {
      const auth = isAuthenticated();

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/${teacherToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setDeleteDialogOpen(false);
        setTeacherToDelete(null);
        fetchTeachers();
      }
    } catch (err) {
      setError('Failed to delete teacher');
      console.error('Error deleting teacher:', err);
    }
  };

  const openCreateDialog = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', employeeId: '', department: '', specialization: '' });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (teacher) => {
    setTeacherToEdit(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      password: '',
      confirmPassword: '',
      phone: teacher.phone || '',
      employeeId: teacher.employeeId || '',
      department: teacher.department || '',
      specialization: teacher.specialization || ''
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (teacher) => {
    setTeacherToDelete(teacher);
    setDeleteDialogOpen(true);
  };

  if (loading && teachers.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Teachers Management - School Attendance System</title>
      </Head>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          
          <Typography variant="h4" component="h1" gutterBottom>
            <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
            Teachers Management
          </Typography>
        </Box>

        {error && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
            {error}
          </Box>
        )}

        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Search teachers..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ minWidth: 250 }}
            />
            <Button
              variant="outlined"
              startIcon={<Search />}
              onClick={handleSearch}
            >
              Search
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreateDialog}
              sx={{ ml: 'auto' }}
            >
              Add Teacher
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Specialization</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {teacher.employeeId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" color="action" />
                        {teacher.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email fontSize="small" color="action" />
                        {teacher.email}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone fontSize="small" color="action" />
                        {teacher.phone || '-'}
                      </Box>
                    </TableCell>
                    <TableCell>{teacher.department || '-'}</TableCell>
                    <TableCell>{teacher.specialization || '-'}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(teacher)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => openDeleteDialog(teacher)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalTeachers}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Paper>

        {/* Create Teacher Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Teacher</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Employee ID"
                  fullWidth
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Full Name"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Department"
                  fullWidth
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Specialization"
                  fullWidth
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTeacher} variant="contained">Create</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Teacher Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Employee ID"
                  fullWidth
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Full Name"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="New Password (leave blank to keep current)"
                  type="password"
                  fullWidth
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Confirm New Password"
                  type="password"
                  fullWidth
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Department"
                  fullWidth
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Specialization"
                  fullWidth
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTeacher} variant="contained">Update</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the teacher "{teacherToDelete?.name}"?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={deleteTeacher} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}