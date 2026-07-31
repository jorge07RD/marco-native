// Navegación nativa de la app (una vez que existe un perfil local — ver
// src/pages/main/App.tsx, que muestra el onboarding directo si no existe
// todavía). No hay URLs de navegador que puedan visitarse directamente, así
// que no hace falta un guard reactivo sobre rutas.
//
// NOTA: se intentó code splitting (React.lazy + Suspense) para las pantallas
// secundarias, pero en Lynx un import lazy se compila como un "lazy bundle"
// (un paquete Lynx aparte, no un simple chunk JS) que no hereda el CSS global
// del bundle principal ni se reconcilia limpiamente dentro del árbol — causaba
// texto invisible (sin el color de texto global) y pantallas que no se
// reemplazaban al navegar. Se revirtió: todas las pantallas son imports
// eager normales.
import { MemoryRouter, Route, Routes } from 'react-router'

import { AppLayout } from './components/AppLayout'
import { AjustesScreen } from './screens/ajustes/AjustesScreen'
import { AnalyticsChartScreen } from './screens/analytics/AnalyticsChartScreen'
import { CalendarioScreen } from './screens/calendario/CalendarioScreen'
import { DashboardScreen } from './screens/dashboard/DashboardScreen'
import { HabitosScreen } from './screens/habitos/HabitosScreen'

export function AppStack() {
  return (
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/dashboard/:fecha" element={<DashboardScreen />} />
          <Route path="/habitos" element={<HabitosScreen />} />
          <Route path="/calendario" element={<CalendarioScreen />} />
          <Route path="/analisis" element={<AnalyticsChartScreen />} />
          <Route path="/ajustes" element={<AjustesScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}
