import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container, Box, Typography, Button,
  TextField, IconButton, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, FormControl,
  InputLabel, Select, MenuItem, Grid, Alert
} from '@mui/material';
import {
  Add, Search, Edit, Delete, School,
  CheckCircle, Cancel, ArrowBack, Assignment
} from '@mui/icons-material';
import axios from 'axios';
import { isAuthenticated } from '../utils/auth';
import Layout from '../components/Layout';

export default function Subjects() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    grade: ''
  });
  const [grades] = useState(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    // Check if user has permission to access subjects (admin and teacher only)
    if (auth.user.role !== 'admin' && auth.user.role !== 'teacher') {
      router.push('/');
      return;
    }

    setUser(auth.user);
    fetchSubjects();
  }, [page, rowsPerPage]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const auth = isAuthenticated();

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/subjects?page=${page + 1}&limit=${rowsPerPage}${searchTerm ? `&search=${searchTerm}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setSubjects(response.data.data);
        setTotalSubjects(response.data.total);
      }
    } catch (err) {
      setError('Failed to fetch subjects');
      console.error('Error fetching subjects:', err);
    } finally {
      setLoading(false);
    }
  };





  const handleSearch = () => {
    setPage(0);
    fetchSubjects();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreateSubject = async () => {
    try {
      const auth = isAuthenticated();
      
      // Prepare data and remove empty teacher and room fields
      const submitData = { ...formData };
      if (!submitData.teacher || submitData.teacher === '') {
        delete submitData.teacher;
      }
      if (!submitData.room || submitData.room === '') {
        delete submitData.room;
      }
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/subjects`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setCreateDialogOpen(false);
        setFormData({ 
          name: '', 
          code: '', 
          description: '', 
          grade: ''
        });
        fetchSubjects();
      }
    } catch (err) {
      setError('Failed to create subject');
      console.error('Error creating subject:', err);
    }
  };

  const handleUpdateSubject = async () => {
    try {
      const auth = isAuthenticated();
      
      // Prepare data and remove empty teacher and room fields
      const submitData = { ...formData };
      if (!submitData.teacher || submitData.teacher === '') {
        delete submitData.teacher;
      }
      if (!submitData.room || submitData.room === '') {
        delete submitData.room;
      }
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/subjects/${subjectToEdit._id}`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setEditDialogOpen(false);
        setSubjectToEdit(null);
        setFormData({ 
          name: '', 
          code: '', 
          description: '', 
          grade: '', 
          teacher: '', 
          room: '', 
          schedule: { day: '', startTime: '', endTime: '' } 
        });
        fetchSubjects();
      }
    } catch (err) {
      setError('Failed to update subject');
      console.error('Error updating subject:', err);
    }
  };

  const deleteSubject = async () => {
    try {
      const auth = isAuthenticated();

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/subjects/${subjectToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setDeleteDialogOpen(false);
        setSubjectToDelete(null);
        fetchSubjects();
      }
    } catch (err) {
      setError('Failed to delete subject');
      console.error('Error deleting subject:', err);
    }
  };

  const openCreateDialog = () => {
    setFormData({ 
      name: '', 
      code: '', 
      description: '', 
      grade: ''
    });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (subject) => {
    setSubjectToEdit(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      grade: subject.grade
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (subject) => {
    setSubjectToDelete(subject);
    setDeleteDialogOpen(true);
  };

  const handleAssignStudents = (subject) => {
    router.push(`/subjects/${subject._id}/assign`);
  };

  if (loading && subjects.length === 0) {
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
        <title>Mata Pelajaran - School Attendance System</title>
      </Head>
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/dashboard')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          
          <Typography variant="h4" component="h1" gutterBottom>
            <School sx={{ mr: 1, verticalAlign: 'middle' }} />
            Mata Pelajaran
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                label="Search subjects..."
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
              {user?.role === 'admin' && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={openCreateDialog}
                  sx={{ ml: 'auto' }}
                >
                  Add Subject
                </Button>
              )}
            </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {subject.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>
                      <Chip label={`Grade ${subject.grade}`} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {subject.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={subject.active ? <CheckCircle /> : <Cancel />}
                        label={subject.active ? 'Active' : 'Inactive'}
                        color={subject.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="Assign Students">
                          <IconButton
                            size="small"
                            onClick={() => handleAssignStudents(subject)}
                            color="primary"
                          >
                            <Assignment />
                          </IconButton>
                        </Tooltip>
                        {user?.role === 'admin' && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(subject)}
                                color="primary"
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => openDeleteDialog(subject)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalSubjects}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Paper>

        {/* Create Subject Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Subject</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Subject Code"
                  fullWidth
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Grade</InputLabel>
                  <Select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    label="Grade"
                  >
                    {grades.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        Grade {grade}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Subject Name"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSubject} variant="contained">Create</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Subject Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Subject Code"
                  fullWidth
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Grade</InputLabel>
                  <Select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    label="Grade"
                  >
                    {grades.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        Grade {grade}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Subject Name"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateSubject} variant="contained">Update</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the subject "{subjectToDelete?.name}"?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={deleteSubject} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>




      </Container>
    </Layout>
  );
}