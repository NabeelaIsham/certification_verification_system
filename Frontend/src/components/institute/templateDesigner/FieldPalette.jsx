export default function FieldPalette({
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
  addImageAssetField
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Place Fields
      </label>
      <p className="text-sm text-gray-500 mb-3">
        Select any field, click the certificate to place it, then drag it into
        position.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FIELD_OPTIONS.filter((option) => option.value !== 'staticText').map(
          ({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => selectFieldToPlace(value)}
              className={`px-3 py-2 rounded-lg text-sm ${activeField === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => setActiveField(activeField === 'qr' ? null : 'qr')}
          className={`px-3 py-2 rounded-lg text-sm ${activeField === 'qr' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          QR Code
        </button>
      </div>
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <label className="block text-xs font-medium text-gray-600">
          Custom Text Field
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Add a custom field, then enter or edit its text in the adjustment
          panel.
        </p>
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
            onClick={addCustomTextField}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm ${activeField === 'staticText' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <label className="block text-xs font-medium text-gray-600">
          Image Asset
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Add a logo, signature, seal, or custom image, then drag and resize it
          on the certificate.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {IMAGE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={assetLabel}
            onChange={(e) => setAssetLabel(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Label"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              addImageAssetField(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="col-span-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
