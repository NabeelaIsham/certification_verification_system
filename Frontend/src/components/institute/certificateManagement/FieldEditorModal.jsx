import PrivateImage from '../../shared/PrivateImage';
const FieldEditorModal = ({
  showFieldEditor,
  selectedTemplate,
  setShowFieldEditor,
  setSelectedTemplate
}) => {
  if (!showFieldEditor || !selectedTemplate) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-lg bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Edit Template Fields - {selectedTemplate.templateName}
          </h3>
          <button
            onClick={() => {
              setShowFieldEditor(false);
              setSelectedTemplate(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <PrivateImage
            src={selectedTemplate.templateImageUrl}
            alt={selectedTemplate.templateName}
            className="w-full max-h-96 object-contain border rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Current Fields</h4>
            {selectedTemplate.fields?.map((field, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg mb-2">
                <p className="font-medium">{field.fieldName}</p>
                <p className="text-sm">
                  Position: ({field.x}, {field.y})
                </p>
                <p className="text-sm">Font Size: {field.fontSize}px</p>
              </div>
            ))}
          </div>
          <div>
            <h4 className="font-medium mb-2">QR Code Position</h4>
            {selectedTemplate.qrCodePosition && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p>X: {selectedTemplate.qrCodePosition.x}</p>
                <p>Y: {selectedTemplate.qrCodePosition.y}</p>
                <p>Size: {selectedTemplate.qrCodePosition.size}px</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowFieldEditor(false);
              setSelectedTemplate(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default FieldEditorModal;
