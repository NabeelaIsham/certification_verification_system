import api from './api'

export const certificateService = {
  async generateCertificate(certificateData) {
    const response = await api.post('/certificates/generate', certificateData)
    return response.data
  },

  async getCertificates(params = {}) {
    const response = await api.get('/certificates', { params })
    return response.data
  },

  async getCertificateById(id) {
    const response = await api.get(`/certificates/${id}`)
    return response.data
  },

  async verifyCertificate(code, awardDate) {
    const response = await api.post('/certificates/verify', { code, awardDate })
    return response.data
  },

  async revokeCertificate(id, reason) {
    const response = await api.patch(`/certificates/${id}/revoke`, { reason })
    return response.data
  },

  async downloadCertificate(id) {
    const response = await api.get(`/certificates/${id}/download`, {
      responseType: 'blob'
    })
    return response.data
  }
}