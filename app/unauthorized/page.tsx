export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-2">403</h1>
        <p className="text-gray-600 mb-6">No tienes permiso para acceder a esta sección.</p>
        <a href="/login" className="text-green-700 underline text-sm">
          Volver al inicio
        </a>
      </div>
    </main>
  )
}
