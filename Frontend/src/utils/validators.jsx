import * as yup from 'yup'

export const loginSchema = yup.object({
  email: yup
    .string()
    .email('Invalid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required')
})

export const registerSchema = yup.object({
  instituteName: yup.string().required('Institute name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().required('Phone number is required'),
  address: yup.string().required('Address is required'),
  adminName: yup.string().required('Admin name is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/\d/, 'Password must contain at least one number')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  agreeToTerms: yup.boolean().oneOf([true], 'You must accept the terms and conditions')
})

export const certificateSchema = yup.object({
  studentId: yup.string().required('Student is required'),
  courseId: yup.string().required('Course is required'),
  issueDate: yup.date().required('Issue date is required'),
  certificateTemplate: yup.string().required('Template is required')
})