import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Container, Box, Typography, Paper, Button, Grid,
  CircularProgress, Alert, Card, CardContent, Chip
} from '@mui/material';
import Layout from '../../components/Layout';
import { isAuthenticated } from '../../utils/auth';
import toast from 'react-hot-toast';

export default function ClassesList() {
  const router = useRouter();
  const auth = isAuthenticated();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = isAuthenticated();
        if (!auth) {
          router.push('/login');
          return;
        }
    
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      // Simulate API
      const dummyClasses = [
        { _id: '1', name: 'Matematika 5A', class_level: 5, room: 'Ruang 5A', max_students: 30 },
        { _id: '2', name: 'IPA 6B', class_level: 6, room: 'Ruang 6B', max_students: 35 }
      ];
      await new Promise(resolve => setTimeout(resolve, 500)); // simulate delay
      setClasses(dummyClasses);
    } catch (err) {
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Classes | School System</title>
      </Head>
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h4">Daftar Kelas</Typography>
            <Button 
              variant="contained" 
              onClick={() => router.push('/classes/create-class')}
            >
              Buat Kelas
            </Button>
          </Box>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Grid container spacing={2}>
              {classes.map(cls => (
                <Grid item xs={12} sm={6} md={4} key={cls._id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{cls.name}</Typography>
                      <Typography variant="body2">Tingkat : {cls.class_level}</Typography>
                      <Typography variant="body2">{cls.room}</Typography>
                      <Typography variant="body2">Jumlah Maksimum Siswa: {cls.max_students}</Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={() => router.push(`/classes/${cls._id}/enroll`)}
                        >
                          Enroll Siswa
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </Layout>
  );
}
