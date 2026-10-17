export default function FieldProperties({
  FIELD_LABELS,
  selectedField,
  removeField,
  selectedElement,
  updateFieldProperty
}) {
  return (
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
            onChange={(e) =>
              updateFieldProperty(
                selectedElement.index,
                'x',
                Number(e.target.value)
              )
            }
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Y Position</label>
          <input
            type="number"
            value={selectedField.y}
            onChange={(e) =>
              updateFieldProperty(
                selectedElement.index,
                'y',
                Number(e.target.value)
              )
            }
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Font Size</label>
          <input
            type="number"
            min="8"
            value={selectedField.fontSize}
            onChange={(e) =>
              updateFieldProperty(
                selectedElement.index,
                'fontSize',
                Number(e.target.value)
              )
            }
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Color</label>
          <input
            type="color"
            value={selectedField.fontColor}
            onChange={(e) =>
              updateFieldProperty(
                selectedElement.index,
                'fontColor',
                e.target.value
              )
            }
            className="h-8 w-full rounded border"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Font Family</label>
          <input
            type="text"
            value={selectedField.fontFamily}
            onChange={(e) =>
              updateFieldProperty(
                selectedElement.index,
                'fontFamily',
                e.target.value
              )
            }
            className="w-full rounded border px-2 py-1"
          />
        </div>
        {selectedField.fieldName === 'staticText' && (
          <div className="col-span-2">
            <label className="text-xs text-gray-600">Custom Field Data</label>
            <input
              type="text"
              value={selectedField.staticValue || ''}
              onChange={(e) => {
                updateFieldProperty(
                  selectedElement.index,
                  'staticValue',
                  e.target.value
                );
                updateFieldProperty(
                  selectedElement.index,
                  'displayName',
                  e.target.value
                );
              }}
              className="w-full rounded border px-2 py-1"
            />
          </div>
        )}
        <div>
          <label className="text-xs text-gray-600">Alignment</label>
          <select
            value={selectedField.textAlign}
            onChange={(e) =>
              updateFieldProperty(
                selectedElement.index,
                'textAlign',
                e.target.value
              )
            }
            className="w-full rounded border px-2 py-1"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    </div>
  );
}
