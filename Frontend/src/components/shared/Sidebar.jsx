import { Link, useLocation } from 'react-router-dom'

const Sidebar = ({ userType = 'institute' }) => {
  const location = useLocation()

  const instituteMenu = [
    { name: 'Dashboard', href: '/institute/dashboard', icon: '📊' },
    { name: 'Students', href: '/institute/students', icon: '👨‍🎓' },
    { name: 'Courses', href: '/institute/courses', icon: '📚' },
    { name: 'Certificates', href: '/institute/certificates', icon: '📜' },
    { name: 'Templates', href: '/institute/templates', icon: '🎨' },
    { name: 'Bulk Upload', href: '/institute/upload', icon: '📁' },
    { name: 'Settings', href: '/institute/settings', icon: '⚙️' }
  ]

  const adminMenu = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { name: 'Institutes', href: '/admin/institutes', icon: '🏫' },
    { name: 'Users', href: '/admin/users', icon: '👥' },
    { name: 'Analytics', href: '/admin/analytics', icon: '📈' },
    { name: 'System Logs', href: '/admin/logs', icon: '📋' },
    { name: 'Settings', href: '/admin/settings', icon: '⚙️' }
  ]

  const studentMenu = [
    { name: 'Dashboard', href: '/student/dashboard', icon: '📊' },
    { name: 'My Certificates', href: '/student/certificates', icon: '📜' },
    { name: 'Profile', href: '/student/profile', icon: '👤' }
  ]

  const menuItems = userType === 'superadmin' ? adminMenu : 
                   userType === 'student' ? studentMenu : instituteMenu

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CV</span>
          </div>
          <span className="ml-2 text-lg font-bold text-gray-900">
            {userType === 'superadmin' ? 'Super Admin' : 
             userType === 'student' ? 'Student Portal' : 'Institute'}
          </span>
        </div>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  location.pathname === item.href
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default Sidebar