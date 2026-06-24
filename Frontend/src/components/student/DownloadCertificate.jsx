import { useEffect, useState } from 'react'
import { certificateService } from '../../services/certificateService'

const DownloadCertificate = ({ certificateId }) => {
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCertificate = async () => {
      if (!certificateId) {
        setError('Certificate ID is required.')
        setLoading(false)
        return
      }

      try {
        const response = await certificateService.getCertificateById(certificateId)
        setCertificate(response?.data || response)
      } catch (fetchError) {
        console.error('Error loading certificate:', fetchError)
        setError(fetchError.response?.data?.message || 'Failed to load certificate details.')
      } finally {
        setLoading(false)
      }
    }

    loadCertificate()
  }, [certificateId])

  const handleDownload = async () => {
    if (!certificateId) return

    setDownloading(true)
    setError('')

    try {
      const fileResponse = await certificateService.downloadCertificate(certificateId)
      const blob = new Blob([fileResponse], { type: 'image/jpeg' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${certificate?.certificateCode || 'certificate'}.jpg`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (downloadError) {
      console.error('Error downloading certificate:', downloadError)
      const fallbackUrl = certificate?.generatedCertificateUrl || certificate?.certificateUrl

      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
        return
      }

      setError(downloadError.response?.data?.message || 'Failed to download certificate.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading certificate...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Download Certificate</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {certificate ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <div className="font-medium text-gray-900">{certificate.studentName}</div>
            <div>{certificate.courseName}</div>
            <div className="mt-2 font-mono text-xs break-all">{certificate.certificateCode}</div>
            <div className="mt-1">
              Award Date: {certificate.awardDate ? new Date(certificate.awardDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading || !certificate.generatedCertificateUrl}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? 'Downloading...' : 'Download Certificate'}
          </button>

          {certificate.generatedCertificateUrl && (
            <a
              href={certificate.generatedCertificateUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-sm text-blue-600 hover:underline"
            >
              Open certificate image
            </a>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Certificate details are not available.</p>
      )}
    </div>
  )
}

export default DownloadCertificate
