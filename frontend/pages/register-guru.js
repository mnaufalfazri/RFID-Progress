import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container, Box, Typography, TextField, Button, Paper,
  CircularProgress, Alert
} from '@mui/material';
import Layout from '../components/Layout';
import axios from 'axios';
import toast from 'react-hot-toast';
import { isAuthenticated } from '../utils/auth';

export default function RegisterTeacher() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nip: '',
    mapelKeahlian: '',
    phone: '',
    hiredate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    if (auth.user.role !== 'admin') {
      toast.error('You are not authorized to access this page');
      router.push('/');
    }
  }, [router]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const auth = isAuthenticated();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      if (response.data.success) {
        toast.success('Guru berhasil didaftarkan');
        router.push('/teachers'); 
      } else {
        setError('Gagal mendaftarkan guru');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal mendaftarkan guru');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Register Teacher | School Attendance System</title>
      </Head>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Registrasi Guru 
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {[
              { label: 'NIP', name: 'nip', required: true },
              { label: 'Mapel Keahlian', name: 'mapelKeahlian', required: true },
              { label: 'Nomor Telepon', name: 'phone', required: true },
              { label: 'Hire Date', name: 'hiredate', required: true, type: 'date' },
            ].map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                type={field.type || 'text'}
                fullWidth
                required={field.required}
                margin="normal"
                variant="outlined"
                InputLabelProps={field.type === 'date' ? { shrink: true } : {}}
              />
            ))}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" type="submit" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Register Teacher'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </Layout>
  );
}
