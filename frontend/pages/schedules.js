import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  IconButton,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { isAuthenticated } from '../utils/auth';
import Layout from '../components/Layout';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Schedules() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalSchedules, setTotalSchedules] = useState(0);
  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState(null);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [formData, setFormData] = useState({
    subject: '',
    teacher: '',
    room: '',
    class: '',
    grade: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    isActive: true
  });
  const [filters, setFilters] = useState({
    class: '',
    grade: '',
    dayOfWeek: '',
    room: '',
    teacher: '',
    subject: ''
  });

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
    } else {
      // Check if user has permission to access schedules (all roles can view)
      if (!['admin', 'teacher', 'staff', 'student'].includes(auth.user.role)) {
        router.push('/');
        return;
      }
      
      setUser(auth.user);
      setLoading(false);
      fetchSchedules(auth.token);
      fetchSubjects(auth.token);
      fetchTeachers(auth.token);
      fetchRooms(auth.token);
    }
  }, [router]);

  useEffect(() => {
    if (user) {
      const auth = isAuthenticated();
      if (auth) {
        fetchSchedules(auth.token);
      }
    }
  }, [page, rowsPerPage, filters]);

  const fetchSchedules = async (token) => {
    try {
      const queryParams = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/schedules?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.data);
        setTotalSchedules(data.total);
      } else {
        setError('Failed to fetch schedules');
      }
    } catch (err) {
      setError('Error fetching schedules');
    }
  };

  const fetchSubjects = async (token) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subjects?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchTeachers = async (token) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teachers?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeachers(data.data);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const fetchRooms = async (token) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRooms(data.data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const auth = isAuthenticated();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/schedules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        setFormData({
          subject: '',
          teacher: '',
          room: '',
          class: '',
          grade: '',
          dayOfWeek: '',
          startTime: '',
          endTime: '',
          isActive: true
        });
        fetchSchedules(auth.token);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create schedule');
      }
    } catch (err) {
      setError('Error creating schedule');
    }
  };

  const handleEditSchedule = (schedule) => {
    setScheduleToEdit(schedule);
    setFormData({
      subject: schedule.subject._id,
      teacher: schedule.teacher._id,
      room: schedule.room._id,
      class: schedule.class,
      grade: schedule.grade,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isActive: schedule.isActive
    });
    setEditDialogOpen(true);
  };

  const handleUpdateSchedule = async () => {
    try {
      const auth = isAuthenticated();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/schedules/${scheduleToEdit._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setScheduleToEdit(null);
        setFormData({
          subject: '',
          teacher: '',
          room: '',
          class: '',
          grade: '',
          dayOfWeek: '',
          startTime: '',
          endTime: '',
          isActive: true
        });
        fetchSchedules(auth.token);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update schedule');
      }
    } catch (err) {
      setError('Error updating schedule');
    }
  };

  const handleDeleteSchedule = async () => {
    try {
      const auth = isAuthenticated();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/schedules/${scheduleToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setScheduleToDelete(null);
        fetchSchedules(auth.token);
      } else {
        setError('Failed to delete schedule');
      }
    } catch (err) {
      setError('Error deleting schedule');
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon /> Class Schedules
        </Typography>
        {user?.role === 'admin' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Schedule
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filters</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Class"
                value={filters.class}
                onChange={(e) => handleFilterChange('class', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Grade"
                value={filters.grade}
                onChange={(e) => handleFilterChange('grade', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Day</InputLabel>
                <Select
                  value={filters.dayOfWeek}
                  label="Day"
                  onChange={(e) => handleFilterChange('dayOfWeek', e.target.value)}
                >
                  <MenuItem value="">All Days</MenuItem>
                  {DAYS_OF_WEEK.map((day) => (
                    <MenuItem key={day} value={day}>{day}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Room</InputLabel>
                <Select
                  value={filters.room}
                  label="Room"
                  onChange={(e) => handleFilterChange('room', e.target.value)}
                >
                  <MenuItem value="">All Rooms</MenuItem>
                  {rooms.map((room) => (
                    <MenuItem key={room._id} value={room._id}>
                      {room.name} - {room.building} Floor {room.floor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Teacher</InputLabel>
                <Select
                  value={filters.teacher}
                  label="Teacher"
                  onChange={(e) => handleFilterChange('teacher', e.target.value)}
                >
                  <MenuItem value="">All Teachers</MenuItem>
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher._id} value={teacher._id}>
                      {teacher.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Subject</InputLabel>
                <Select
                  value={filters.subject}
                  label="Subject"
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                >
                  <MenuItem value="">All Subjects</MenuItem>
                  {subjects.map((subject) => (
                    <MenuItem key={subject._id} value={subject._id}>
                      {subject.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Teacher</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Status</TableCell>
                {user?.role === 'admin' && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule._id}>
                  <TableCell>{schedule.dayOfWeek}</TableCell>
                  <TableCell>{schedule.startTime} - {schedule.endTime}</TableCell>
                  <TableCell>
                    {schedule.subject.name}
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      {schedule.subject.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{schedule.teacher.name}</TableCell>
                  <TableCell>
                    {schedule.room.name}
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      {schedule.room.building} Floor {schedule.room.floor}
                    </Typography>
                  </TableCell>
                  <TableCell>{schedule.class}</TableCell>
                  <TableCell>{schedule.grade}</TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.isActive ? 'Active' : 'Inactive'}
                      color={schedule.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  {user?.role === 'admin' && (
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditSchedule(schedule)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setScheduleToDelete(schedule);
                          setDeleteDialogOpen(true);
                        }}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalSchedules}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Create Schedule Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Schedule</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={formData.subject}
                  label="Subject"
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject._id} value={subject._id}>
                      {subject.name} ({subject.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Teacher</InputLabel>
                <Select
                  value={formData.teacher}
                  label="Teacher"
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher._id} value={teacher._id}>
                      {teacher.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Room</InputLabel>
                <Select
                  value={formData.room}
                  label="Room"
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                >
                  {rooms.map((room) => (
                    <MenuItem key={room._id} value={room._id}>
                      {room.name} - {room.building} Floor {room.floor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Day of Week</InputLabel>
                <Select
                  value={formData.dayOfWeek}
                  label="Day of Week"
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <MenuItem key={day} value={day}>{day}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Class"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Grade"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSchedule} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Schedule</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={formData.subject}
                  label="Subject"
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject._id} value={subject._id}>
                      {subject.name} ({subject.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Teacher</InputLabel>
                <Select
                  value={formData.teacher}
                  label="Teacher"
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher._id} value={teacher._id}>
                      {teacher.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Room</InputLabel>
                <Select
                  value={formData.room}
                  label="Room"
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                >
                  {rooms.map((room) => (
                    <MenuItem key={room._id} value={room._id}>
                      {room.name} - {room.building} Floor {room.floor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Day of Week</InputLabel>
                <Select
                  value={formData.dayOfWeek}
                  label="Day of Week"
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <MenuItem key={day} value={day}>{day}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Class"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Grade"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.isActive}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value })}
                >
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateSchedule} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Schedule</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this schedule?
            {scheduleToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Subject:</strong> {scheduleToDelete.subject?.name}<br />
                  <strong>Teacher:</strong> {scheduleToDelete.teacher?.name}<br />
                  <strong>Room:</strong> {scheduleToDelete.room?.name}<br />
                  <strong>Time:</strong> {scheduleToDelete.dayOfWeek} {scheduleToDelete.startTime} - {scheduleToDelete.endTime}
                </Typography>
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteSchedule} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Layout>
  );
}