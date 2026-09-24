# RehabControl

Sistema web seguro de gestión clínica para rehabilitación física, desarrollado para **Rehabilitandomed**.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Supabase (PostgreSQL + Auth + RLS)

🔗 **Demo en producción:** [rehabcontrol.vercel.app](https://rehabcontrol.vercel.app)

---

## Tabla de contenidos

- [Descripción](#descripción)
- [Funcionalidades](#funcionalidades)
- [Roles del sistema](#roles-del-sistema)
- [Requisitos previos](#requisitos-previos)
- [Setup inicial](#setup-inicial-solo-la-primera-vez)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Flujo de trabajo con Git](#flujo-de-trabajo-con-git-ramas)
- [Metodología y Sprints](#metodología-y-sprints)
- [Equipo](#equipo)
- [Licencia](#licencia)

## Descripción

RehabControl reemplaza las agendas en papel y las hojas de cálculo dispersas por un solo sistema donde administradores, secretarias, terapeutas y pacientes gestionan citas, expedientes clínicos, contratos y pagos.

## Funcionalidades

- Autoagendado de citas por el paciente con disponibilidad por bloques
- Aprobación de citas por la secretaria con confirmación automática por correo
- Expedientes clínicos y seguimiento de progreso por sesión
- Contratos y paquetes con pagos a plazos y saldo recalculado automáticamente
- Sistema de opiniones/reseñas con moderación administrativa
- Notificaciones in-app reutilizables en todos los módulos
- Chatbot con IA (Google Gemini) para reporte de síntomas y agendado conversacional
- Landing page pública con perfiles de terapeutas, instalaciones y paquetes

## Roles del sistema

| Rol | Nivel | Acceso |
|---|---|---|
| `admin` | 4 | Total — usuarios, paquetes, finanzas, reportes y moderación de opiniones |
| `terapeuta` | 3 | Solo sus pacientes — agenda, expedientes, progreso de sesión |
| `secretaria` | 2 | Citas, pagos y registro — aprueba citas, registra pagos |
| `paciente` | 1 | Solo su información — agenda, historial, opiniones, chatbot |

## Requisitos previos

- Node.js 22 (usa `.nvmrc` → `nvm use`)
- Cuenta en [Supabase](https://supabase.com)
- Git

## Setup inicial (solo la primera vez)

### 1. Clonar el repositorio

```bash
git clone https://github.com/ElizondoAngel/rehabcontrol.git
cd rehabcontrol
nvm use          # usa la versión de Node del .nvmrc
npm install
```

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
# Editar .env.local con tus claves
```

Las claves de Supabase se encuentran en **Settings → API → Project URL y anon key** de tu proyecto. El archivo `.env.local` necesita:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
GEMINI_API_KEY=
```

### 3. Base de datos en Supabase

Ejecutar los archivos SQL **en orden** desde **Supabase → SQL Editor**:

```
supabase/01_schema.sql   ← Tablas, ENUMs, triggers
supabase/02_rls.sql      ← Políticas de seguridad Row Level Security
supabase/03_seed.sql     ← Datos de prueba (solo desarrollo)
```

### 4. Correr en desarrollo

```bash
npm run dev
# Abrir http://localhost:3000
```

## Estructura del proyecto

```
rehabcontrol/
├── app/
│   ├── login/              ← Único punto de entrada público
│   ├── admin/dashboard/    ← Dashboard administradora
│   ├── terapeuta/dashboard/
│   ├── secretaria/dashboard/
│   ├── paciente/dashboard/
│   └── unauthorized/       ← Página 403
├── lib/
│   ├── supabase/
│   │   ├── client.ts       ← Cliente para componentes del navegador
│   │   └── server.ts       ← Cliente para Server Components y Actions
│   └── types.ts            ← Tipos TypeScript del esquema
├── middleware.ts            ← Protección de rutas por rol (servidor)
├── supabase/
│   ├── 01_schema.sql
│   ├── 02_rls.sql
│   └── 03_seed.sql
├── .editorconfig           ← Consistencia de formato entre Mac/Windows
├── .gitattributes          ← LF en todos los archivos (evita CRLF en Windows)
├── .nvmrc                  ← Versión de Node (22)
└── .env.local.example      ← Plantilla de variables de entorno
```

## Flujo de trabajo con Git (ramas)

```bash
# Nueva funcionalidad
git checkout -b feature/nombre-funcionalidad

# Corrección de bug
git checkout -b fix/descripcion-bug

# Al terminar: PR hacia main, revisar antes de mergear
```

## Metodología y Sprints

Proyecto desarrollado con **Scrum**, en 4 sprints de 2 semanas cada uno.

| Sprint | Fechas | Enfoque |
|---|---|---|
| Sprint 1 | 16 – 29 septiembre 2026 | Autenticación, roles y agenda de citas |
| Sprint 2 | 30 septiembre – 13 octubre 2026 | Expedientes, progreso y contratos/pagos |
| Sprint 3 | 14 – 27 octubre 2026 | Opiniones, notificaciones y reportes |
| Sprint 4 | 28 octubre – 20 noviembre 2026 | Chatbot IA, landing final e integración |

> **Fecha de inicio del proyecto:** 16 de septiembre de 2026
> **Fecha de término:** 20 de noviembre de 2026

## Equipo

- Butanda Montero Giovani — Developer
- Elizondo Sandoval Ángel Eduardo — Scrum Master / Líder
- Valverde Sánchez Felix Marlon — Developer

**Grupo:** ITIC-902M · UTN · 2025-2026

## Licencia

Proyecto académico desarrollado para la Universidad Tecnológica de Nezahualcóyotl.
