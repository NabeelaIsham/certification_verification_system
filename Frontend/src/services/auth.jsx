import api from './api'

export const authService = {
  async login(credentials) {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  async resetPassword({ email, otp, newPassword }) {
    const response = await api.post('/auth/reset-password', { email, otp, newPassword })
    return response.data
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me')
    return response.data.data
  },

  async verifyOTP(email, otp, type = 'email') {
    const response = await api.post('/auth/verify-otp', { email, otp, type })
    return response.data
  }
}
