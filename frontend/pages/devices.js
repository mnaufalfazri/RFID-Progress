import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Container, Box, Typography, Paper, Button, Grid, 
  CircularProgress, Chip, Alert, Card, CardContent, 
  CardActions, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions, TextField, IconButton,
  Tooltip, Divider, Tab, Tabs, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { 
  Refresh, SignalWifi4Bar, SignalWifi3Bar, SignalWifi2Bar, 
  SignalWifi1Bar, SignalWifiOff, Edit, Delete,
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
    description: '',
    location: '',
    room: ''
  });
  const [rooms, setRooms] = useState([]);
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

    // Check if user has permission to access devices
    if (auth.user.role !== 'admin' && auth.user.role !== 'staff') {
      router.push('/');
      return;
    }

    // Load devices
    fetchDevices();
    fetchSystemInfo();
    fetchRooms();

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

  const fetchRooms = async () => {
    try {
      const auth = isAuthenticated();
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/rooms`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const handleEditDevice = (device) => {
    setCurrentDevice(device);
    setFormData({
      description: device.description || '',
      location: device.location || '',
      room: device.room?._id || ''
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

  const handleDeleteDevice = async (device) => {
    if (window.confirm(`Are you sure you want to delete device ${device.deviceId}?`)) {
      try {
        const auth = isAuthenticated();
        
        const response = await axios.delete(
           `${process.env.NEXT_PUBLIC_API_URL}/devices/${device.deviceId}`,
          {
            headers: {
              Authorization: `Bearer ${auth.token}`
            }
          }
        );

        if (response.data.success) {
          // Remove device from the list
          setDevices(devices.filter(d => d.deviceId !== device.deviceId));
          toast.success('Device deleted successfully');
        }
      } catch (err) {
        toast.error('Failed to delete device');
        console.error(err);
      }
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
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Chip 
                              label={device.location || 'Unknown'} 
                              color={device.location === 'CLASSROOM' ? 'primary' : 'secondary'}
                              size="small"
                              sx={{ mr: 1 }}
                            />

                            {device.room && (
                              <Typography variant="body2" color="text.secondary">
                                {device.room.name} - {device.room.building} Floor {device.room.floor}
                              </Typography>
                            )}
                          </Box>
                          
                          {device.macAddress && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              MAC: {device.macAddress}
                            </Typography>
                          )}
                          
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
                            <Tooltip title="Delete Device">
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteDevice(device)}
                                color="error"
                              >
                                <Delete fontSize="small" />
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
                        ESP32 Connection Settings (Updated Firmware)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        This configuration uses hashed MAC ID for device identification. The device will display its ID on OLED for admin registration.
                      </Typography>

                      <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mt: 2, overflow: 'auto' }}>
                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {`// ESP32 RFID Configuration (Updated for Hashed MAC ID)
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <mbedtls/sha256.h>

// WiFi Configuration
const char* ssid = "YourNetworkName";
const char* password = "YourNetworkPassword";

// Server Configuration
const char* serverUrl = "http://${systemInfo.localIp || 'your-server-ip'}:${systemInfo.serverPort || 5000}/api";

// Pin definitions
#define RST_PIN         22
#define SS_PIN          21
#define BUZZER_PIN      2
#define LED_PIN         4

// RFID reader
MFRC522 mfrc522(SS_PIN, RST_PIN);

// OLED display (128x64)
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

// Device variables
String deviceId;
String macAddress;
String hashedMacId;
String deviceLocation = "";
String roomInfo = "";

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize OLED
  u8g2.begin();
  
  // Initialize SPI and RFID
  SPI.begin();
  mfrc522.PCD_Init();
  
  // Get MAC address and generate device ID
  macAddress = WiFi.macAddress();
  hashedMacId = generateHashedMacId(macAddress);
  deviceId = "RFID-" + hashedMacId;
  
  // Display hashed MAC ID on OLED for admin registration
  displayDeviceInfo();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Connect to server (will create device entry if not exists)
  connectToServer();
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    return;
  }
  
  // Send heartbeat every 30 seconds
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 30000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // Process RFID scanning
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String rfidTag = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      rfidTag += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
      rfidTag += String(mfrc522.uid.uidByte[i], HEX);
    }
    rfidTag.toUpperCase();
    
    processAttendance(rfidTag);
    
    mfrc522.PICC_HaltA();
    delay(1000);
  }
  
  delay(100);
}

// Generate hashed MAC ID for device identification
String generateHashedMacId(String mac) {
  mac.replace(":", "");
  mac.toUpperCase();
  
  unsigned char hash[32];
  mbedtls_sha256_context ctx;
  mbedtls_sha256_init(&ctx);
  mbedtls_sha256_starts(&ctx, 0);
  mbedtls_sha256_update(&ctx, (const unsigned char*)mac.c_str(), mac.length());
  mbedtls_sha256_finish(&ctx, hash);
  mbedtls_sha256_free(&ctx);
  
  String hashedId = "";
  for (int i = 0; i < 4; i++) {
    if (hash[i] < 0x10) hashedId += "0";
    hashedId += String(hash[i], HEX);
  }
  hashedId.toUpperCase();
  
  return hashedId;
}

void displayDeviceInfo() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(0, 15, "RFID Device");
  u8g2.drawStr(0, 30, "Device ID:");
  u8g2.drawStr(0, 45, deviceId.c_str());
  u8g2.drawStr(0, 60, "Register in Admin");
  u8g2.sendBuffer();
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi!");
}

void connectToServer() {
  HTTPClient http;
  http.begin(String(serverUrl) + "/devices/connect");
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = deviceId;
  doc["macAddress"] = macAddress;
  doc["hashedMacId"] = hashedMacId;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["wifiSignal"] = WiFi.RSSI();
  doc["firmware"] = "ESP32-RFID-v2.0";
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  if (httpResponseCode > 0) {
    String response = http.getString();
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);
    
    if (responseDoc["success"]) {
      deviceLocation = responseDoc["data"]["location"].as<String>();
      
      Serial.println("Connected to server");
      Serial.println("Device registered successfully");
    }
  }
  http.end();
}

void sendHeartbeat() {
  HTTPClient http;
  http.begin(String(serverUrl) + "/devices/heartbeat");
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(512);
  doc["deviceId"] = deviceId;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["wifiSignal"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  if (httpResponseCode > 0) {
    String response = http.getString();
    DynamicJsonDocument responseDoc(512);
    deserializeJson(responseDoc, response);
    
    if (responseDoc["success"]) {
      // Heartbeat successful
      Serial.println("Heartbeat sent");
    }
  }
  http.end();
}

void processAttendance(String rfidTag) {
  HTTPClient http;
  http.begin(String(serverUrl) + "/attendance/scan");
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(512);
  doc["rfidTag"] = rfidTag;
  doc["deviceId"] = deviceId;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  if (httpResponseCode > 0) {
    String response = http.getString();
    DynamicJsonDocument responseDoc(512);
    deserializeJson(responseDoc, response);
    
    if (responseDoc["success"]) {
      // Success feedback
      digitalWrite(LED_PIN, HIGH);
      tone(BUZZER_PIN, 1000, 200);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      
      // Display on OLED
      u8g2.clearBuffer();
      u8g2.setFont(u8g2_font_ncenB08_tr);
      u8g2.drawStr(0, 15, "Attendance");
      u8g2.drawStr(0, 30, "Recorded!");
      u8g2.drawStr(0, 45, responseDoc["data"]["studentName"].as<String>().c_str());
      u8g2.sendBuffer();
      delay(2000);
      displayDeviceInfo();
    } else {
      // Error feedback
      tone(BUZZER_PIN, 500, 500);
      
      u8g2.clearBuffer();
      u8g2.setFont(u8g2_font_ncenB08_tr);
      u8g2.drawStr(0, 15, "Error!");
      u8g2.drawStr(0, 30, responseDoc["message"].as<String>().c_str());
      u8g2.sendBuffer();
      delay(2000);
      displayDeviceInfo();
    }
  }
  http.end();
}`}
                        </pre>
                      </Box>
                      
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Registration Process:</strong><br/>
                          1. Upload this code to your ESP32<br/>
                          2. The device will display its hashed MAC ID on the OLED<br/>
                          3. Use the displayed ID to register the device through admin panel<br/>
                          4. Set the device location (Classroom or Entrance Gate)<br/>
                          5. If classroom, assign it to a specific room
                        </Typography>
                      </Alert>
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
          
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Location</InputLabel>
            <Select
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              label="Location"
            >
              <MenuItem value="CLASSROOM">Classroom Device</MenuItem>
              <MenuItem value="ENTRANCE_GATE">Entrance Gate</MenuItem>
            </Select>
          </FormControl>
          
          {formData.location === 'CLASSROOM' && (
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel>Room</InputLabel>
              <Select
                name="room"
                value={formData.room}
                onChange={handleInputChange}
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
