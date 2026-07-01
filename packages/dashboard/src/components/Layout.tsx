import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, ShieldAlert, Settings as SettingsIcon, Fingerprint } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/visitors', label: 'Visitors', icon: Users, end: false },
  { to: '/events', label: 'Events', icon: ShieldAlert, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false }
]

export default function Layout() {
  return (
    <div className="dark min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r bg-card/50 flex flex-col">
        <div className="flex items-center gap-2 px-6 h-16 border-b">
          <Fingerprint className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Fingerprint</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="text-xs text-muted-foreground px-3">v0.1.0</div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
