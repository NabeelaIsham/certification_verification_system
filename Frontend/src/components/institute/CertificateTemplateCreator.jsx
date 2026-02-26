import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const CertificateTemplateCreator = ({ API_URL, onTemplateCreated }) => {
  const [courses, setCourses] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [templateImage, setTemplateImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fields, setFields] = useState([]);
  const [qrCodePosition, setQrCodePosition] = useState({ x: 0, y: 0, size: 100 });
  const [activeField, setActiveField] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchCourses();
  }, []);

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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTemplateImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = (e) => {
    if (!imageRef.current || !activeField) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale coordinates based on actual image size vs displayed size
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    
    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);

    if (activeField === 'qr') {
      setQrCodePosition({ ...qrCodePosition, x: actualX, y: actualY });
    } else {
      const newField = {
        fieldName: activeField,
        x: actualX,
        y: actualY,
        fontSize: 24,
        fontColor: '#000000',
        fontFamily: 'Arial',
        textAlign: 'center'
      };
      setFields([...fields, newField]);
    }
    setActiveField(null);
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateFieldProperty = (index, property, value) => {
    const updatedFields = [...fields];
    updatedFields[index][property] = value;
    setFields(updatedFields);
  };

  const drawPreview = () => {
    if (!canvasRef.current || !imagePreview) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imagePreview;
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Draw field positions
      fields.forEach(field => {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(field.x - 50, field.y - 15, 100, 30);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px Arial';
        ctx.fillText(field.fieldName, field.x - 45, field.y - 20);
      });

      // Draw QR code position
      if (qrCodePosition.x && qrCodePosition.y) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          qrCodePosition.x, 
          qrCodePosition.y, 
          qrCodePosition.size, 
          qrCodePosition.size
        );
        ctx.fillStyle = '#ff0000';
        ctx.font = '12px Arial';
        ctx.fillText('QR Code', qrCodePosition.x, qrCodePosition.y - 10);
      }
    };
  };

  useEffect(() => {
    drawPreview();
  }, [imagePreview, fields, qrCodePosition]);

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
        // Reset form
        setTemplateName('');
        setSelectedCourse('');
        setTemplateImage(null);
        setImagePreview(null);
        setFields([]);
        setQrCodePosition({ x: 0, y: 0, size: 100 });
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert(error.response?.data?.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Create Certificate Template</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Form */}
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
            <p className="text-sm text-gray-500 mb-2">
              Select a field type and click on the image to place it
            </p>
            <div className="flex space-x-2 mb-2">
              <button
                onClick={() => setActiveField('studentName')}
                className={`px-3 py-2 rounded-lg text-sm ${
                  activeField === 'studentName' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Student Name
              </button>
              <button
                onClick={() => setActiveField('courseName')}
                className={`px-3 py-2 rounded-lg text-sm ${
                  activeField === 'courseName' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Course Name
              </button>
              <button
                onClick={() => setActiveField('awardDate')}
                className={`px-3 py-2 rounded-lg text-sm ${
                  activeField === 'awardDate' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Award Date
              </button>
              <button
                onClick={() => setActiveField('certificateCode')}
                className={`px-3 py-2 rounded-lg text-sm ${
                  activeField === 'certificateCode' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Certificate Code
              </button>
              <button
                onClick={() => setActiveField('qr')}
                className={`px-3 py-2 rounded-lg text-sm ${
                  activeField === 'qr' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                QR Code
              </button>
            </div>
          </div>

          {/* Fields List */}
          {fields.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Placed Fields</h3>
              {fields.map((field, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg mb-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{field.fieldName}</span>
                    <button
                      onClick={() => removeField(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label className="text-xs text-gray-500">Font Size</label>
                      <input
                        type="number"
                        value={field.fontSize}
                        onChange={(e) => updateFieldProperty(index, 'fontSize', parseInt(e.target.value))}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Color</label>
                      <input
                        type="color"
                        value={field.fontColor}
                        onChange={(e) => updateFieldProperty(index, 'fontColor', e.target.value)}
                        className="w-full h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Template'}
          </button>
        </div>

        {/* Right Column - Preview */}
        <div>
          <h3 className="font-medium mb-2">Preview</h3>
          <div className="border rounded-lg overflow-hidden">
            {imagePreview ? (
              <div className="relative">
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Template"
                  onClick={handleImageClick}
                  className="w-full cursor-crosshair"
                  style={{ maxHeight: '500px', objectFit: 'contain' }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Upload an image to preview</p>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Click on the image to place selected fields
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplateCreator;