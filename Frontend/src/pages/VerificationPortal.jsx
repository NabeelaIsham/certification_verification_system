const VerificationPortal = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Verify Certificate
          </h1>
          <p className="text-xl text-gray-600">
            Check the authenticity of any certificate issued through our platform
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Verification */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Scan QR Code
              </h3>
              <p className="text-gray-600 mb-6">
                Use your device camera to scan the QR code on the certificate
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200">
                Start Camera
              </button>
            </div>

            {/* Manual Verification */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Manual Verification
              </h3>
              <form className="space-y-4">
                <div>
                  <label htmlFor="certificateCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Certificate Code
                  </label>
                  <input
                    type="text"
                    id="certificateCode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter certificate code"
                  />
                </div>
                <div>
                  <label htmlFor="awardDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Award Date
                  </label>
                  <input
                    type="date"
                    id="awardDate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-semibold transition-colors duration-200"
                >
                  Verify Certificate
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPortal;