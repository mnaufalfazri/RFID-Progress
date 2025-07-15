// pages/register-device.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  Container, Box, Typography, TextField, Button, Paper,
  CircularProgress, Alert
} from "@mui/material";
import Layout from "../components/Layout";
import axios from "axios";
import toast from "react-hot-toast";
import { isAuthenticated } from "../utils/auth";

export default function RegisterDevice() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    deviceId: "",
    location: "",
    description: "",
    ipAddress: "",
    wifiSignal: "",
    uptime: "",
    cacheSize: "",
    firmware: "",
    macAddress: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push("/login");
      return;
    }

    // Only allow admin
    if (auth.user.role !== "admin") {
      toast.error("You are not authorized to access this page");
      router.push("/");
    }
  }, [router]);

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
    setError("");

    try {
      const auth = isAuthenticated();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/devices/register`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      if (response.data.success) {
        toast.success("Device registered successfully");
        router.push("/devices"); // Redirect to device list
      } else {
        setError("Failed to register device");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to register device"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Register Device | School Attendance System</title>
      </Head>

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

          <form onSubmit={handleSubmit}>
            {[
              { label: "Device ID", name: "deviceId", required: true },
              { label: "Location", name: "location", required: false },
              { label: "Description", name: "description", required: false },
              { label: "IP Address", name: "ipAddress", required: false },
              { label: "WiFi Signal (dBm)", name: "wifiSignal", required: false },
              { label: "Uptime (seconds)", name: "uptime", required: false },
              { label: "Cache Size", name: "cacheSize", required: false },
              { label: "Firmware", name: "firmware", required: false },
              { label: "MAC Address", name: "macAddress", required: false },
            ].map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                fullWidth
                required={field.required}
                margin="normal"
                variant="outlined"
              />
            ))}

            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                type="submit"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Register Device"}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </Layout>
  );
}
