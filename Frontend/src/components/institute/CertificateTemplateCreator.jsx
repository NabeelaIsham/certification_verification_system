import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const FIELD_OPTIONS = [
  { value: 'studentName', label: 'Student Name', group: 'Student' },
  { value: 'studentEmail', label: 'Student Email', group: 'Student' },
  { value: 'studentPhone', label: 'Student Phone', group: 'Student' },
  { value: 'courseName', label: 'Course Name', group: 'Course' },
  { value: 'courseCode', label: 'Course Code', group: 'Course' },
  { value: 'courseDuration', label: 'Course Duration', group: 'Course' },
  { value: 'awardDate', label: 'Award Date', group: 'Certificate' },
  { value: 'certificateCode', label: 'Certificate Code', group: 'Certificate' },
  { value: 'instituteName', label: 'Institute Name', group: 'Institute' },
  { value: 'staticText', label: 'Custom Text', group: 'Custom' }
];

const FIELD_LABELS = FIELD_OPTIONS.reduce((labels, option) => ({
  ...labels,
  [option.value]: option.label
}), {});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const CertificateTemplateCreator = ({ API_URL, onTemplateCreated }) => {
  const [courses, setCourses] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [templateImage, setTemplateImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fields, setFields] = useState([]);
  const [qrCodePosition, setQrCodePosition] = useState({ x: 0, y: 0, size: 100 });
  const [activeField, setActiveField] = useState(null);
  const [customText, setCustomText] = useState('');
  const [selectedElement, setSelectedElement] = useState(null);
  const [imageSize, setImageSize] = useState({ naturalWidth: 0, naturalHeight: 0, renderedWidth: 0 });
  const [loading, setLoading] = useState(false);

  const imageRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    const image = imageRef.current;
    if (!imagePreview || !image) return undefined;

    const observer = new ResizeObserver(updateImageSize);
    observer.observe(image);

    return () => observer.disconnect();
  }, [imagePreview]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const updateImageSize = () => {
    const image = imageRef.current;
    if (!image) return;

    setImageSize({
      naturalWidth: image.naturalWidth || 0,
      naturalHeight: image.naturalHeight || 0,
      renderedWidth: image.clientWidth || 0
    });
  };

  const getTemplatePoint = (event) => {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) return null;

    const rect = image.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * image.naturalWidth;
    const y = ((event.clientY - rect.top) / rect.height) * image.naturalHeight;

    return {
      x: Math.round(clamp(x, 0, image.naturalWidth)),
      y: Math.round(clamp(y, 0, image.naturalHeight))
    };
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTemplateImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFields([]);
        setQrCodePosition({ x: 0, y: 0, size: 100 });
        setSelectedElement(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = (e) => {
    if (!activeField) {
      setSelectedElement(null);
      return;
    }

    const point = getTemplatePoint(e);
    if (!point) return;

    if (activeField === 'qr') {
      setQrCodePosition(prev => ({ ...prev, x: point.x, y: point.y }));
      setSelectedElement({ type: 'qr' });
    } else {
      const newField = {
        fieldName: activeField,
        displayName: activeField === 'staticText' ? customText.trim() || 'Custom Text' : FIELD_LABELS[activeField],
        staticValue: activeField === 'staticText' ? customText.trim() || 'Custom Text' : '',
        x: point.x,
        y: point.y,
        fontSize: 24,
        fontColor: '#000000',
        fontFamily: 'Arial',
        textAlign: 'center'
      };
      setFields(prev => [...prev, newField]);
      setSelectedElement({ type: 'field', index: fields.length });
    }

    setActiveField(null);
  };

  const removeField = (index) => {
    setFields(prev => prev.filter((_, i) => i !== index));
    setSelectedElement(null);
  };

  const updateFieldProperty = (index, property, value) => {
    setFields(prev => prev.map((field, i) => (
      i === index ? { ...field, [property]: value } : field
    )));
  };

  const selectFieldToPlace = (fieldName) => {
    if (fieldName === 'staticText' && !customText.trim()) {
      alert('Enter custom text before placing it on the certificate.');
      return;
    }

    setActiveField(activeField === fieldName ? null : fieldName);
  };

  const updateQrProperty = (property, value) => {
    setQrCodePosition(prev => ({ ...prev, [property]: value }));
  };

  const startDrag = (event, element) => {
    event.preventDefault();
    event.stopPropagation();

    const point = getTemplatePoint(event);
    if (!point) return;

    const origin = element.type === 'qr'
      ? qrCodePosition
      : fields[element.index];

    dragRef.current = {
      element,
      offsetX: point.x - origin.x,
      offsetY: point.y - origin.y
    };
    setSelectedElement(element);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDrag = (event) => {
    if (!dragRef.current) return;

    const point = getTemplatePoint(event);
    if (!point) return;

    const nextX = Math.round(point.x - dragRef.current.offsetX);
    const nextY = Math.round(point.y - dragRef.current.offsetY);
    const { element } = dragRef.current;

    if (element.type === 'qr') {
      setQrCodePosition(prev => ({
        ...prev,
        x: clamp(nextX, 0, imageSize.naturalWidth),
        y: clamp(nextY, 0, imageSize.naturalHeight)
      }));
      return;
    }

    setFields(prev => prev.map((field, index) => (
      index === element.index
        ? {
            ...field,
            x: clamp(nextX, 0, imageSize.naturalWidth),
            y: clamp(nextY, 0, imageSize.naturalHeight)
          }
        : field
    )));
  };

  const stopDrag = () => {
    dragRef.current = null;
  };

  const handleSubmit = async () => {
    if (!templateName || !selectedCourse || !templateImage) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('templateName', templateName);
    formData.append('courseId', selectedCourse);
    formData.append('templateImage', templateImage);
    formData.append('fields', JSON.stringify(fields));
    formData.append('qrCodePosition', JSON.stringify(qrCodePosition));

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/certificate-templates`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert('Template created successfully');
        onTemplateCreated?.(response.data.data);
        setTemplateName('');
        setSelectedCourse('');
        setTemplateImage(null);
        setImagePreview(null);
        setFields([]);
        setQrCodePosition({ x: 0, y: 0, size: 100 });
        setSelectedElement(null);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert(error.response?.data?.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const getFieldStyle = (field) => ({
    left: `${imageSize.naturalWidth ? (field.x / imageSize.naturalWidth) * 100 : 0}%`,
    top: `${imageSize.naturalHeight ? (field.y / imageSize.naturalHeight) * 100 : 0}%`,
    color: field.fontColor,
    fontFamily: field.fontFamily,
    fontSize: `${field.fontSize * (imageSize.renderedWidth && imageSize.naturalWidth ? imageSize.renderedWidth / imageSize.naturalWidth : 1)}px`,
    transform: field.textAlign === 'left'
      ? 'translate(0, -50%)'
      : field.textAlign === 'right'
        ? 'translate(-100%, -50%)'
        : 'translate(-50%, -50%)'
  });

  const selectedField = selectedElement?.type === 'field'
    ? fields[selectedElement.index]
    : null;
  const hasQrCode = qrCodePosition.x > 0 || qrCodePosition.y > 0;
  const displayScale = imageSize.renderedWidth && imageSize.naturalWidth
    ? imageSize.renderedWidth / imageSize.naturalWidth
    : 1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Create Certificate Template</h2>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Standard Certificate"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course *
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a course</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.courseName} ({course.courseCode})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Image * (PNG/JPG)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Place Fields
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Select any field, click the certificate to place it, then drag it into position.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_OPTIONS.filter(option => option.value !== 'staticText').map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectFieldToPlace(value)}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    activeField === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActiveField(activeField === 'qr' ? null : 'qr')}
                className={`px-3 py-2 rounded-lg text-sm ${
                  activeField === 'qr'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                QR Code
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="block text-xs font-medium text-gray-600">Custom Text Field</label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., With Distinction"
                />
                <button
                  type="button"
                  onClick={() => selectFieldToPlace('staticText')}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm ${
                    activeField === 'staticText'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {selectedField && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-blue-950">
                  Adjust {FIELD_LABELS[selectedField.fieldName]}
                </h3>
                <button
                  type="button"
                  onClick={() => removeField(selectedElement.index)}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs text-gray-600">X Position</label>
                  <input
                    type="number"
                    value={selectedField.x}
                    onChange={(e) => updateFieldProperty(selectedElement.index, 'x', Number(e.target.value))}
                    className="w-full rounded border px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Y Position</label>
                  <input
                    type="number"
                    value={selectedField.y}
                    onChange={(e) => updateFieldProperty(selectedElement.index, 'y', Number(e.target.value))}
                    className="w-full rounded border px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Font Size</label>
                  <input
                    type="number"
                    min="8"
                    value={selectedField.fontSize}
                    onChange={(e) => updateFieldProperty(selectedElement.index, 'fontSize', Number(e.target.value))}
                    className="w-full rounded border px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Color</label>
                  <input
                    type="color"
                    value={selectedField.fontColor}
                    onChange={(e) => updateFieldProperty(selectedElement.index, 'fontColor', e.target.value)}
                    className="h-8 w-full rounded border"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Font Family</label>
                  <input
                    type="text"
                    value={selectedField.fontFamily}
                    onChange={(e) => updateFieldProperty(selectedElement.index, 'fontFamily', e.target.value)}
                    className="w-full rounded border px-2 py-1"
                  />
                </div>
                {selectedField.fieldName === 'staticText' && (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">Text</label>
                    <input
                      type="text"
                      value={selectedField.staticValue || ''}
                      onChange={(e) => {
                        updateFieldProperty(selectedElement.index, 'staticValue', e.target.value);
                        updateFieldProperty(selectedElement.index, 'displayName', e.target.value);
                      }}
                      className="w-full rounded border px-2 py-1"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-600">Alignment</label>
                  <select
                    value={selectedField.textAlign}
                    onChange={(e) => updateFieldProperty(selectedElement.index, 'textAlign', e.target.value)}
                    className="w-full rounded border px-2 py-1"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {selectedElement?.type === 'qr' && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="mb-3 font-medium text-green-950">Adjust QR Code</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <label className="text-xs text-gray-600">X</label>
                  <input
                    type="number"
                    value={qrCodePosition.x}
                    onChange={(e) => updateQrProperty('x', Number(e.target.value))}
                    className="w-full rounded border px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Y</label>
                  <input
                    type="number"
                    value={qrCodePosition.y}
                    onChange={(e) => updateQrProperty('y', Number(e.target.value))}
                    className="w-full rounded border px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Size</label>
                  <input
                    type="number"
                    min="40"
                    value={qrCodePosition.size}
                    onChange={(e) => updateQrProperty('size', Number(e.target.value))}
                    className="w-full rounded border px-2 py-1"
                  />
                </div>
              </div>
            </div>
          )}

          {fields.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Placed Fields</h3>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <button
                    key={`${field.fieldName}-${index}`}
                    type="button"
                    onClick={() => setSelectedElement({ type: 'field', index })}
                    className={`w-full rounded-lg border p-3 text-left text-sm ${
                      selectedElement?.type === 'field' && selectedElement.index === index
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-medium">
                      {field.fieldName === 'staticText' ? field.staticValue || field.displayName : FIELD_LABELS[field.fieldName]}
                    </span>
                    <span className="ml-2 text-gray-500">({field.x}, {field.y})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Template'}
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">Preview</h3>
            {hasQrCode && (
              <button
                type="button"
                onClick={() => setSelectedElement({ type: 'qr' })}
                className={`rounded-lg px-3 py-1 text-sm ${
                  selectedElement?.type === 'qr'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                Adjust QR
              </button>
            )}
          </div>

          <div className="overflow-auto rounded-lg border border-gray-200 bg-gray-50">
            {imagePreview ? (
              <div className="relative inline-block min-w-full">
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Template"
                  onClick={handleImageClick}
                  onLoad={updateImageSize}
                  className={`block max-h-[680px] w-full select-none object-contain ${
                    activeField ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                />

                {fields.map((field, index) => {
                  const isSelected = selectedElement?.type === 'field' && selectedElement.index === index;

                  return (
                    <button
                      key={`${field.fieldName}-${index}`}
                      type="button"
                      onPointerDown={(event) => startDrag(event, { type: 'field', index })}
                      onPointerMove={handleDrag}
                      onPointerUp={stopDrag}
                      onPointerCancel={stopDrag}
                      className={`absolute cursor-move whitespace-nowrap rounded border-2 bg-white/70 px-2 py-1 shadow-sm ${
                        isSelected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-blue-300'
                      }`}
                      style={getFieldStyle(field)}
                    >
                      <span style={{ color: field.fontColor, fontFamily: field.fontFamily }}>
                        {field.fieldName === 'staticText' ? field.staticValue || field.displayName : FIELD_LABELS[field.fieldName]}
                      </span>
                    </button>
                  );
                })}

                {hasQrCode && (
                  <button
                    type="button"
                    onPointerDown={(event) => startDrag(event, { type: 'qr' })}
                    onPointerMove={handleDrag}
                    onPointerUp={stopDrag}
                    onPointerCancel={stopDrag}
                    className={`absolute flex cursor-move items-center justify-center border-2 border-dashed bg-white/80 font-mono text-sm text-green-900 shadow-sm ${
                      selectedElement?.type === 'qr'
                        ? 'border-green-700 ring-2 ring-green-200'
                        : 'border-green-500'
                    }`}
                    style={{
                      left: `${imageSize.naturalWidth ? (qrCodePosition.x / imageSize.naturalWidth) * 100 : 0}%`,
                      top: `${imageSize.naturalHeight ? (qrCodePosition.y / imageSize.naturalHeight) * 100 : 0}%`,
                      width: `${qrCodePosition.size * displayScale}px`,
                      height: `${qrCodePosition.size * displayScale}px`
                    }}
                  >
                    QR
                  </button>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center">
                <p className="text-gray-500">Upload an image to preview</p>
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Drag boxes on the certificate or select an item and fine tune its values from the controls.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplateCreator;
