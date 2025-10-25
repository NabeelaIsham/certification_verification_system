import { useState } from 'react'

const BulkUpload = () => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState(null)

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    // Simulate upload process
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploading(false)
          setUploadResult({
            success: true,
            message: 'File uploaded successfully!',
            details: {
              totalRecords: 150,
              processed: 150,
              errors: 0
            }
          })
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const downloadTemplate = () => {
    // Simulate template download
    const template = `name,email,phone,course,enrollment_date
John Doe,john@example.com,+94123456789,BIT2024,2024-03-15
Jane Smith,jane@example.com,+94123456790,DWD2024,2024-03-15`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_upload_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>
        <p className="text-gray-600">Upload multiple students or certificates at once</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Upload Students</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <div className="text-gray-400 text-4xl mb-2">📁</div>
            <p className="text-gray-600 mb-2">Drag and drop your CSV file here</p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer"
            >
              Choose File
            </label>
          </div>

          {uploading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {uploadResult && (
            <div className={`p-4 rounded-lg ${
              uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  uploadResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {uploadResult.success ? '✓' : '✗'}
                </div>
                <div className="ml-3">
                  <p className={`font-medium ${
                    uploadResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {uploadResult.message}
                  </p>
                  {uploadResult.details && (
                    <div className="text-sm mt-2 space-y-1">
                      <p>Total Records: {uploadResult.details.totalRecords}</p>
                      <p>Processed: {uploadResult.details.processed}</p>
                      <p>Errors: {uploadResult.details.errors}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">CSV Format Requirements:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>File must be in CSV format</li>
                <li>Include headers: name, email, phone, course, enrollment_date</li>
                <li>Date format: YYYY-MM-DD</li>
                <li>Phone numbers should include country code</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Supported Courses:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>BIT2024 - Bachelor of IT</li>
                <li>DWD2024 - Diploma in Web Development</li>
                <li>CDS2024 - Certificate in Data Science</li>
              </ul>
            </div>

            <button
              onClick={downloadTemplate}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Download Template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkUpload