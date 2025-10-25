import api from './api'

export const instituteService = {
  async getInstitutes(params = {}) {
    const response = await api.get('/institutes', { params })
    return response.data
  },

  async getInstituteById(id) {
    const response = await api.get(`/institutes/${id}`)
    return response.data
  },

  async createInstitute(instituteData) {
    const response = await api.post('/institutes', instituteData)
    return response.data
  },

  async updateInstitute(id, instituteData) {
    const response = await api.put(`/institutes/${id}`, instituteData)
    return response.data
  },

  async approveInstitute(id) {
    const response = await api.patch(`/institutes/${id}/approve`)
    return response.data
  },

  async rejectInstitute(id, reason) {
    const response = await api.patch(`/institutes/${id}/reject`, { reason })
    return response.data
  }
}