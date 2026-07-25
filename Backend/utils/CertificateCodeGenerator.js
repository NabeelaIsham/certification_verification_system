const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const secureRandomPart = (length = 10) => {
  const bytes = crypto.randomBytes(length);
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += ALPHABET[bytes[index] % ALPHABET.length];
  }
  return value;
};

const institutePrefix = (instituteName) => {
  const normalized = String(instituteName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3);
  return normalized.padEnd(3, 'X');
};

const generateCertificateCode = (instituteName, dateValue = new Date()) => {
  const date = new Date(dateValue);
  const year = date.getUTCFullYear().toString().slice(-2);
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${institutePrefix(instituteName)}-${year}${month}${day}-${secureRandomPart()}`;
};

module.exports = {
  generateCertificateCode,
  secureRandomPart
};
