import { createContext, useContext, useState } from 'react'

const CertificateContext = createContext()

export const useCertificate = () => {
  const context = useContext(CertificateContext)
  if (!context) {
    throw new Error('useCertificate must be used within a CertificateProvider')
  }
  return context
}

export const CertificateProvider = ({ children }) => {
  const [certificates, setCertificates] = useState([])
  const [selectedCertificate, setSelectedCertificate] = useState(null)
  const [loading, setLoading] = useState(false)

  const addCertificate = (certificate) => {
    setCertificates(prev => [...prev, certificate])
  }

  const updateCertificate = (id, updates) => {
    setCertificates(prev => 
      prev.map(cert => 
        cert.id === id ? { ...cert, ...updates } : cert
      )
    )
  }

  const deleteCertificate = (id) => {
    setCertificates(prev => prev.filter(cert => cert.id !== id))
  }

  const value = {
    certificates,
    selectedCertificate,
    setSelectedCertificate,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    loading,
    setLoading
  }

  return (
    <CertificateContext.Provider value={value}>
      {children}
    </CertificateContext.Provider>
  )
}