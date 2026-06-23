const axios = require('axios');

const DEFAULT_TEXTLK_ENDPOINT = 'https://app.text.lk/api/v3/sms/send';
const DEFAULT_AUTH_PREFIX = 'Bearer';

const normalizeSriLankanPhone = (phone) => {
  const digits = (phone || '').replace(/\D/g, '');

  if (!digits) return '';
  if (digits.startsWith('94')) return digits;
  if (digits.startsWith('0')) return `94${digits.slice(1)}`;
  if (digits.length === 9) return `94${digits}`;

  return digits;
};

const sendTextLkSms = async ({ to, message }) => {
  const apiToken = (process.env.TEXTLK_API_TOKEN || '').trim();
  const senderId = (process.env.TEXTLK_SENDER_ID || 'CVS').trim();
  const endpoint = (process.env.TEXTLK_SMS_ENDPOINT || DEFAULT_TEXTLK_ENDPOINT).trim();
  const authPrefix = (process.env.TEXTLK_AUTH_PREFIX || DEFAULT_AUTH_PREFIX).trim();
  const recipient = normalizeSriLankanPhone(to);

  if (!apiToken) {
    throw new Error('Text.lk API token is not configured. Set TEXTLK_API_TOKEN.');
  }

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
      timeout: Number(process.env.TEXTLK_TIMEOUT_MS || 10000)
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const providerMessage = error.response?.data?.message || error.response?.data?.error || error.response?.data;
    const details = typeof providerMessage === 'string' ? providerMessage : JSON.stringify(providerMessage);
    const messageParts = [`Text.lk SMS request failed${status ? ` with status ${status}` : ''}`];

    if (details) {
      messageParts.push(`Provider response: ${details}`);
    }

    if (status === 401) {
      messageParts.push('Check TEXTLK_API_TOKEN, regenerate the API token if needed, and restart the backend.');
    }

    const smsError = new Error(messageParts.join('. '));
    smsError.status = status;
    smsError.providerResponse = providerMessage;
    throw smsError;
  }
};

const sendOtpSms = async ({ to, otp }) => {
  const message = `Your Certificate Verification System OTP is ${otp}. It expires in 5 minutes.`;
  return sendTextLkSms({ to, message });
};

module.exports = {
  sendOtpSms,
  sendTextLkSms,
  normalizeSriLankanPhone
};
