import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/visitors', label: 'Visitors' },
  { to: '/events', label: 'Events' },
  { to: '/settings', label: 'Settings' }
]

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-fp-surface border-r border-fp-border p-4 flex flex-col">
        <div className="text-xl font-bold text-fp-primary mb-8">FP Dashboard</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm ${
                  isActive
                    ? 'bg-fp-primary text-white'
                    : 'text-fp-muted hover:bg-fp-bg'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
