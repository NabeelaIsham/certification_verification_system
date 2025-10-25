export const USER_ROLES = {
  SUPER_ADMIN: 'superadmin',
  INSTITUTE_ADMIN: 'institute',
  STUDENT: 'student'
}

export const CERTIFICATE_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  REVOKED: 'revoked',
  VERIFIED: 'verified'
}

export const INSTITUTE_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected'
}

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },
  INSTITUTES: '/institutes',
  STUDENTS: '/students',
  COURSES: '/courses',
  CERTIFICATES: '/certificates'
}

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  PHONE: /^\+?[\d\s-()]{10,}$/
}