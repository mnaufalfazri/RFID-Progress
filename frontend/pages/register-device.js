// pages/register-device.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip
} from '@mui/material';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { isAuthenticated } from '../utils/auth';

const RegisterDevice = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    deviceId: '',
    location: 'ENTRANCE_GATE',
    room: ''
  });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);

  // Check authentication
  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    // Check if user has permission to register devices (admin only)
    if (auth.user.role !== 'admin') {
      router.push('/');
      return;
    }

    setUser(auth.user);
  }, [router]);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRooms(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);



  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.deviceId.trim()) {
      setError('Device ID is required');
      setLoading(false);
      return;
    }
    
    // Validate Device ID format
    const deviceIdRegex = /^RFID-[0-9A-F]{1,8}$/;
    if (!deviceIdRegex.test(formData.deviceId)) {
      setError('Please enter a valid Device ID (e.g., RFID-B0D1A400)');
      setLoading(false);
      return;
    }

    if (!formData.location) {
      setError('Location is required');
      setLoading(false);
      return;
    }

    if (formData.location === 'CLASSROOM' && !formData.room) {
      setError('Room is required for classroom devices');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const submitData = {
        deviceId: formData.deviceId.trim(),
        location: formData.location,
        room: formData.location === 'CLASSROOM' ? formData.room : null
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Device registered successfully!');
        setFormData({
          deviceId: '',
          location: 'ENTRANCE_GATE',
          room: ''
        });
        setTimeout(() => {
          router.push('/devices');
        }, 2000);
      } else {
        setError(data.message || 'Failed to register device');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Register New Device
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Instructions:</strong><br/>
              1. Power on your RFID device<br/>
              2. Look at the OLED display for "Device ID"<br/>
              3. Enter the Device ID shown on the device below (e.g., RFID-B0D1A400)
            </Typography>
          </Alert>

            <TextField
              fullWidth
              label="Device ID"
              name="deviceId"
              value={formData.deviceId}
              onChange={handleChange}
              margin="normal"
              required
              placeholder="RFID-B0D1A400"
              helperText="Enter the Device ID shown on your RFID device"
            />
            
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Location</InputLabel>
              <Select
                name="location"
                value={formData.location}
                onChange={handleChange}
                label="Location"
              >
                <MenuItem value="CLASSROOM">Classroom Device</MenuItem>
                <MenuItem value="ENTRANCE_GATE">Entrance Gate</MenuItem>
              </Select>
            </FormControl>
            
            {formData.location === 'CLASSROOM' && (
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Room</InputLabel>
                <Select
                  name="room"
                  value={formData.room}
                  onChange={handleChange}
                  label="Room"
                >
                  {rooms.map((room) => (
                    <MenuItem key={room._id} value={room._id}>
                      {room.name} - {room.building} Floor {room.floor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register Device'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </Layout>
  );
};

export default RegisterDevice;
