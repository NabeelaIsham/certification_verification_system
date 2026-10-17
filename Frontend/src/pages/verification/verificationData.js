const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const extractCertificateCode = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  const value = input.trim();
  if (!value) {
    return '';
  }
  try {
    const url = new URL(value);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const verifyIndex = pathSegments.findIndex(
      (segment) => ['verify', 'certificate'].includes(segment.toLowerCase())
    );
    if (verifyIndex >= 0 && pathSegments[verifyIndex + 1]) {
      return decodeURIComponent(pathSegments[verifyIndex + 1])
        .trim()
        .toUpperCase();
    }
    const codeParam = url.searchParams.get('code');
    if (codeParam) {
      return decodeURIComponent(codeParam).trim().toUpperCase();
    }
  } catch {
    // Continue with plain code parsing when value is not a full URL.
  }
  try {
    return decodeURIComponent(value).trim().toUpperCase();
  } catch {
    return '';
  }
};
export const normalizeVerificationResult = (data) => {
  const source = data?.certificate || data || {};
  const certificateImage =
    source.certificateImage ||
    source.certificateUrl ||
    source.certificateImageUrl ||
    source.generatedCertificateUrl ||
    source.generatedCertificateImage ||
    null;
  return {
    ...source,
    certificateCode: source.certificateCode || source.code || '',
    studentName:
      source.studentName || source.studentId?.name || 'Not available',
    courseName:
      source.courseName || source.courseId?.courseName || 'Not available',
    awardDate: source.awardDate || source.issueDate || source.issuedAt || null,
    instituteName:
      source.instituteName ||
      source.instituteId?.instituteName ||
      'Not available',
    status: source.status || (data?.success ? 'issued' : 'unknown'),
    certificateImage:
      certificateImage &&
      certificateImage.startsWith('/') &&
      /^https?:/.test(API_URL)
        ? new URL(certificateImage, API_URL).href
        : certificateImage,
    qrCodeImage: source.qrCodeImage || source.qrCodeUrl || null
  };
};
export const formatDisplayDate = (dateValue) => {
  if (!dateValue) return 'Not available';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
