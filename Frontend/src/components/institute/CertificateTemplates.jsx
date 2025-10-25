import { useState, useEffect } from 'react'

const CertificateTemplates = () => {
  const [templates, setTemplates] = useState([])
  //const [selectedTemplate, setSelectedTemplate] = useState(null)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTemplates([
        { id: 1, name: 'Standard Certificate', description: 'Default certificate template', isActive: true },
        { id: 2, name: 'Professional Certificate', description: 'Template for professional courses', isActive: true },
        { id: 3, name: 'Achievement Certificate', description: 'For special achievements and awards', isActive: false }
      ])
    }, 1000)
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Certificate Templates</h1>
        <p className="text-gray-600">Manage and customize certificate templates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-2xl font-bold mb-2">CERTIFICATE</div>
                <div className="text-sm">Template Preview</div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              <div className="flex justify-between items-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  template.isActive 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="space-x-2">
                  <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                  <button className="text-green-600 hover:text-green-900 text-sm">Use</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <div className="bg-white rounded-lg shadow border-2 border-dashed border-gray-300 flex items-center justify-center min-h-64 hover:border-gray-400 transition-colors cursor-pointer">
          <div className="text-center">
            <div className="text-gray-400 text-3xl mb-2">+</div>
            <div className="text-gray-600 font-medium">Add New Template</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CertificateTemplates