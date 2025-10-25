import api from './api'

export const chatbotService = {
  async sendMessage(message) {
    // Simulate chatbot response
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = {
          'hello': 'Hello! How can I help you with certificate verification today?',
          'help': 'I can help you with certificate verification, institute registration, and general inquiries about the system.',
          'verify': 'You can verify certificates using the QR code scanner or by entering the certificate code manually.',
          'default': 'Thank you for your message. Our support team will get back to you soon.'
        }
        
        const response = responses[message.toLowerCase()] || responses['default']
        resolve({ response })
      }, 1000)
    })
  },

  async getFAQs() {
    const response = await api.get('/chatbot/faqs')
    return response.data
  }
}