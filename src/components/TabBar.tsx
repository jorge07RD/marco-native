import { useLocation, useNavigate } from 'react-router'

import './TabBar.css'

// Iconos y orden exactos del nav original (marco/frontend +layout.svelte).
const TABS = [
  { path: '/dashboard', label: 'Progreso', icon: '📊' },
  { path: '/habitos', label: 'Hábitos', icon: '🎯' },
  { path: '/calendario', label: 'Calendario', icon: '📅' },
  { path: '/analisis', label: 'Análisis', icon: '📈' },
  { path: '/ajustes', label: 'Ajustes', icon: '⚙️' },
]

export function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <view className="TabBar">
      {TABS.map((tab) => {
        const active = location.pathname.startsWith(tab.path)
        return (
          <view key={tab.path} className="TabBarItem" bindtap={() => navigate(tab.path)}>
            <text className="TabBarIcon">{tab.icon}</text>
            <text className={`TabBarLabel ${active ? 'TabBarLabel--active' : ''}`}>
              {tab.label}
            </text>
          </view>
        )
      })}
    </view>
  )
}
