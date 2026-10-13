export const FIELD_OPTIONS = [
  {
    value: 'studentName',
    label: 'Student Name',
    group: 'Student'
  },
  {
    value: 'studentEmail',
    label: 'Student Email',
    group: 'Student'
  },
  {
    value: 'studentPhone',
    label: 'Student Phone',
    group: 'Student'
  },
  {
    value: 'courseName',
    label: 'Course Name',
    group: 'Course'
  },
  {
    value: 'courseCode',
    label: 'Course Code',
    group: 'Course'
  },
  {
    value: 'courseDuration',
    label: 'Course Duration',
    group: 'Course'
  },
  {
    value: 'awardDate',
    label: 'Award Date',
    group: 'Certificate'
  },
  {
    value: 'certificateCode',
    label: 'Certificate Code',
    group: 'Certificate'
  },
  {
    value: 'instituteName',
    label: 'Institute Name',
    group: 'Institute'
  },
  {
    value: 'staticText',
    label: 'Custom Text',
    group: 'Custom'
  }
];
export const FIELD_LABELS = FIELD_OPTIONS.reduce(
  (labels, option) => ({
    ...labels,
    [option.value]: option.label
  }),
  {}
);
export const IMAGE_TYPE_OPTIONS = [
  {
    value: 'logo',
    label: 'Institute Logo'
  },
  {
    value: 'signature',
    label: 'Signature'
  },
  {
    value: 'seal',
    label: 'Seal'
  },
  {
    value: 'customImage',
    label: 'Custom Image'
  }
];
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
