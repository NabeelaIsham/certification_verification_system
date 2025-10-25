import { useState } from 'react'

const ShareCertificate = ({ certificateId }) => {
  const [shareMethod, setShareMethod] = useState('link')
  const [copied, setCopied] = useState(false)

  const certificateUrl = `${window.location.origin}/certificates/${certificateId}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const shareOptions = [
    { method: 'link', name: 'Copy Link', icon: '🔗' },
    { method: 'email', name: 'Email', icon: '📧' },
    { method: 'whatsapp', name: 'WhatsApp', icon: '💬' },
    { method: 'linkedin', name: 'LinkedIn', icon: '💼' }
  ]

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Share Certificate</h2>
      
      <div className="space-y-4">
        {/* Share Method Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {shareOptions.map((option) => (
            <button
              key={option.method}
              onClick={() => setShareMethod(option.method)}
              className={`p-3 text-center rounded-lg border transition-colors duration-200 ${
                shareMethod === option.method
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{option.icon}</div>
              <div className="text-sm font-medium">{option.name}</div>
            </button>
          ))}
        </div>

        {/* Share Content */}
        {shareMethod === 'link' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificate Link
            </label>
            <div className="flex">
              <input
                type="text"
                value={certificateUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50"
              />
              <button
                onClick={copyToClipboard}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {shareMethod === 'email' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Addresses
            </label>
            <textarea
              placeholder="Enter email addresses separated by commas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows="3"
            />
            <button className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              Send Emails
            </button>
          </div>
        )}

        {['whatsapp', 'linkedin'].includes(shareMethod) && (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">
              Share your certificate on {shareMethod === 'whatsapp' ? 'WhatsApp' : 'LinkedIn'}
            </p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold">
              Share on {shareMethod === 'whatsapp' ? 'WhatsApp' : 'LinkedIn'}
            </button>
          </div>
        )}

        {/* Preview */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <p className="text-gray-600">
              Check out my certificate for Bachelor of Information Technology from University of Moratuwa!
            </p>
            <p className="text-sm text-gray-400 mt-2">{certificateUrl}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShareCertificate