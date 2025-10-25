const Card = ({ 
  children, 
  className = '',
  padding = 'p-6',
  ...props 
}) => {
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`}>
      {children}
    </div>
  )
}

export const CardTitle = ({ children, className = '' }) => {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  )
}

export const CardDescription = ({ children, className = '' }) => {
  return (
    <p className={`text-sm text-gray-600 ${className}`}>
      {children}
    </p>
  )
}

export default Card