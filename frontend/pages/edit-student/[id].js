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
import Layout from "../../components/Layout"
import { isAuthenticated } from "../../utils/auth"
import axios from "axios"
import toast from "react-hot-toast"

export default function EditStudent() {
  const router = useRouter()
  const { id } = router.query
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState(null)
  const [rfidLoading, setRfidLoading] = useState(false)
  const [rfidSnackbar, setRfidSnackbar] = useState(false)
  const [rfidSnackbarMessage, setRfidSnackbarMessage] = useState("")
  const [rfidPolling, setRfidPolling] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm()

  const watchPassword = watch("password")
  const watchConfirmPassword = watch("confirmPassword")

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
    if (id) {
      fetchStudent()
    }
  }, [id])

  const fetchStudent = async () => {
    try {
      setFetchLoading(true)
      const auth = isAuthenticated()
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      })
      if (response.data.success) {
        const student = response.data.data
        setValue("name", student.name)
        setValue("studentId", student.studentId)
        setValue("rfidTag", student.rfidTag)
        setValue("gender", student.gender || "")
        setValue("dateOfBirth", student.dateOfBirth ? student.dateOfBirth.split('T')[0] : "")
        setValue("class", student.class)
        setValue("grade", student.grade)
        setValue("parentContact", student.parentContact || "")
        setValue("address", student.address || "")
        setValue("email", student.email || "")
        setValue("active", student.active)
      }
    } catch (err) {
      setError("Failed to fetch student data")
      toast.error("Error fetching student data")
      console.error(err)
    } finally {
      setFetchLoading(false)
    }
  }

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
    try {
      setLoading(true)
      setError("")
      
      // Validate password confirmation if password is provided
      if (data.password && data.password !== data.confirmPassword) {
        setError("Password dan konfirmasi password tidak cocok")
        return
      }
      
      // Remove confirmPassword from data before sending
      const { confirmPassword, ...submitData } = data
      
      // Only send password if it's provided
      if (!submitData.password) {
        delete submitData.password
      }
      
      const auth = isAuthenticated()
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/students/${id}`, submitData, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      })
      if (response.data.success) {
        toast.success("Student updated successfully!")
        router.push("/students")
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update student. Please try again.")
      toast.error("Update failed")
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    )
  }

  return (
    <Layout>
      <Head>
        <title>Edit Student | School Attendance System</title>
      </Head>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, my: 4 }}>
        <Box sx={{ my: { xs: 2, md: 4 } }}>
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
              Edit Siswa
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => router.push("/students")}
              sx={{
                minWidth: { xs: "100%", sm: "auto" },
              }}
            >
              Kembali ke Daftar Siswa
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            }}
          >
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  fontSize: { xs: "1.1rem", md: "1.25rem" },
                }}
              >
                Informasi Siswa
              </Typography>
              
              <Grid container spacing={3}>
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
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    {...register("active")}
                  >
                    <MenuItem value={true}>Aktif</MenuItem>
                    <MenuItem value={false}>Tidak Aktif</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField fullWidth label="Alamat" multiline rows={2} {...register("address")} />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Informasi Akun Login (Opsional)
                    </Typography>
                  </Divider>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    {...register("email", {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Format email tidak valid",
                      },
                    })}
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message || "Jika diisi, siswa dapat login ke sistem"}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Password Baru"
                    type="password"
                    {...register("password", {
                      minLength: {
                        value: 6,
                        message: "Password minimal 6 karakter",
                      },
                    })}
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message || "Kosongkan jika tidak ingin mengubah password"}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Konfirmasi Password Baru"
                    type="password"
                    {...register("confirmPassword", {
                      validate: (value) => {
                        if (watchPassword && !value) {
                          return "Konfirmasi password diperlukan"
                        }
                        if (watchPassword && value !== watchPassword) {
                          return "Password tidak cocok"
                        }
                        return true
                      },
                    })}
                    error={Boolean(errors.confirmPassword)}
                    helperText={errors.confirmPassword?.message || "Ulangi password baru"}
                  />
                </Grid>
              </Grid>

              <Box
                sx={{
                  mt: 4,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 2,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => router.push("/students")}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : "Simpan Perubahan"}
                </Button>
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