import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/dashboard',          label: 'Dashboard',      icon: '⊞', roles: ['admin','board','owner','tenant'] },
  { to: '/units',              label: 'Units',           icon: '🏠', roles: ['admin','board'] },
  { to: '/documents',          label: 'Documents',       icon: '📁', roles: ['admin','board','owner','tenant'] },
  { to: '/documents/requests', label: 'Record Requests', icon: '📋', roles: ['admin','board','owner'] },
]

const roleColors = {
  admin:  'bg-red-100 text-red-700',
  board:  'bg-brand-100 text-brand-700',
  owner:  'bg-green-100 text-green-700',
  tenant: 'bg-amber-100 text-amber-700',
  vendor: 'bg-purple-100 text-purple-700',
}

// Priority order for display badge — show highest role
const rolePriority = ['admin', 'board', 'owner', 'tenant', 'vendor']

export default function Layout() {
  const { profile, roles, hasAnyRole, signOut } = useAuth()
  const navigate = useNavigate()

  // Filter nav by whether user has any of the required roles
  const visibleNav = navItems.filter(n => hasAnyRole(n.roles))

  // Show highest-priority role in the badge
  const displayRole = rolePriority.find(r => roles.includes(r)) ?? 'owner'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-surface-border flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-none">AutomateMyBoard</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[130px]">
                {profile?.communities?.name ?? 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Profile */}
        <div className="px-3 py-4 border-t border-surface-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-sm font-medium">
              {(profile?.full_name ?? 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{profile?.full_name ?? 'User'}</p>
              <span className={`badge text-xs ${roleColors[displayRole] ?? 'bg-slate-100 text-slate-600'}`}>
                {displayRole}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full text-left px-3 py-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
