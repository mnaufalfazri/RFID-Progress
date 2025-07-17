import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container, Box, Typography, Paper, Button, List, ListItem,
  ListItemText, Checkbox, Alert
} from '@mui/material';
import Layout from '../../../components/Layout';
import { isAuthenticated } from '../../../utils/auth';
import toast from 'react-hot-toast';

export default function EnrollStudents() {
  const router = useRouter();
  const { id } = router.query;
  const auth = isAuthenticated();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const dummyStudents = [
        { _id: 'stu1', name: 'John Doe', student_id: '12345' },
        { _id: 'stu2', name: 'Jane Smith', student_id: '67890' }
      ];
      await new Promise(resolve => setTimeout(resolve, 500));
      setStudents(dummyStudents);
    } catch (err) {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (studentId) => {
    setSelected((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleEnroll = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Students enrolled successfully');
      router.push('/class');
    } catch (err) {
      toast.error('Failed to enroll students');
    }
  };

  return (
    <Layout>
      <Head>
        <title>Enroll Students | School System</title>
      </Head>
      <Container maxWidth="sm">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" gutterBottom>Enroll Students</Typography>
          {loading ? (
            <Typography>Loading...</Typography>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              <Paper sx={{ mb: 2 }}>
                <List>
                  {students.map(student => (
                    <ListItem
                      key={student._id}
                      button
                      onClick={() => handleToggle(student._id)}
                    >
                      <Checkbox
                        checked={selected.includes(student._id)}
                        onChange={() => handleToggle(student._id)}
                      />
                      <ListItemText
                        primary={student.name}
                        secondary={`ID: ${student.student_id}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
              <Button
                variant="contained"
                color="primary"
                onClick={handleEnroll}
                disabled={selected.length === 0}
              >
                Enroll Selected Students
              </Button>
            </>
          )}
        </Box>
      </Container>
    </Layout>
  );
}
