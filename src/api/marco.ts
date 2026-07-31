// Barrel de funciones de dominio de Marco contra SQLite local — mantiene los
// mismos nombres/formas que antes (cuando esto hablaba con el backend HTTP)
// para no tocar las pantallas. La implementación real vive repartida en
// varios archivos (perfil/categorias/habitos/registros/calendario/analisis)
// — dividido así a propósito: un solo archivo con toda esta lógica junta
// disparaba un bug real de PrimJS/Lynx ("stack underflow" al cargar el
// bundle) por exceder algún límite de tamaño/complejidad por módulo
// compilado; repartirlo en módulos más chicos lo resuelve sin perder nada
// de la lógica.
export * from './perfil'
export * from './categorias'
export * from './habitos'
export * from './registros'
export * from './calendario'
export * from './analisis'
