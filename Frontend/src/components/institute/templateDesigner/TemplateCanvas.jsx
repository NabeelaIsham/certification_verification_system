export default function TemplateCanvas({
  hasQrCode,
  setSelectedElement,
  selectedElement,
  imagePreview,
  imageRef,
  handleImageClick,
  updateImageSize,
  activeField,
  fields,
  startDrag,
  handleDrag,
  stopDrag,
  getFieldStyle,
  FIELD_LABELS,
  imageFields,
  imageSize,
  displayScale,
  qrCodePosition
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">Preview</h3>
        {hasQrCode && (
          <button
            type="button"
            onClick={() =>
              setSelectedElement({
                type: 'qr'
              })
            }
            className={`rounded-lg px-3 py-1 text-sm ${selectedElement?.type === 'qr' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
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
              className={`block max-h-[680px] w-full select-none object-contain ${activeField ? 'cursor-crosshair' : 'cursor-default'}`}
            />

            {fields.map((field, index) => {
              const isSelected =
                selectedElement?.type === 'field' &&
                selectedElement.index === index;
              return (
                <button
                  key={`${field.fieldName}-${index}`}
                  type="button"
                  onPointerDown={(event) =>
                    startDrag(event, {
                      type: 'field',
                      index
                    })
                  }
                  onPointerMove={handleDrag}
                  onPointerUp={stopDrag}
                  onPointerCancel={stopDrag}
                  className={`absolute cursor-move whitespace-nowrap rounded border-2 bg-white/70 px-2 py-1 shadow-sm ${isSelected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-blue-300'}`}
                  style={getFieldStyle(field)}
                >
                  <span
                    style={{
                      color: field.fontColor,
                      fontFamily: field.fontFamily
                    }}
                  >
                    {field.fieldName === 'staticText'
                      ? field.staticValue || field.displayName
                      : FIELD_LABELS[field.fieldName]}
                  </span>
                </button>
              );
            })}

            {imageFields.map((field, index) => {
              const isSelected =
                selectedElement?.type === 'image' &&
                selectedElement.index === index;
              return (
                <button
                  key={`${field.label}-${index}`}
                  type="button"
                  onPointerDown={(event) =>
                    startDrag(event, {
                      type: 'image',
                      index
                    })
                  }
                  onPointerMove={handleDrag}
                  onPointerUp={stopDrag}
                  onPointerCancel={stopDrag}
                  className={`absolute cursor-move border-2 bg-white/40 p-0 shadow-sm ${isSelected ? 'border-purple-600 ring-2 ring-purple-200' : 'border-purple-300'}`}
                  style={{
                    left: `${imageSize.naturalWidth ? (field.x / imageSize.naturalWidth) * 100 : 0}%`,
                    top: `${imageSize.naturalHeight ? (field.y / imageSize.naturalHeight) * 100 : 0}%`,
                    width: `${field.width * displayScale}px`,
                    height: `${field.height * displayScale}px`
                  }}
                >
                  <img
                    src={field.previewUrl || field.imageUrl}
                    alt={field.label}
                    className="h-full w-full object-contain"
                    draggable="false"
                  />
                </button>
              );
            })}

            {hasQrCode && (
              <button
                type="button"
                onPointerDown={(event) =>
                  startDrag(event, {
                    type: 'qr'
                  })
                }
                onPointerMove={handleDrag}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
                className={`absolute flex cursor-move items-center justify-center border-2 border-dashed bg-white/80 font-mono text-sm text-green-900 shadow-sm ${selectedElement?.type === 'qr' ? 'border-green-700 ring-2 ring-green-200' : 'border-green-500'}`}
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
        Drag boxes on the certificate or select an item and fine tune its values
        from the controls.
      </p>
    </div>
  );
}
