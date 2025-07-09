import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Container, Box, Typography, Paper, Button, Grid, 
  CircularProgress, Chip, Alert, Card, CardContent, 
  CardActions, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions, TextField, IconButton,
  Tooltip, Divider, Tab, Tabs
} from '@mui/material';
import { 
  Refresh, SignalWifi4Bar, SignalWifi3Bar, SignalWifi2Bar, 
  SignalWifi1Bar, SignalWifiOff, Delete, Edit, 
  AccessTime, Memory, Storage, Info, ArrowBack,
  Language, Wifi, RouterOutlined, SettingsEthernet
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { toJakartaTime } from '../utils/timezone';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { isAuthenticated } from '../utils/auth';

export default function Devices() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    location: '',
    description: ''
  });
  const [systemInfo, setSystemInfo] = useState({
    localIp: null,
    serverPort: null,
    publicUrl: null,
  });

  useEffect(() => {
    // Check if user is authenticated
    const auth = isAuthenticated();
    if (!auth) {
      router.push('/login');
      return;
    }

    // Load devices
    fetchDevices();
    fetchSystemInfo();

    // Set up a refresh interval
    const interval = setInterval(fetchDevices, 30000); // Refresh every 30 seconds
    
    // Clear interval on unmount
    return () => clearInterval(interval);
  }, [router]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const auth = isAuthenticated();
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/devices`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (response.data.success) {
        setDevices(response.data.data);
        setError('');
      }
    } catch (err) {
      setError('Failed to fetch devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const auth = isAuthenticated();
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/system/network-info`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (response.data.success) {
        setSystemInfo(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch system info:', err);
    }
  };

  const handleEditDevice = (device) => {
    setCurrentDevice(device);
    setFormData({
      location: device.location || '',
      description: device.description || ''
    });
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setCurrentDevice(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleUpdateDevice = async () => {
    try {
      const auth = isAuthenticated();
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/devices/${currentDevice.deviceId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );

      if (response.data.success) {
        // Update the devices list
        setDevices(devices.map(device => 
          device.deviceId === currentDevice.deviceId 
            ? { ...device, ...formData } 
            : device
        ));
        toast.success('Device updated successfully');
        handleDialogClose();
      }
    } catch (err) {
      toast.error('Failed to update device');
      console.error(err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'NORMAL':
        return 'success';
      case 'TAMPERED':
        return 'error';
      case 'OFFLINE':
        return 'default';
      default:
        return 'default';
    }
  };

  const getWifiIcon = (signal) => {
    if (signal === 0 || signal === undefined) return <SignalWifiOff />;
    if (signal > -50) return <SignalWifi4Bar color="success" />;
    if (signal > -60) return <SignalWifi3Bar color="success" />;
    if (signal > -70) return <SignalWifi2Bar color="warning" />;
    return <SignalWifi1Bar color="error" />;
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    result += `${minutes}m`;
    
    return result;
  };

  return (
    <Layout>
      <Head>
        <title>Manajemen Perangkat | Sistem Absensi Sekolah</title>
      </Head>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Manajemen Perangkat
            </Typography>
            <Box>
              <Button 
                variant="outlined" 
                startIcon={<ArrowBack />}
                onClick={() => router.push('/')}
                sx={{ mr: 2 }}
              >
                Kembali ke Dashboard
              </Button>
              <Button 
                variant="contained" 
                startIcon={<Refresh />}
                onClick={fetchDevices}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            sx={{ mb: 3 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Daftar Perangkat" id="tab-0" />
            <Tab label="Konfigurasi Jaringan" id="tab-1" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {tabValue === 0 && (
            <>
              {loading && devices.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : devices.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6">No devices found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Connect an ESP32 device to the system to see it here
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {devices.map((device) => (
                    <Grid item xs={12} md={6} lg={4} key={device.deviceId}>
                      <Card 
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          borderLeft: 5,
                          borderColor: device.status === 'NORMAL' 
                            ? 'success.main' 
                            : device.status === 'TAMPERED' 
                              ? 'error.main' 
                              : 'grey.400'
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" component="h2">
                              {device.deviceId}
                            </Typography>
                            <Chip 
                              label={device.status} 
                              color={getStatusColor(device.status)}
                              size="small"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {device.location || 'Unknown location'}
                          </Typography>
                          
                          <Typography variant="body2" gutterBottom>
                            {device.description || 'No description provided'}
                          </Typography>
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Tooltip title="WiFi Signal">
                              <Box sx={{ mr: 1 }}>
                                {getWifiIcon(device.wifiSignal)}
                              </Box>
                            </Tooltip>
                            <Typography variant="body2">
                              {device.ipAddress || 'No IP'} 
                              {device.wifiSignal ? ` (${device.wifiSignal} dBm)` : ''}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Tooltip title="Uptime">
                              <AccessTime fontSize="small" sx={{ mr: 1 }} />
                            </Tooltip>
                            <Typography variant="body2">
                              {formatUptime(device.uptime)}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Tooltip title="Cache Size">
                              <Storage fontSize="small" sx={{ mr: 1 }} />
                            </Tooltip>
                            <Typography variant="body2">
                              {device.cacheSize || 0} cached records
                            </Typography>
                          </Box>
                        </CardContent>
                        
                        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                            Last heartbeat: {device.lastHeartbeat 
                              ? formatDistanceToNow(toJakartaTime(device.lastHeartbeat), { addSuffix: true }) 
                              : 'Never'}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Tooltip title="Edit Device Info">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditDevice(device)}
                                sx={{ mr: 1 }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}

          {tabValue === 1 && (
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                Konfigurasi Jaringan
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Pengaturan ini memungkinkan Anda menghubungkan perangkat ke sistem absensi dari berbagai lokasi dalam jaringan Anda.
              </Typography>

              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <RouterOutlined sx={{ fontSize: 24, mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">Local Network</Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Server IP Address:</Typography>
                        <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
                          {systemInfo.localIp || 'Loading...'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Port:</Typography>
                        <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
                          {systemInfo.serverPort || 5000}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Local API URL:</Typography>
                        <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
                          {systemInfo.localIp ? `http://${systemInfo.localIp}:${systemInfo.serverPort || 5000}/api` : 'Loading...'}
                        </Typography>
                      </Box>

                      <Alert severity="info" sx={{ mt: 2 }}>
                        Use this address for ESP32 and other devices on the same network.
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Language sx={{ fontSize: 24, mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">Device Configuration</Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      
                      <Typography variant="body1" gutterBottom>
                        ESP32 Connection Settings
                      </Typography>

                      <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mt: 2, overflow: 'auto' }}>
                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {`// ESP32 Arduino Configuration
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YourNetworkName";
const char* password = "YourNetworkPassword";

// Server address (use your local IP)
const char* serverUrl = "http://${systemInfo.localIp || 'your-server-ip'}:${systemInfo.serverPort || 5000}/api/attendance/scan";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  
  Serial.println("Connected to WiFi network");
}

void loop() {
  // Send data to server
  if(WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Replace with actual RFID data
    String jsonPayload = "{\"rfidTag\":\"123456789\",\"deviceId\":\"ESP32-001\"}";
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if(httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(response);
    } else {
      Serial.print("Error on sending request: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  }
  
  delay(5000);
}`}
                        </pre>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Box>
      </Container>

      {/* Edit Device Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Edit Device</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update the device information for {currentDevice?.deviceId}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="location"
            label="Location"
            fullWidth
            variant="outlined"
            value={formData.location}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleUpdateDevice} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
