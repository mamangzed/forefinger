import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, ShieldAlert, Settings as SettingsIcon, Fingerprint, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/visitors', label: 'Visitors', icon: Users, end: false },
  { to: '/events', label: 'Events', icon: ShieldAlert, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false }
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

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
        <div className="p-3 border-t space-y-2">
          <div className="px-3 text-xs text-muted-foreground truncate">
            Signed in as <span className="text-foreground font-medium">{user}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <div className="px-3 text-[10px] text-muted-foreground">v0.1.0</div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
