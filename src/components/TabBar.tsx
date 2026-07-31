import { useLocation, useNavigate } from 'react-router'

import { type TabIconName, tabIcon } from './icons'
import './TabBar.css'

// Orden exacto del nav original (marco/frontend +layout.svelte). Los emoji se
// reemplazaron por íconos lineales propios: se veían distintos en cada
// plataforma y no admitían estado activo.
const TABS: { path: string; label: string; icon: TabIconName }[] = [
  { path: '/dashboard', label: 'Progreso', icon: 'progreso' },
  { path: '/habitos', label: 'Hábitos', icon: 'habitos' },
  { path: '/calendario', label: 'Calendario', icon: 'calendario' },
  { path: '/analisis', label: 'Análisis', icon: 'analisis' },
  { path: '/ajustes', label: 'Ajustes', icon: 'ajustes' },
]

// El color del trazo va dentro del markup SVG (a través de la prop `content`
// no hereda currentColor), así que se decide aquí y no en la hoja de estilos.
const ICON_ACTIVE = '#e94560'
const ICON_INACTIVE = '#7a7488'

export function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <view className="TabBar">
      {TABS.map((tab) => {
        const active = location.pathname.startsWith(tab.path)
        return (
          <view
            key={tab.path}
            className={`TabBarItem ${active ? 'TabBarItem--active' : ''}`}
            bindtap={() => navigate(tab.path)}
          >
            <svg
              className="TabBarIcon"
              content={tabIcon(tab.icon, active ? ICON_ACTIVE : ICON_INACTIVE)}
            />
            <text className={`TabBarLabel ${active ? 'TabBarLabel--active' : ''}`}>
              {tab.label}
            </text>
          </view>
        )
      })}
    </view>
  )
}
