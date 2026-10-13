const axios = require('axios');
const { assertDeliveryAllowed } = require('./deliveryPolicy');
const { smsFailure, assertSmsAccepted } = require('./smsResponse');

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
  assertDeliveryAllowed('sms', to);
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

  const providerUrl = new URL(endpoint);
  if (providerUrl.protocol !== 'https:' || providerUrl.username || providerUrl.password) {
    throw new Error('TEXTLK_SMS_ENDPOINT must use HTTPS without URL credentials.');
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
      timeout: Number(process.env.TEXTLK_TIMEOUT_MS || 10000),
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
