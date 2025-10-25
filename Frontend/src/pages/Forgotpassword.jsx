import { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false); // Fixed: Changed from setIsSubmitted to setIsSubmitted
  const [currentStep, setCurrentStep] = useState(1); // 1: Email, 2: OTP, 3: New Password

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    // Send OTP to email logic here
    console.log('OTP sent to:', email);
    setIsSubmitted(true);
    setCurrentStep(2);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    // Verify OTP logic here
    console.log('Verifying OTP...');
    setCurrentStep(3);
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    // Reset password logic here
    console.log('Resetting password...');
    setIsSubmitted(true);
    // You might want to redirect to login or show success message here
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CVS</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset Your Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            return to sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* Step 1: Email Input */}
          {currentStep === 1 && (
            <div>
              <p className="text-sm text-gray-600 mb-6 text-center">
                Enter your email address and we'll send you a verification code to reset your password.
              </p>
              
              <form className="space-y-6" onSubmit={handleEmailSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your registered email"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Send Verification Code
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === 2 && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      We've sent a 6-digit verification code to <strong>{email}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handleOtpSubmit}>
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    Enter Verification Code
                  </label>
                  <div className="mt-1">
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      maxLength="6"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
                      placeholder="000000"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Use different email
                  </button>
                  <button
                    type="button"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Resend code
                  </button>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Verify Code
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: New Password */}
          {currentStep === 3 && (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Email verified successfully! Now set your new password.
                    </p>
                  </div>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handlePasswordReset}>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new password"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${currentStep >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                  1
                </div>
                <span className="ml-2">Enter Email</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${currentStep >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                  2
                </div>
                <span className="ml-2">Verify Code</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${currentStep >= 3 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                  3
                </div>
                <span className="ml-2">New Password</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;