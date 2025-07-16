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
  Search, Add, Edit, Delete, ArrowBack, MeetingRoom,
  CheckCircle, Cancel
} from '@mui/icons-material';
import axios from 'axios';
import { isAuthenticated } from '../utils/auth';
import Layout from '../components/Layout';

export default function Rooms() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRooms, setTotalRooms] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    capacity: '',
    floor: '',
    building: '',
    facilities: []
  });
  const [facilityInput, setFacilityInput] = useState('');

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    // Check if user has permission to access rooms (admin only)
    if (auth.user.role !== 'admin') {
      router.push('/');
      return;
    }

    setUser(auth.user);
    fetchRooms();
  }, [page, rowsPerPage]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const auth = isAuthenticated();

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/rooms?page=${page + 1}&limit=${rowsPerPage}${searchTerm ? `&search=${searchTerm}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setRooms(response.data.data);
        setTotalRooms(response.data.total);
      }
    } catch (err) {
      setError('Failed to fetch rooms');
      console.error('Error fetching rooms:', err);
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
    fetchRooms();
  };

  const handleCreateRoom = async () => {
    try {
      const auth = isAuthenticated();
      
      const submitData = {
        ...formData,
        capacity: parseInt(formData.capacity)
      };
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/rooms`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setCreateDialogOpen(false);
        setFormData({ name: '', code: '', capacity: '', floor: '', building: '', facilities: [] });
        setFacilityInput('');
        fetchRooms();
      }
    } catch (err) {
      setError('Failed to create room');
      console.error('Error creating room:', err);
    }
  };

  const handleUpdateRoom = async () => {
    try {
      const auth = isAuthenticated();
      
      const submitData = {
        ...formData,
        capacity: parseInt(formData.capacity)
      };
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/rooms/${roomToEdit._id}`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setEditDialogOpen(false);
        setRoomToEdit(null);
        setFormData({ name: '', code: '', capacity: '', floor: '', building: '', facilities: [] });
        setFacilityInput('');
        fetchRooms();
      }
    } catch (err) {
      setError('Failed to update room');
      console.error('Error updating room:', err);
    }
  };

  const deleteRoom = async () => {
    try {
      const auth = isAuthenticated();

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/rooms/${roomToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        setDeleteDialogOpen(false);
        setRoomToDelete(null);
        fetchRooms();
      }
    } catch (err) {
      setError('Failed to delete room');
      console.error('Error deleting room:', err);
    }
  };

  const openCreateDialog = () => {
    setFormData({ name: '', code: '', capacity: '', floor: '', building: '', facilities: [] });
    setFacilityInput('');
    setCreateDialogOpen(true);
  };

  const openEditDialog = (room) => {
    setRoomToEdit(room);
    setFormData({
      name: room.name,
      code: room.code,
      capacity: room.capacity.toString(),
      floor: room.floor || '',
      building: room.building || '',
      facilities: room.facilities || []
    });
    setFacilityInput('');
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (room) => {
    setRoomToDelete(room);
    setDeleteDialogOpen(true);
  };

  const addFacility = () => {
    if (facilityInput.trim() && !formData.facilities.includes(facilityInput.trim())) {
      setFormData({
        ...formData,
        facilities: [...formData.facilities, facilityInput.trim()]
      });
      setFacilityInput('');
    }
  };

  const removeFacility = (facilityToRemove) => {
    setFormData({
      ...formData,
      facilities: formData.facilities.filter(facility => facility !== facilityToRemove)
    });
  };

  if (loading && rooms.length === 0) {
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
        <title>Rooms Management - School Attendance System</title>
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
            <MeetingRoom sx={{ mr: 1, verticalAlign: 'middle' }} />
            Rooms Management
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
              label="Search rooms..."
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
                Add Room
              </Button>
            )}
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Building</TableCell>
                  <TableCell>Floor</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Facilities</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {room.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{room.name}</TableCell>
                    <TableCell>{room.building || '-'}</TableCell>
                    <TableCell>{room.floor || '-'}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {room.facilities?.slice(0, 2).map((facility, index) => (
                          <Chip key={index} label={facility} size="small" variant="outlined" />
                        ))}
                        {room.facilities?.length > 2 && (
                          <Chip label={`+${room.facilities.length - 2}`} size="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={room.active ? <CheckCircle /> : <Cancel />}
                        label={room.active ? 'Active' : 'Inactive'}
                        color={room.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {user?.role === 'admin' && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(room)}
                                color="primary"
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => openDeleteDialog(room)}
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
            count={totalRooms}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Paper>

        {/* Create Room Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Room</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Room Code"
                  fullWidth
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Capacity"
                  type="number"
                  fullWidth
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Room Name"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Building"
                  fullWidth
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Floor"
                  fullWidth
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    label="Add Facility"
                    fullWidth
                    value={facilityInput}
                    onChange={(e) => setFacilityInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFacility()}
                  />
                  <Button onClick={addFacility} variant="outlined">
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {formData.facilities.map((facility, index) => (
                    <Chip
                      key={index}
                      label={facility}
                      onDelete={() => removeFacility(facility)}
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRoom} variant="contained">Create</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Room Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Room</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Room Code"
                  fullWidth
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Capacity"
                  type="number"
                  fullWidth
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Room Name"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Building"
                  fullWidth
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Floor"
                  fullWidth
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    label="Add Facility"
                    fullWidth
                    value={facilityInput}
                    onChange={(e) => setFacilityInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFacility()}
                  />
                  <Button onClick={addFacility} variant="outlined">
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {formData.facilities.map((facility, index) => (
                    <Chip
                      key={index}
                      label={facility}
                      onDelete={() => removeFacility(facility)}
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateRoom} variant="contained">Update</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the room "{roomToDelete?.name}"?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={deleteRoom} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}