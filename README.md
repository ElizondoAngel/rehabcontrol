# RehabControl

Sistema web seguro de gestión clínica para rehabilitación física.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Supabase (PostgreSQL + Auth + RLS)

---

## Requisitos previos

- Node.js 22 (usa `.nvmrc` → `nvm use`)
- Cuenta en [Supabase](https://supabase.com)
- Git

---

## Setup inicial (solo la primera vez)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/rehabcontrol.git
cd rehabcontrol
nvm use          # usa la versión de Node del .nvmrc
npm install
```

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
# Editar .env.local con tus claves de Supabase
```

Las claves las encuentras en tu proyecto de Supabase:  
**Settings → API → Project URL y anon key**

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

---

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

---

## Roles del sistema

| Rol | Nivel | Acceso |
|---|---|---|
| admin | 4 | Total |
| terapeuta | 3 | Solo sus pacientes |
| secretaria | 2 | Citas, pagos, registro |
| paciente | 1 | Solo su información |

---

## Flujo de trabajo con Git (ramas)

```bash
# Nueva funcionalidad
git checkout -b feature/nombre-funcionalidad

# Corrección de bug
git checkout -b fix/descripcion-bug

# Al terminar: PR hacia main, revisar antes de mergear
```

---

## Equipo

- Butanda Montero Giovani  
- Elizondo Sandoval Ángel Eduardo  
- Valverde Sánchez Felix Marlon  

**Grupo:** ITIC-802M · UTN · 2025-2026
