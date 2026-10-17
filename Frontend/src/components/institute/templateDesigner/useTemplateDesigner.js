import { buildTemplatePayload } from './templatePayload';
import useTemplateDrag from './useTemplateDrag';
import {
  FIELD_OPTIONS,
  FIELD_LABELS,
  IMAGE_TYPE_OPTIONS,
  clamp
} from './templateDefinitions';
import { notify } from '../../../services/notifications.js';
import { useState, useRef, useEffect } from 'react';
import apiClient from '../../../services/api.jsx';
export default function useTemplateDesigner({ API_URL, onTemplateCreated }) {
  const [courses, setCourses] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [templateImage, setTemplateImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fields, setFields] = useState([]);
  const [imageFields, setImageFields] = useState([]);
  const [qrCodePosition, setQrCodePosition] = useState({
    x: 0,
    y: 0,
    size: 100
  });
  const [activeField, setActiveField] = useState(null);
  const [customText, setCustomText] = useState('');
  const [assetType, setAssetType] = useState('signature');
  const [assetLabel, setAssetLabel] = useState('');
  const [selectedElement, setSelectedElement] = useState(null);
  const [imageSize, setImageSize] = useState({
    naturalWidth: 0,
    naturalHeight: 0,
    renderedWidth: 0
  });
  const [loading, setLoading] = useState(false);
  const imageRef = useRef(null);

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
      const response = await apiClient.get(`${API_URL}/courses`, {
        headers: {}
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
    if (!rect.width || !rect.height) return null;
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
        setImageFields([]);
        setQrCodePosition({
          x: 0,
          y: 0,
          size: 100
        });
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
      setQrCodePosition((prev) => ({
        ...prev,
        x: point.x,
        y: point.y
      }));
      setSelectedElement({
        type: 'qr'
      });
    } else {
      addFieldAtPoint(activeField, point);
    }
    setActiveField(null);
  };
  const addFieldAtPoint = (fieldName, point) => {
    const textValue = customText.trim();
    const newField = {
      fieldName,
      displayName:
        fieldName === 'staticText'
          ? textValue || 'Custom Text'
          : FIELD_LABELS[fieldName],
      staticValue: fieldName === 'staticText' ? textValue : '',
      x: point.x,
      y: point.y,
      fontSize: 24,
      fontColor: '#000000',
      fontFamily: 'Arial',
      textAlign: 'center'
    };
    setFields((prev) => {
      const nextIndex = prev.length;
      setSelectedElement({
        type: 'field',
        index: nextIndex
      });
      return [...prev, newField];
    });
  };
  const removeField = (index) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
    setSelectedElement(null);
  };
  const removeImageField = (index) => {
    setImageFields((prev) => prev.filter((_, i) => i !== index));
    setSelectedElement(null);
  };
  const updateFieldProperty = (index, property, value) => {
    setFields((prev) =>
      prev.map((field, i) =>
        i === index
          ? {
              ...field,
              [property]: value
            }
          : field
      )
    );
  };
  const updateImageFieldProperty = (index, property, value) => {
    setImageFields((prev) =>
      prev.map((field, i) =>
        i === index
          ? {
              ...field,
              [property]: value
            }
          : field
      )
    );
  };
  const selectFieldToPlace = (fieldName) => {
    setActiveField(activeField === fieldName ? null : fieldName);
  };
  const addCustomTextField = () => {
    if (!imagePreview || !imageSize.naturalWidth || !imageSize.naturalHeight) {
      notify('Upload a certificate template image before adding custom text.');
      return;
    }
    addFieldAtPoint('staticText', {
      x: Math.round(imageSize.naturalWidth / 2),
      y: Math.round(imageSize.naturalHeight / 2)
    });
    setCustomText('');
    setActiveField(null);
  };
  const addImageAssetField = (file) => {
    if (!file) return;
    if (!imagePreview || !imageSize.naturalWidth || !imageSize.naturalHeight) {
      notify(
        'Upload a certificate template image before adding logos or signatures.'
      );
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const label =
      assetLabel.trim() ||
      IMAGE_TYPE_OPTIONS.find((option) => option.value === assetType)?.label ||
      'Image';
    const newImageField = {
      imageType: assetType,
      label,
      file,
      previewUrl,
      x: Math.round(imageSize.naturalWidth / 2) - 60,
      y: Math.round(imageSize.naturalHeight / 2) - 30,
      width: assetType === 'signature' ? 180 : 120,
      height: assetType === 'signature' ? 70 : 120
    };
    setImageFields((prev) => {
      const nextIndex = prev.length;
      setSelectedElement({
        type: 'image',
        index: nextIndex
      });
      return [...prev, newImageField];
    });
    setAssetLabel('');
  };
  const updateQrProperty = (property, value) => {
    setQrCodePosition((prev) => ({
      ...prev,
      [property]: value
    }));
  };

  const { startDrag, handleDrag, stopDrag } = useTemplateDrag({
    getTemplatePoint,
    qrCodePosition,
    imageFields,
    fields,
    imageSize,
    setSelectedElement,
    setQrCodePosition,
    setImageFields,
    setFields
  });
  const handleSubmit = async () => {
    if (!templateName || !selectedCourse || !templateImage) {
      notify('Please fill all required fields');
      return;
    }
    setLoading(true);
    const formData = buildTemplatePayload({
      templateName,
      selectedCourse,
      templateImage,
      fields,
      imageFields,
      qrCodePosition
    });
    try {
      const response = await apiClient.post(
        `${API_URL}/certificate-templates`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      if (response.data.success) {
        notify('Template created successfully');
        onTemplateCreated?.(response.data.data);
        setTemplateName('');
        setSelectedCourse('');
        setTemplateImage(null);
        setImagePreview(null);
        setFields([]);
        setImageFields([]);
        setQrCodePosition({
          x: 0,
          y: 0,
          size: 100
        });
        setSelectedElement(null);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      notify(error.response?.data?.message || 'Failed to create template');
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
    transform:
      field.textAlign === 'left'
        ? 'translate(0, -50%)'
        : field.textAlign === 'right'
          ? 'translate(-100%, -50%)'
          : 'translate(-50%, -50%)'
  });
  const selectedField =
    selectedElement?.type === 'field' ? fields[selectedElement.index] : null;
  const selectedImageField =
    selectedElement?.type === 'image'
      ? imageFields[selectedElement.index]
      : null;
  const hasQrCode = qrCodePosition.x > 0 || qrCodePosition.y > 0;
  const displayScale =
    imageSize.renderedWidth && imageSize.naturalWidth
      ? imageSize.renderedWidth / imageSize.naturalWidth
      : 1;
  return {
    templateName,
    setTemplateName,
    selectedCourse,
    setSelectedCourse,
    courses,
    handleImageUpload,
    FIELD_OPTIONS,
    selectFieldToPlace,
    activeField,
    setActiveField,
    customText,
    setCustomText,
    addCustomTextField,
    assetType,
    setAssetType,
    IMAGE_TYPE_OPTIONS,
    assetLabel,
    setAssetLabel,
    addImageAssetField,
    selectedField,
    FIELD_LABELS,
    removeField,
    selectedElement,
    updateFieldProperty,
    qrCodePosition,
    updateQrProperty,
    selectedImageField,
    removeImageField,
    updateImageFieldProperty,
    fields,
    setSelectedElement,
    imageFields,
    handleSubmit,
    loading,
    hasQrCode,
    imagePreview,
    imageRef,
    handleImageClick,
    updateImageSize,
    startDrag,
    handleDrag,
    stopDrag,
    getFieldStyle,
    imageSize,
    displayScale
  };
}
