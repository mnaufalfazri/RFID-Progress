import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container, Box, Typography, Button,
  TextField, IconButton, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, Checkbox,
  FormControlLabel, Grid, Card, CardContent
} from '@mui/material';
import {
  Search, ArrowBack, Assignment, PersonAdd,
  CheckCircle, Cancel, Delete
} from '@mui/icons-material';
import axios from 'axios';
import { isAuthenticated } from '../../../utils/auth';

export default function AssignSubject() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalStudents, setTotalStudents] = useState(0);
  const [assignedPage, setAssignedPage] = useState(0);
  const [assignedRowsPerPage, setAssignedRowsPerPage] = useState(10);
  const [totalAssignedStudents, setTotalAssignedStudents] = useState(0);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'assigned'

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    setUser(auth.user);
    if (id) {
      fetchSubject();
      fetchAvailableStudents();
      fetchAssignedStudents();
    }
  }, [id, page, rowsPerPage, assignedPage, assignedRowsPerPage]);

  const fetchSubject = async () => {
    try {
      const auth = isAuthenticated();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/subjects/${id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setSubject(response.data.data);
      }
    } catch (err) {
      setError('Failed to fetch subject details');
      console.error('Error fetching subject:', err);
    }
  };

  const fetchAvailableStudents = async () => {
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
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedStudents = async () => {
    try {
      const auth = isAuthenticated();

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/subjects/${id}/students?page=${assignedPage + 1}&limit=${assignedRowsPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setAssignedStudents(response.data.data);
        setTotalAssignedStudents(response.data.total);
      }
    } catch (err) {
      setError('Failed to fetch assigned students');
      console.error('Error fetching assigned students:', err);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchAvailableStudents();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAssignedChangePage = (event, newPage) => {
    setAssignedPage(newPage);
  };

  const handleAssignedChangeRowsPerPage = (event) => {
    setAssignedRowsPerPage(parseInt(event.target.value, 10));
    setAssignedPage(0);
  };

  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(student => student._id));
    }
  };

  const handleAssignStudents = async () => {
    try {
      const auth = isAuthenticated();
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/subjects/${id}/assign`,
        { studentIds: selectedStudents },
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setAssignDialogOpen(false);
        setSelectedStudents([]);
        fetchAssignedStudents();
        fetchAvailableStudents();
      }
    } catch (err) {
      setError('Failed to assign students');
      console.error('Error assigning students:', err);
    }
  };

  const handleRemoveAssignment = async (studentId) => {
    try {
      const auth = isAuthenticated();
      
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/subjects/${id}/assign/${studentId}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        fetchAssignedStudents();
        fetchAvailableStudents();
      }
    } catch (err) {
      setError('Failed to remove assignment');
      console.error('Error removing assignment:', err);
    }
  };

  if (loading && !subject) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Assign Students - {subject?.name} - School Attendance System</title>
      </Head>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/subjects')}
            sx={{ mb: 2 }}
          >
            Back to Subjects
          </Button>
          
          <Typography variant="h4" component="h1" gutterBottom>
            <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
            Assign Students to Subject
          </Typography>
          
          {subject && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6">{subject.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Code: {subject.code}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      Grade: {subject.grade}
                    </Typography>
                    <Typography variant="body2">
                      Teacher: {subject.teacher?.name || 'Not assigned'}
                    </Typography>
                  </Grid>
                  {subject.description && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        Description: {subject.description}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Box>

        {error && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
            {error}
          </Box>
        )}

        {/* Tab Navigation */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant={activeTab === 'available' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('available')}
            sx={{ mr: 1 }}
          >
            Available Students ({totalStudents})
          </Button>
          <Button
            variant={activeTab === 'assigned' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('assigned')}
          >
            Assigned Students ({totalAssignedStudents})
          </Button>
        </Box>

        {/* Available Students Tab */}
        {activeTab === 'available' && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                label="Search students..."
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
              {selectedStudents.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => setAssignDialogOpen(true)}
                  sx={{ ml: 'auto' }}
                >
                  Assign Selected ({selectedStudents.length})
                </Button>
              )}
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedStudents.length > 0 && selectedStudents.length < students.length}
                        checked={students.length > 0 && selectedStudents.length === students.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => handleStudentSelect(student._id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {student.studentId}
                        </Typography>
                      </TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>
                        <Chip label={`Grade ${student.grade}`} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={student.active ? <CheckCircle /> : <Cancel />}
                          label={student.active ? 'Active' : 'Inactive'}
                          color={student.active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalStudents}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Paper>
        )}

        {/* Assigned Students Tab */}
        {activeTab === 'assigned' && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Students Assigned to {subject?.name}
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell>Assigned Date</TableCell>
                    <TableCell>Assigned By</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignedStudents.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {student.studentId}
                        </Typography>
                      </TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>
                        <Chip label={`Grade ${student.grade}`} size="small" />
                      </TableCell>
                      <TableCell>
                        {new Date(student.assignedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{student.assignedBy?.name}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Remove Assignment">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveAssignment(student._id)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalAssignedStudents}
              page={assignedPage}
              onPageChange={handleAssignedChangePage}
              rowsPerPage={assignedRowsPerPage}
              onRowsPerPageChange={handleAssignedChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Paper>
        )}

        {/* Assign Confirmation Dialog */}
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
          <DialogTitle>Confirm Assignment</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to assign {selectedStudents.length} student(s) to "{subject?.name}"?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignStudents} variant="contained">
              Assign Students
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}