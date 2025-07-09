"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import { useForm } from "react-hook-form"
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Snackbar,
} from "@mui/material"
import { Save, ArrowBack, Refresh, CreditCard } from "@mui/icons-material"
import Layout from "../components/Layout"
import { isAuthenticated } from "../utils/auth"
import axios from "axios"
import toast from "react-hot-toast"

// Steps definition updated to include descriptions for the visual indicator
const steps = [
  { title: "Informasi Pribadi", description: "Masukkan Detail Pribadi Siswa" },
  { title: "Informasi Akademik", description: "Masukkan Data Akademik Siswa" },
  { title: "Informasi Kontak", description: "Masukkan Detail Kontak Siswa" },
]

export default function RegisterStudent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const [activeStep, setActiveStep] = useState(0)
  const [rfidLoading, setRfidLoading] = useState(false)
  const [rfidSnackbar, setRfidSnackbar] = useState(false)
  const [rfidSnackbarMessage, setRfidSnackbarMessage] = useState("")
  const [rfidPolling, setRfidPolling] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(null)

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    const auth = isAuthenticated()
    if (!auth) {
      router.push("/login")
      return
    }
    if (auth.user.role !== "admin" && auth.user.role !== "teacher") {
      router.push("/")
      toast.error("You do not have permission to access this page")
      return
    }
    setUser(auth.user)
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [router, pollingInterval])

  useEffect(() => {
  const handlePopState = (event) => {
    event.preventDefault()

    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1)
      router.push(router.asPath, undefined, { shallow: true })
    } else {
      router.push('/')
    }
  }

  window.addEventListener('popstate', handlePopState)

  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}, [activeStep, router])

  const fetchLastRfidTag = async () => {
    try {
      setRfidLoading(true)
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/last-rfid`)
      if (response.data && response.data.data && response.data.data.rfidTag) {
        setValue("rfidTag", response.data.data.rfidTag)
        setRfidSnackbarMessage("RFID tag berhasil diambil dari perangkat!")
        setRfidSnackbar(true)
        if (rfidPolling) {
          stopRfidPolling()
        }
      } else {
        setRfidSnackbarMessage("Tidak ada RFID tag terdeteksi. Silakan scan kartu pada perangkat.")
        setRfidSnackbar(true)
      }
    } catch (error) {
      console.error("Error fetching RFID tag:", error)
      setRfidSnackbarMessage(
        "Gagal mengambil RFID tag dari server: " + (error.response?.data?.message || error.message),
      )
      setRfidSnackbar(true)
    } finally {
      setRfidLoading(false)
    }
  }

  const startRfidPolling = () => {
    setRfidPolling(true)
    setRfidSnackbarMessage("Menunggu kartu RFID di-scan pada perangkat...")
    setRfidSnackbar(true)
    const interval = setInterval(fetchLastRfidTag, 2000)
    setPollingInterval(interval)
  }

  const stopRfidPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    setRfidPolling(false)
    setRfidSnackbarMessage("Polling RFID dihentikan.")
    setRfidSnackbar(true)
  }

  const handleCloseSnackbar = () => {
    setRfidSnackbar(false)
  }

  const onSubmit = async (data) => {
    // Pastikan hanya submit ketika di step terakhir
    if (activeStep !== steps.length - 1) {
      return
    }

    try {
      setLoading(true)
      setError("")
      const auth = isAuthenticated()
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/students`, data, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      })
      if (response.data.success) {
        toast.success("Student registered successfully!")
        router.push("/students")
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register student. Please try again.")
      toast.error("Registration failed")
    } finally {
      setLoading(false)
    }
  }

  // Modified handleNext for validation and correct step navigation
  const handleNext = async (e) => {
    // Prevent form submission
    e.preventDefault()

    let isValid = false
    if (activeStep === 0) {
      // Validate fields for "Personal Information" (step 0)
      isValid = await trigger(["name", "studentId", "rfidTag", "gender"])
    } else if (activeStep === 1) {
      // Validate fields for "Academic Information" (step 1)
      isValid = await trigger(["class", "grade"])
    } else if (activeStep === 2) {
      // Validate fields for "Contact Information" (step 2) - optional fields
      isValid = true // Since contact fields are optional
    }

    if (isValid) {
      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1)
      }
    }
  }

  const handlePrev = (e) => {
    e.preventDefault()
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  // Handle final form submission
  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    // Trigger validation for all fields before final submission
    const isValid = await trigger()
    if (isValid) {
      handleSubmit(onSubmit)(e)
    }
  }

  return (
    <Layout>
      <Head>
        <title>Register Student | School Attendance System</title>
      </Head>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, my:-4 }}>
        <Box sx={{ my: { xs: 2, md: 4 } }}>
          {/* Step Indicator - Responsive design */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              justifyContent: "center",
              alignItems: "center",
              mb: { xs: 3, md: 5 },
              gap: { xs: 2, md: 0 },
            }}
          >
            {steps.map((step, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexDirection: { xs: "row", md: "row" },
                  width: { xs: "100%", md: "auto" },
                  justifyContent: { xs: "flex-start", md: "center" },
                }}
              >
                {/* Numbered Circle */}
                <Box
                  sx={{
                    display: { sm: "none", xs:"none", md: "flex" },
                    width: { xs: 32, md: 40 },
                    height: { xs: 32, md: 40 },
                    borderRadius: "50%",
                    backgroundColor: index <= activeStep ?  "#1976D2" : "#E0E0E0",
                    color: index <= activeStep ? "white" : "black",
                    justifyContent: "center",
                    alignItems: "center",
                    fontWeight: "bold",
                    fontSize: { xs: "1rem", md: "1.2rem" },
                    mr: { xs: 2, md: 1 },
                    flexShrink: 0,
                  }}
                >
                  {`0${index + 1}`}
                </Box>
                {/* Step Title and Description */}
                <Box sx={{ mr: { xs: 0, md: 2 }, flex: 1 ,display: { md: "block", sm: "none", xs: "none" }}}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.75rem", md: "0.875rem" },  }}
                  >
                    {step.title}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: "bold",
                      fontSize: { xs: "0.875rem", md: "1rem" },
                    }}
                  >
                    {step.description}
                  </Typography>
                </Box>
                {/* Divider Line - Hide on mobile, show on desktop */}
                {index < steps.length - 1 && (
                  <Divider
                    orientation="horizontal"
                    flexItem
                    sx={{
                      display: { xs: "none", sm: "none", md: "block" },
                      width: "50px",
                      height: "2px",
                      backgroundColor: index < activeStep ? "#1976D2" : "#E0E0E0",
                      mx: 2,
                      my: 5,
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>

          {/* Page Title and Subtitle */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              mb: 3,
              gap: { xs: 2, sm: 0 },
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontSize: { sm: "2rem", md: "2.125rem" },
              }}
            >
              {steps[activeStep].title}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => router.push("/")}
              sx={{
                minWidth: { xs: "100%", sm: "auto" },
                order: { xs: -1, sm: 0 },
                display: {xs: "none", sm: "inline-flex"}
              }}
            >
              Kembali ke Dashboard
            </Button>
          </Box>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{
              mb: 4,
              textAlign: "left",
              fontSize: { xs: "0.875rem", md: "1rem" },
              px: { xs: 1, sm: 0 },
            }}
          >
            {steps[activeStep].description}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              mx: { xs: -1, sm: 0 },
            }}
          >
            <Box component="form" noValidate>
              {activeStep === 0 && (
                <>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 2,
                      fontSize: { xs: "1.1rem", md: "1.25rem" },
                    }}
                  >
                    Informasi Pribadi
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        required
                        fullWidth
                        label="Nama Lengkap"
                        {...register("name", {
                          required: "Name is required",
                          maxLength: {
                            value: 50,
                            message: "Name cannot exceed 50 characters",
                          },
                        })}
                        error={Boolean(errors.name)}
                        helperText={errors.name?.message}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        required
                        fullWidth
                        label="ID Siswa"
                        {...register("studentId", {
                          required: "Student ID is required",
                        })}
                        error={Boolean(errors.studentId)}
                        helperText={errors.studentId?.message}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        required
                        fullWidth
                        label="Gender"
                        defaultValue=""
                        {...register("gender", {
                          required: "Gender is required",
                        })}
                        error={Boolean(errors.gender)}
                        helperText={errors.gender?.message}
                      >
                        <MenuItem value="male">Laki-laki</MenuItem>
                        <MenuItem value="female">Perempuan</MenuItem>
                        <MenuItem value="other">Lainnya</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Tanggal Lahir"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        {...register("dateOfBirth")}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Tag RFID"
                        {...register("rfidTag", { required: "Tag RFID is required" })}
                        error={!!errors.rfidTag}
                        helperText={errors.rfidTag ? errors.rfidTag.message : "Scan kartu RFID untuk mengisi secara otomatis"}
                        margin="normal"
                        variant="outlined"
                        InputProps={{
                          endAdornment: (
                            <Tooltip title="Ambil RFID dari perangkat">
                              <IconButton onClick={fetchLastRfidTag} disabled={rfidLoading} size="small">
                                <Refresh />
                              </IconButton>
                            </Tooltip>
                          ),
                        }}
                      />
                      <Box sx={{ mt: 2, display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
                        <Button
                          variant="outlined"
                          color={rfidPolling ? "error" : "primary"}
                          startIcon={rfidPolling ? null : <CreditCard />}
                          onClick={rfidPolling ? stopRfidPolling : startRfidPolling}
                          disabled={rfidLoading}
                          fullWidth
                          sx={{ minHeight: 40 }}
                        >
                          {rfidPolling ? "Berhenti Polling" : "Mulai Polling RFID"}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </>
              )}

              {activeStep === 1 && (
                <>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 2,
                      fontSize: { xs: "1.1rem", md: "1.25rem" },
                    }}
                  >
                    Informasi Akademik
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        required
                        fullWidth
                        label="Kelas"
                        {...register("class", {
                          required: "Kelas is required",
                        })}
                        error={Boolean(errors.class)}
                        helperText={errors.class?.message}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        required
                        fullWidth
                        label="Tingkat"
                        {...register("grade", {
                          required: "Tingkat is required",
                        })}
                        error={Boolean(errors.grade)}
                        helperText={errors.grade?.message}
                      />
                    </Grid>
                  </Grid>
                </>
              )}

              {activeStep === 2 && (
                <>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 2,
                      fontSize: { xs: "1.1rem", md: "1.25rem" },
                    }}
                  >
                    Informasi Kontak
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nomor Telepon Orang Tua/Wali"
                        {...register("parentContact", {
                          pattern: {
                            value: /^(\+\d{1,3}[- ]?)?\d{10}$/,
                            message: "Tolong masukkan nomor telepon yang valid",
                          },
                        })}
                        error={Boolean(errors.parentContact)}
                        helperText={errors.parentContact?.message}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Alamat" multiline rows={2} {...register("address")} />
                    </Grid>
                  </Grid>
                </>
              )}

              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "space-between",
                  gap: { xs: 2, sm: 0 },
                }}
              >
                {activeStep > 0 && (
                  <Button
                    variant="outlined"
                    onClick={handlePrev}
                    type="button"
                    fullWidth={true}
                    sx={{
                      order: { xs: 2, sm: 1 },
                      maxWidth: { sm: "120px" },
                    }}
                  >
                    Sebelumnya
                  </Button>
                )}

                {activeStep < steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    type="button"
                    fullWidth={true}
                    sx={{
                      order: { xs: 1, sm: 2 },
                      maxWidth: { sm: "120px" },
                      ml: { sm: "auto" },
                    }}
                  >
                    Lanjut
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    fullWidth={true}
                    sx={{
                      minWidth: 150,
                      order: { xs: 1, sm: 2 },
                      maxWidth: { sm: "200px" },
                      ml: { sm: "auto" },
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Registrasi Siswa"}
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        </Box>
        <Snackbar
          open={rfidSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          message={rfidSnackbarMessage}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />
      </Container>
    </Layout>
  )
}
