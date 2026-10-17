export function buildTemplatePayload({
  templateName,
  selectedCourse,
  templateImage,
  fields,
  imageFields,
  qrCodePosition
}) {
  const formData = new FormData();
  formData.append('templateName', templateName);
  formData.append('courseId', selectedCourse);
  formData.append('templateImage', templateImage);
  formData.append('fields', JSON.stringify(fields));
  formData.append(
    'imageFields',
    JSON.stringify(
      imageFields.map((field) => ({
        imageType: field.imageType,
        label: field.label,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height
      }))
    )
  );
  imageFields.forEach((field) => {
    if (field.file) {
      formData.append('assetImages', field.file);
    }
  });
  formData.append('qrCodePosition', JSON.stringify(qrCodePosition));

  return formData;
}
