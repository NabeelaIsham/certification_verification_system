import FieldPalette from './templateDesigner/FieldPalette';
import FieldProperties from './templateDesigner/FieldProperties';
import TemplateCanvas from './templateDesigner/TemplateCanvas';
import useTemplateDesigner from './templateDesigner/useTemplateDesigner';
export default function CertificateTemplateCreator(props) {
  const {
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
  } = useTemplateDesigner(props);
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Create Certificate Template</h2>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Standard Certificate" />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course *
            </label>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Select a course</option>
              {courses.map(course => <option key={course._id} value={course._id}>
                  {course.courseName} ({course.courseCode})
                </option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Image * (PNG/JPG)
            </label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>

          <FieldPalette FIELD_OPTIONS={FIELD_OPTIONS} selectFieldToPlace={selectFieldToPlace} activeField={activeField} setActiveField={setActiveField} customText={customText} setCustomText={setCustomText} addCustomTextField={addCustomTextField} assetType={assetType} setAssetType={setAssetType} IMAGE_TYPE_OPTIONS={IMAGE_TYPE_OPTIONS} assetLabel={assetLabel} setAssetLabel={setAssetLabel} addImageAssetField={addImageAssetField} />

          {selectedField && <FieldProperties FIELD_LABELS={FIELD_LABELS} selectedField={selectedField} removeField={removeField} selectedElement={selectedElement} updateFieldProperty={updateFieldProperty} />}

          {selectedElement?.type === 'qr' && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="mb-3 font-medium text-green-950">Adjust QR Code</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <label className="text-xs text-gray-600">X</label>
                  <input type="number" value={qrCodePosition.x} onChange={e => updateQrProperty('x', Number(e.target.value))} className="w-full rounded border px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Y</label>
                  <input type="number" value={qrCodePosition.y} onChange={e => updateQrProperty('y', Number(e.target.value))} className="w-full rounded border px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Size</label>
                  <input type="number" min="40" value={qrCodePosition.size} onChange={e => updateQrProperty('size', Number(e.target.value))} className="w-full rounded border px-2 py-1" />
                </div>
              </div>
            </div>}

          {selectedImageField && <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-purple-950">Adjust {selectedImageField.label}</h3>
                <button type="button" onClick={() => removeImageField(selectedElement.index)} className="text-sm font-medium text-red-600 hover:text-red-800">
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs text-gray-600">X</label>
                  <input type="number" value={selectedImageField.x} onChange={e => updateImageFieldProperty(selectedElement.index, 'x', Number(e.target.value))} className="w-full rounded border px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Y</label>
                  <input type="number" value={selectedImageField.y} onChange={e => updateImageFieldProperty(selectedElement.index, 'y', Number(e.target.value))} className="w-full rounded border px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Width</label>
                  <input type="number" min="20" value={selectedImageField.width} onChange={e => updateImageFieldProperty(selectedElement.index, 'width', Number(e.target.value))} className="w-full rounded border px-2 py-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Height</label>
                  <input type="number" min="20" value={selectedImageField.height} onChange={e => updateImageFieldProperty(selectedElement.index, 'height', Number(e.target.value))} className="w-full rounded border px-2 py-1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-600">Label</label>
                  <input type="text" value={selectedImageField.label} onChange={e => updateImageFieldProperty(selectedElement.index, 'label', e.target.value)} className="w-full rounded border px-2 py-1" />
                </div>
              </div>
            </div>}

          {fields.length > 0 && <div className="mb-4">
              <h3 className="font-medium mb-2">Placed Fields</h3>
              <div className="space-y-2">
                {fields.map((field, index) => <button key={`${field.fieldName}-${index}`} type="button" onClick={() => setSelectedElement({
              type: 'field',
              index
            })} className={`w-full rounded-lg border p-3 text-left text-sm ${selectedElement?.type === 'field' && selectedElement.index === index ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
                    <span className="font-medium">
                      {field.fieldName === 'staticText' ? field.staticValue || field.displayName : FIELD_LABELS[field.fieldName]}
                    </span>
                    <span className="ml-2 text-gray-500">({field.x}, {field.y})</span>
                  </button>)}
              </div>
            </div>}

          {imageFields.length > 0 && <div className="mb-4">
              <h3 className="font-medium mb-2">Placed Images</h3>
              <div className="space-y-2">
                {imageFields.map((field, index) => <button key={`${field.label}-${index}`} type="button" onClick={() => setSelectedElement({
              type: 'image',
              index
            })} className={`w-full rounded-lg border p-3 text-left text-sm ${selectedElement?.type === 'image' && selectedElement.index === index ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
                    <span className="font-medium">{field.label}</span>
                    <span className="ml-2 text-gray-500">({field.width}x{field.height})</span>
                  </button>)}
              </div>
            </div>}

          <button type="button" onClick={handleSubmit} disabled={loading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Template'}
          </button>
        </div>

        <TemplateCanvas hasQrCode={hasQrCode} setSelectedElement={setSelectedElement} selectedElement={selectedElement} imagePreview={imagePreview} imageRef={imageRef} handleImageClick={handleImageClick} updateImageSize={updateImageSize} activeField={activeField} fields={fields} startDrag={startDrag} handleDrag={handleDrag} stopDrag={stopDrag} getFieldStyle={getFieldStyle} FIELD_LABELS={FIELD_LABELS} imageFields={imageFields} imageSize={imageSize} displayScale={displayScale} qrCodePosition={qrCodePosition} />
      </div>
    </div>;
}
