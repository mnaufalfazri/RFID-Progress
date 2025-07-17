import { useEffect,useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container, Box, Typography, Paper, Button, Grid,
  TextField, MenuItem, Alert
} from '@mui/material';
import Layout from '../../components/Layout';
import { isAuthenticated } from '../../utils/auth';
import toast from 'react-hot-toast';

export default function CreateClass() {
  const router = useRouter();
  const auth = isAuthenticated();

  // Role protection: only admin
  useEffect(() => {
      const auth = isAuthenticated();
          if (!auth) {
            router.push('/login');
            return;
          }
      
    }, []);

  const [formData, setFormData] = useState({
    subject_id: '',
    name: '',
    class_level: '',
    class_name: '',
    schedule_day: '',
    schedule_start: '',
    schedule_end: '',
    room: '',
    max_students: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dummy subjects (replace with API when backend ready)
  const subjects = [
    { id: '64a1-subject-1', name: 'Matematika' },
    { id: '64a1-subject-2', name: 'IPA' },
    { id: '64a1-subject-3', name: 'Bahasa Inggris' },
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulate API call
      console.log('Submitting data:', formData);

      // Replace this with axios.post later
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Class created successfully!');
      router.push('/classes');
    } catch (err) {
      console.error(err);
      setError('Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Create Class | School System</title>
      </Head>
      <Container maxWidth="sm">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" gutterBottom>
            Create New Class
          </Typography>
          <Paper sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    select
                    label="Subject"
                    name="subject_id"
                    value={formData.subject_id}
                    onChange={handleChange}
                    fullWidth
                    required
                  >
                    {subjects.map((subject) => (
                      <MenuItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Class Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Class Level"
                    name="class_level"
                    type="number"
                    value={formData.class_level}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Class Code (e.g. 5A)"
                    name="class_name"
                    value={formData.class_name}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    label="Schedule Day"
                    name="schedule_day"
                    value={formData.schedule_day}
                    onChange={handleChange}
                    fullWidth
                    required
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                      <MenuItem key={day} value={day}>
                        {day}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Start Time"
                    name="schedule_start"
                    type="time"
                    value={formData.schedule_start}
                    onChange={handleChange}
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Time"
                    name="schedule_end"
                    type="time"
                    value={formData.schedule_end}
                    onChange={handleChange}
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Room"
                    name="room"
                    value={formData.room}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Max Students"
                    name="max_students"
                    type="number"
                    value={formData.max_students}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Class'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
}
