import PrivateImage from '../../shared/PrivateImage';
export default function TemplateList({
  recentTemplate,
  copyTemplateId,
  loading,
  templates,
  handleEditFields,
  handleDeleteTemplate
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Certificate Templates</h2>
      {recentTemplate && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-green-900">
                Template created successfully
              </p>
              <p className="mt-1 text-sm text-green-800">
                Bulk upload TemplateId:
                <span className="ml-2 font-mono break-all">
                  {recentTemplate._id}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyTemplateId(recentTemplate._id)}
              className="self-start rounded-lg border border-green-300 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100 sm:self-auto"
            >
              Copy ID
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="h-48 bg-gray-100">
                <PrivateImage
                  src={template.templateImageUrl}
                  alt={template.templateName}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{template.templateName}</h3>
                <p className="text-sm text-gray-500">
                  Course: {template.courseId?.courseName || 'Not assigned'}
                </p>
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">
                    Bulk upload TemplateId
                  </p>
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <p className="font-mono text-xs text-gray-800 break-all">
                      {template._id}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyTemplateId(template._id)}
                      className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-xs text-gray-400">
                    Fields: {template.fields?.length || 0} placed
                  </p>
                  {template.fields && template.fields.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.fields.map((field, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          {field.fieldName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between">
                  <button
                    onClick={() => handleEditFields(template)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template._id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-gray-500 col-span-3 text-center py-8">
              No templates created yet. Click on "Create Template" to add one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
