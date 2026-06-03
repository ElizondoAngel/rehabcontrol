-- ============================================================
-- RehabControl — Schema completo con RLS
-- Ejecutar en: Supabase > SQL Editor
-- Orden: 01_schema.sql → 02_rls.sql → 03_seed.sql
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────
CREATE TYPE rol_usuario   AS ENUM ('admin', 'terapeuta', 'secretaria', 'paciente');
CREATE TYPE estado_cita   AS ENUM ('programada', 'completada', 'cancelada', 'no_asistio');
CREATE TYPE estado_pago   AS ENUM ('pendiente', 'pagado', 'reembolsado');
CREATE TYPE metodo_pago   AS ENUM ('efectivo', 'transferencia', 'tarjeta', 'aseguradora');
CREATE TYPE tipo_paquete  AS ENUM ('individual', 'contado', 'aseguradora');
CREATE TYPE estado_contrato AS ENUM ('activo', 'vencido', 'cancelado');

-- ─── TABLA: profiles ──────────────────────────────────────────────────────────
-- Extiende auth.users de Supabase con datos de perfil y rol
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT        NOT NULL,
  email           TEXT        UNIQUE NOT NULL,
  rol             rol_usuario NOT NULL DEFAULT 'paciente',
  telefono        TEXT,
  activo          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TABLA: paquetes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paquetes (
  id_paquete        SERIAL PRIMARY KEY,
  nombre            TEXT          NOT NULL,
  tipo              tipo_paquete  NOT NULL,
  num_sesiones      INTEGER       NOT NULL CHECK (num_sesiones > 0),
  precio_total      DECIMAL(10,2) NOT NULL CHECK (precio_total >= 0),
  precio_por_sesion DECIMAL(10,2) NOT NULL CHECK (precio_por_sesion >= 0),
  activo            BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ─── TABLA: pacientes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacientes (
  id_paciente        SERIAL PRIMARY KEY,
  profile_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  terapeuta_id       UUID NOT NULL REFERENCES profiles(id),
  nombre_completo    TEXT    NOT NULL,
  fecha_nacimiento   DATE    NOT NULL,
  curp               TEXT    UNIQUE NOT NULL,
  telefono           TEXT,
  activo             BOOLEAN NOT NULL DEFAULT TRUE,
  domicilio          TEXT,
  contacto_emergencia TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TABLA: expedientes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expedientes (
  id_expediente   SERIAL PRIMARY KEY,
  paciente_id     INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
  terapeuta_id    UUID    NOT NULL REFERENCES profiles(id),
  diagnostico     TEXT    NOT NULL,
  antecedentes    TEXT,
  plan_tratamiento TEXT,
  fecha_apertura  DATE    NOT NULL DEFAULT CURRENT_DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TABLA: contratos_paciente ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos_paciente (
  id_contrato_paciente SERIAL PRIMARY KEY,
  paciente_id          INTEGER       NOT NULL REFERENCES pacientes(id_paciente),
  paquete_id           INTEGER       NOT NULL REFERENCES paquetes(id_paquete),
  sesiones_totales     INTEGER       NOT NULL,
  sesiones_usadas      INTEGER       NOT NULL DEFAULT 0,
  sesiones_restantes   INTEGER       NOT NULL,
  monto_pagado         DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha_inicio         DATE          NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento    DATE          NOT NULL,
  estado               estado_contrato NOT NULL DEFAULT 'activo',
  CONSTRAINT sesiones_coherentes CHECK (sesiones_usadas + sesiones_restantes = sesiones_totales)
);

-- ─── TABLA: citas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citas (
  id_cita      SERIAL PRIMARY KEY,
  paciente_id  INTEGER NOT NULL REFERENCES pacientes(id_paciente),
  terapeuta_id UUID    NOT NULL REFERENCES profiles(id),
  contrato_id  INTEGER REFERENCES contratos_paciente(id_contrato_paciente),
  created_by   UUID    NOT NULL REFERENCES profiles(id),
  fecha_hora   TIMESTAMPTZ NOT NULL,
  duracion_min INTEGER NOT NULL DEFAULT 60 CHECK (duracion_min > 0),
  estado       estado_cita NOT NULL DEFAULT 'programada',
  notas        TEXT
);

-- Índice para prevenir citas duplicadas del mismo terapeuta en el mismo horario
CREATE UNIQUE INDEX IF NOT EXISTS idx_citas_sin_duplicados
  ON citas (terapeuta_id, fecha_hora)
  WHERE estado != 'cancelada';

-- ─── TABLA: pagos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id_pago        SERIAL PRIMARY KEY,
  paciente_id    INTEGER       NOT NULL REFERENCES pacientes(id_paciente),
  cita_id        INTEGER       REFERENCES citas(id_cita),
  contrato_id    INTEGER       REFERENCES contratos_paciente(id_contrato_paciente),
  registrado_por UUID          NOT NULL REFERENCES profiles(id),
  monto          DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  estado_pago    estado_pago   NOT NULL DEFAULT 'pendiente',
  metodo_pago    metodo_pago   NOT NULL,
  fecha_pago     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── TABLA: progreso_sesiones ────────────────────────────────────────────────
-- Inmutable por diseño: las notas clínicas no se modifican,
-- las correcciones se agregan como nuevas filas
CREATE TABLE IF NOT EXISTS progreso_sesiones (
  id_progreso_sesion    SERIAL PRIMARY KEY,
  cita_id               INTEGER NOT NULL REFERENCES citas(id_cita),
  paciente_id           INTEGER NOT NULL REFERENCES pacientes(id_paciente),
  nivel_dolor           INTEGER NOT NULL CHECK (nivel_dolor BETWEEN 0 AND 10),
  movilidad             INTEGER NOT NULL CHECK (movilidad BETWEEN 0 AND 10),
  ejercicios_completados INTEGER NOT NULL DEFAULT 0,
  observaciones         TEXT,
  fecha_registro        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TABLA: audit_logs ───────────────────────────────────────────────────────
-- Append-only: sin UPDATE ni DELETE (se refuerza con RLS)
CREATE TABLE IF NOT EXISTS audit_logs (
  id_logs        SERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES profiles(id),
  accion         TEXT NOT NULL,
  tabla_afectada TEXT NOT NULL,
  registro_id    UUID,
  ip             TEXT,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FUNCIÓN: auto-crear profile al registrarse ──────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre_completo, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'paciente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: se dispara al crear un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── FUNCIÓN: actualizar sesiones_restantes automáticamente ─────────────────
CREATE OR REPLACE FUNCTION actualizar_sesiones_restantes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sesiones_restantes := NEW.sesiones_totales - NEW.sesiones_usadas;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sesiones_restantes
  BEFORE INSERT OR UPDATE ON contratos_paciente
  FOR EACH ROW EXECUTE FUNCTION actualizar_sesiones_restantes();
