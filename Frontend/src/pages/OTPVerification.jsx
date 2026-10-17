import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/api.jsx';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const OTPVerification = () => {
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(300);
  const [policy, setPolicy] = useState({ otpExpiry: 5, resendCooldown: 60, allowResendOtp: true });
  const [cooldown, setCooldown] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const { email, delivery } = location.state || {};
  const [initialDelivery, setInitialDelivery] = useState(delivery);
  const deliveryFailed = initialDelivery?.smsSent === false || initialDelivery?.emailSent === false;
  const deliveryMessage = initialDelivery?.smsSent === false
    ? initialDelivery.emailSent === true
      ? 'We could not send the SMS. Use the verification code sent to your email.'
      : 'We could not send your verification code. Try Resend OTP shortly or contact support.'
    : initialDelivery?.emailSent === false
      ? 'Email delivery failed. Check your phone for the verification code.'
      : 'Enter the verification code from your email or phone. SMS delivery may take a little time.';

  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  useEffect(() => {
    apiClient.get(`${API_URL}/auth/verification-policy`).then(({ data }) => {
      setPolicy(data.data);
      setTimer(data.data.otpExpiry * 60);
      setCooldown(data.data.resendCooldown);
    }).catch(() => setError('Could not load verification settings. Please reload.'));
    const interval = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
      setTimer((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await apiClient.post(`${API_URL}/auth/verify-otp`, {
        email,
        otp
      });

      if (response.data.success) {
        setMessage('Account verified successfully.');

        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Verification complete! Please wait for admin approval.' }
          });
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (isLoading || cooldown > 0) return;
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await apiClient.post(`${API_URL}/auth/resend-otp`, {
        email,
        type: 'account'
      });
      setTimer(policy.otpExpiry * 60);
      setCooldown(policy.resendCooldown);
      setMessage(response.data.message);
      setInitialDelivery(undefined);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Verify Account
          </h2>
          <p role={deliveryFailed ? 'alert' : undefined} className={`mt-2 text-center text-sm ${deliveryFailed ? 'text-amber-700' : 'text-gray-600'}`}>
            {deliveryMessage}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleVerify}>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              OTP Code
            </label>
            <div className="mt-1">
              <input
                id="otp"
                name="otp"
                type="text"
                required
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="000000"
              />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Time remaining: <span className="font-bold">{formatTime(timer)}</span>
            </p>
            {policy.allowResendOtp && (
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={cooldown > 0 || isLoading}
                className="mt-2 text-sm text-blue-600 hover:text-blue-500"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
              </button>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="text-green-600 text-sm text-center">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading || otp.length !== 6
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OTPVerification;
