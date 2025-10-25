import { useState, useRef, useEffect } from 'react'

const QRScanner = () => {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setScanning(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    setScanning(false)
  }

  const handleScan = () => {
    // Simulate QR code scan
    setTimeout(() => {
      setResult({
        success: true,
        certificate: {
          id: 'UOM-BIT-2024-00123',
          studentName: 'John Smith',
          courseName: 'Bachelor of Information Technology',
          issueDate: '2024-03-15',
          status: 'verified'
        }
      })
      stopScanning()
    }, 2000)
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">QR Code Scanner</h2>
      
      {!scanning && !result && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📱</div>
          <p className="text-gray-600 mb-4">Scan QR code to verify certificate</p>
          <button
            onClick={startScanning}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Start Camera
          </button>
        </div>
      )}

      {scanning && (
        <div className="text-center">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-black rounded-lg"
            />
            <div className="absolute inset-0 border-2 border-green-500 rounded-lg m-4 pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-500"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-500"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-green-500"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-500"></div>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <p className="text-gray-600">Point camera at QR code</p>
            <button
              onClick={handleScan}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Simulate Scan
            </button>
            <button
              onClick={stopScanning}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg ml-2"
            >
              Stop Camera
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`p-4 rounded-lg ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {result.success ? '✓' : '✗'}
            </div>
            <div className="ml-3">
              <p className={`font-semibold ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? 'Certificate Verified Successfully!' : 'Verification Failed'}
              </p>
              {result.certificate && (
                <div className="mt-2 text-sm">
                  <p><strong>Student:</strong> {result.certificate.studentName}</p>
                  <p><strong>Course:</strong> {result.certificate.courseName}</p>
                  <p><strong>Issue Date:</strong> {result.certificate.issueDate}</p>
                  <p><strong>Certificate ID:</strong> {result.certificate.id}</p>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setResult(null)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Scan Another
          </button>
        </div>
      )}
    </div>
  )
}

export default QRScanner