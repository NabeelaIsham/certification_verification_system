const messages = {
  SMS_AUTH_FAILED: 'Text.lk rejected authentication. Check TEXTLK_API_TOKEN in the running backend environment.',
  SMS_SENDER_REJECTED: 'Text.lk rejected the sender ID. Use the exact approved TEXTLK_SENDER_ID from the Text.lk account.',
  SMS_INSUFFICIENT_CREDIT: 'Text.lk rejected the SMS because the account has insufficient SMS credit.',
  SMS_INVALID_RECIPIENT: 'Text.lk rejected the recipient number. Check its international mobile number format.',
  SMS_RATE_LIMITED: 'Text.lk rate-limited the request. Wait before requesting another code.',
  SMS_PROVIDER_REJECTED: 'Text.lk did not accept the SMS. Check sender approval, account balance and provider delivery reports.',
  SMS_UNEXPECTED_RESPONSE: 'Text.lk returned an unrecognized response; SMS acceptance could not be confirmed.',
  SMS_DELIVERY_FAILED: 'Text.lk SMS request failed. Check provider connectivity and delivery reports.'
};

// Classify provider errors, but never log their raw message/request bodies:
// those may contain credentials, recipients or the OTP itself.
const smsFailure = (body, status, fallback = 'SMS_DELIVERY_FAILED') => {
  const message = typeof body?.message === 'string' ? body.message.toLowerCase() : '';
  let code = fallback;
  if (status === 401 || /unauthenticated|invalid (api )?(token|key)|authentication/.test(message)) code = 'SMS_AUTH_FAILED';
  else if (/sender[ _-]?id|sender.*(invalid|approved|registered)|invalid.*sender/.test(message)) code = 'SMS_SENDER_REJECTED';
  else if (/insufficient|not enough|balance.*(low|empty)|credit.*(low|empty|exhausted)/.test(message)) code = 'SMS_INSUFFICIENT_CREDIT';
  else if (/invalid.*(recipient|number|phone)|(recipient|number|phone).*invalid/.test(message)) code = 'SMS_INVALID_RECIPIENT';
  else if (status === 429 || /rate limit|too many/.test(message)) code = 'SMS_RATE_LIMITED';
  return Object.assign(new Error(messages[code]), { code, status });
};

const assertSmsAccepted = (response) => {
  const body = response.data;
  // Text.lk documents both boolean status and success/error status strings.
  const accepted = body?.status === true || body?.status === 'success';
  const deliveryStatus = String(body?.data?.status || '').toLowerCase();
  if (!accepted || /^(failed|rejected|undelivered|expired)$/.test(deliveryStatus)) {
    const rejected = body?.status === false || body?.status === 'error' || accepted;
    throw smsFailure(body, response.status, rejected ? 'SMS_PROVIDER_REJECTED' : 'SMS_UNEXPECTED_RESPONSE');
  }
  return body;
};

module.exports = { smsFailure, assertSmsAccepted };
