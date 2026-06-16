const mongoose = require('mongoose');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isValidEmail = (value) => {
  if (!isNonEmptyString(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
};

const isValidPassword = (value) => typeof value === 'string' && value.trim().length >= 6;

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeCertificateCode = (value) => {
  if (!isNonEmptyString(value)) return '';
  return decodeURIComponent(value.trim()).toUpperCase();
};

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isValidPassword,
  isValidObjectId,
  normalizeCertificateCode
};
