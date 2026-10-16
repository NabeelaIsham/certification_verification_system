const axios = require('axios');
const { assertDeliveryAllowed } = require('./deliveryPolicy');
const { smsFailure, assertSmsAccepted } = require('./smsResponse');
const { getTextLkConfiguration } = require('./smsConfiguration');

const normalizeSriLankanPhone = (phone) => {
  const digits = (phone || '').replace(/\D/g, '');

  if (!digits) return '';
  if (digits.startsWith('94')) return digits;
  if (digits.startsWith('0')) return `94${digits.slice(1)}`;
  if (digits.length === 9) return `94${digits}`;

  return digits;
};

const sendTextLkSms = async ({ to, message }) => {
  assertDeliveryAllowed('sms', to);
  const { apiToken, senderId, endpoint, authPrefix, timeout } = getTextLkConfiguration();
  const recipient = normalizeSriLankanPhone(to);

  if (!recipient) {
    throw new Error('Recipient phone number is required for SMS OTP.');
  }

  const payload = {
    recipient,
    sender_id: senderId,
    type: 'plain',
    message
  };

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: authPrefix ? `${authPrefix} ${apiToken}` : apiToken,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout,
      maxRedirects: 0
    });

    return assertSmsAccepted(response);
  } catch (error) {
    if (error.code?.startsWith('SMS_')) throw error;
    throw smsFailure(error.response?.data, error.response?.status);
  }
};

const sendOtpSms = async ({ to, otp }) => {
  const policy = await require('./settingsPolicy').getPolicy('verification');
  const message = `Your Certificate Verification System OTP is ${otp}. It expires in ${policy.otpExpiry} minutes.`;
  return sendTextLkSms({ to, message });
};

module.exports = {
  sendOtpSms,
  sendTextLkSms,
  normalizeSriLankanPhone
};
