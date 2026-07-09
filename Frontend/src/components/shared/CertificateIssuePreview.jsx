import { useEffect, useMemo, useRef, useState } from 'react';

const formatAwardDate = (awardDate) => {
  if (!awardDate) return 'Award date';

  const date = new Date(awardDate);
  if (Number.isNaN(date.getTime())) return awardDate;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getFieldValue = (fieldName, values) => {
  switch (fieldName) {
    case 'studentName':
      return values.studentName || 'Student name';
    case 'studentEmail':
      return values.studentEmail || 'student@example.com';
    case 'studentPhone':
      return values.studentPhone || 'Student phone';
    case 'courseName':
      return values.courseName || 'Course name';
    case 'courseCode':
      return values.courseCode || 'Course code';
    case 'courseDuration':
      return values.courseDuration || 'Course duration';
    case 'awardDate':
      return formatAwardDate(values.awardDate);
    case 'certificateCode':
      return values.certificateCode || 'AUTO-GENERATED-CODE';
    case 'instituteName':
      return values.instituteName || 'Institute name';
    case 'staticText':
      return values[fieldName] || values.staticText || '';
    default:
      return '';
  }
};

const getTranslate = (textAlign) => {
  if (textAlign === 'right') return 'translate(-100%, -0.85em)';
  if (textAlign === 'left') return 'translate(0, -0.85em)';
  return 'translate(-50%, -0.85em)';
};

const CertificateIssuePreview = ({ template, values, emptyMessage = 'Select a student and template to preview the certificate.' }) => {
  const imageRef = useRef(null);
  const [imageSize, setImageSize] = useState({ naturalWidth: 0, naturalHeight: 0, renderedWidth: 0 });

  const scale = useMemo(() => {
    if (!imageSize.naturalWidth || !imageSize.renderedWidth) return 1;
    return imageSize.renderedWidth / imageSize.naturalWidth;
  }, [imageSize]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return undefined;

    const updateSize = () => {
      setImageSize({
        naturalWidth: image.naturalWidth || 0,
        naturalHeight: image.naturalHeight || 0,
        renderedWidth: image.clientWidth || 0
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(image);

    return () => observer.disconnect();
  }, [template?.templateImageUrl]);

  if (!template?.templateImageUrl) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-auto rounded-lg border border-gray-200 bg-gray-50">
        <div className="relative">
          <img
            ref={imageRef}
            src={template.templateImageUrl}
            alt={template.templateName || 'Certificate template'}
            className="block w-full select-none"
            onLoad={() => {
              const image = imageRef.current;
              if (!image) return;

              setImageSize({
                naturalWidth: image.naturalWidth || 0,
                naturalHeight: image.naturalHeight || 0,
                renderedWidth: image.clientWidth || 0
              });
            }}
          />

          {imageSize.naturalWidth > 0 && template.fields?.map((field, index) => (
            <div
              key={`${field.fieldName}-${index}`}
              className="pointer-events-none absolute whitespace-nowrap"
              style={{
                left: `${(field.x / imageSize.naturalWidth) * 100}%`,
                top: `${(field.y / imageSize.naturalHeight) * 100}%`,
                color: field.fontColor || '#000000',
                fontFamily: field.fontFamily || 'Arial',
                fontSize: `${(field.fontSize || 24) * scale}px`,
                lineHeight: 1,
                textAlign: field.textAlign || 'center',
                transform: getTranslate(field.textAlign),
                transformOrigin: 'top left'
              }}
            >
              {field.fieldName === 'staticText'
                ? field.staticValue || field.displayName || ''
                : getFieldValue(field.fieldName, values)}
            </div>
          ))}

          {imageSize.naturalWidth > 0 && template.imageFields?.map((field, index) => (
            <img
              key={`${field.label || field.imageType}-${index}`}
              src={field.imageUrl}
              alt={field.label || field.imageType || 'Template image asset'}
              className="pointer-events-none absolute object-contain"
              style={{
                left: `${(field.x / imageSize.naturalWidth) * 100}%`,
                top: `${(field.y / imageSize.naturalHeight) * 100}%`,
                width: `${(field.width || 120) * scale}px`,
                height: `${(field.height || 60) * scale}px`
              }}
            />
          ))}

          {imageSize.naturalWidth > 0 && template.qrCodePosition?.size > 0 && (
            <div
              className="pointer-events-none absolute flex items-center justify-center border-2 border-dashed border-gray-700 bg-white/80 text-center font-mono text-gray-700"
              style={{
                left: `${(template.qrCodePosition.x / imageSize.naturalWidth) * 100}%`,
                top: `${(template.qrCodePosition.y / imageSize.naturalHeight) * 100}%`,
                width: `${template.qrCodePosition.size * scale}px`,
                height: `${template.qrCodePosition.size * scale}px`,
                fontSize: `${Math.max(8, 11 * scale)}px`
              }}
            >
              QR
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        The certificate code and QR code are generated when the certificate is issued.
      </p>
    </div>
  );
};

export default CertificateIssuePreview;
