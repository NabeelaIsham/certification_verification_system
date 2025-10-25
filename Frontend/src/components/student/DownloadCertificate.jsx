import { useState } from 'react'

const DownloadCertificate = ({ certificateId }) => {
  const [downloadFormat, setDownloadFormat] = useState('pdf')
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    
    // Simulate download process
    setTimeout(() => {
      setDownloading(false)
      alert(`Certificate downloaded as ${downloadFormat.toUpperCase()}!`)
    }, 2000)
  }

  const formats = [
    { id: 'pdf', name: 'PDF Document', description: 'High quality printable format', icon: '📄' },
    { id: 'png', name: 'PNG Image', description: 'High resolution image', icon: '🖼️' },
    { id: 'jpg', name: 'JPG Image', description: 'Standard image format', icon: '📷' }
  ]

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Download Certificate</h2>
      
      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Download Format
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formats.map((format) => (
              <div
                key={format.id}
                onClick={() => setDownloadFormat(format.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
                  downloadFormat === format.id
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{format.icon}</div>
                <div className="font-medium text-gray-900">{format.name}</div>
                <div className="text-sm text-gray-600 mt-1">{format.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Download Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Download Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="rounded text-blue-600" defaultChecked />
              <span className="ml-2 text-sm text-gray-700">Include QR code for verification</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded text-blue-600" defaultChecked />
              <span className="ml-2 text-sm text-gray-700">Add digital signature</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded text-blue-600" />
              <span className="ml-2 text-sm text-gray-700">Watermark for security</span>
            </label>
          </div>
        </div>

        {/* File Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">File Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Format: {downloadFormat.toUpperCase()}</div>
            <div>Estimated Size: {downloadFormat === 'pdf' ? '~2MB' : '~5MB'}</div>
            <div>Quality: {downloadFormat === 'pdf' ? 'Print Ready' : 'High Resolution'}</div>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {downloading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Downloading...
            </>
          ) : (
            `Download as ${downloadFormat.toUpperCase()}`
          )}
        </button>
      </div>
    </div>
  )
}

export default DownloadCertificate