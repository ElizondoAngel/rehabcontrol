-- ============================================================
-- RehabControl — Políticas de Row Level Security (RLS)
-- Ejecutar DESPUÉS de 01_schema.sql
-- ============================================================

-- Activar RLS en todas las tablas
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE paquetes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_paciente   ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE progreso_sesiones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- ─── Función helper: obtener el rol del usuario actual ──────────────────────
CREATE OR REPLACE FUNCTION auth_rol()
RETURNS TEXT AS $$
  SELECT rol::TEXT FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- Cada usuario ve y edita solo su propio perfil; admin ve todos
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR auth_rol() = 'admin');

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid() OR auth_rol() = 'admin');

-- ─── PAQUETES ────────────────────────────────────────────────────────────────
CREATE POLICY "paquetes_select" ON paquetes FOR SELECT
  USING (auth_rol() IN ('admin', 'secretaria', 'terapeuta', 'paciente'));

CREATE POLICY "paquetes_insert_update" ON paquetes FOR ALL
  USING (auth_rol() = 'admin');

-- ─── PACIENTES ───────────────────────────────────────────────────────────────
-- Terapeuta: solo sus pacientes asignados
-- Secretaria y Admin: todos
-- Paciente: solo su propio registro
CREATE POLICY "pacientes_select" ON pacientes FOR SELECT
  USING (
    auth_rol() IN ('admin', 'secretaria')
    OR (auth_rol() = 'terapeuta' AND terapeuta_id = auth.uid())
    OR (auth_rol() = 'paciente' AND profile_id = auth.uid())
  );

CREATE POLICY "pacientes_insert" ON pacientes FOR INSERT
  WITH CHECK (auth_rol() IN ('admin', 'secretaria'));

CREATE POLICY "pacientes_update" ON pacientes FOR UPDATE
  USING (auth_rol() IN ('admin', 'secretaria'));

-- ─── EXPEDIENTES ─────────────────────────────────────────────────────────────
-- Solo el terapeuta asignado y admin pueden ver/editar
CREATE POLICY "expedientes_select" ON expedientes FOR SELECT
  USING (
    auth_rol() = 'admin'
    OR (auth_rol() = 'terapeuta' AND terapeuta_id = auth.uid())
  );

CREATE POLICY "expedientes_insert" ON expedientes FOR INSERT
  WITH CHECK (
    auth_rol() = 'admin'
    OR (auth_rol() = 'terapeuta' AND terapeuta_id = auth.uid())
  );

CREATE POLICY "expedientes_update" ON expedientes FOR UPDATE
  USING (
    auth_rol() = 'admin'
    OR (auth_rol() = 'terapeuta' AND terapeuta_id = auth.uid())
  );

-- ─── CONTRATOS_PACIENTE ──────────────────────────────────────────────────────
CREATE POLICY "contratos_select" ON contratos_paciente FOR SELECT
  USING (
    auth_rol() IN ('admin', 'secretaria')
    OR EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id_paciente = contratos_paciente.paciente_id
      AND (
        (auth_rol() = 'terapeuta' AND p.terapeuta_id = auth.uid())
        OR (auth_rol() = 'paciente' AND p.profile_id = auth.uid())
      )
    )
  );

CREATE POLICY "contratos_insert" ON contratos_paciente FOR INSERT
  WITH CHECK (auth_rol() IN ('admin', 'secretaria'));

CREATE POLICY "contratos_update" ON contratos_paciente FOR UPDATE
  USING (auth_rol() IN ('admin', 'secretaria'));

-- ─── CITAS ───────────────────────────────────────────────────────────────────
CREATE POLICY "citas_select" ON citas FOR SELECT
  USING (
    auth_rol() IN ('admin', 'secretaria')
    OR (auth_rol() = 'terapeuta' AND terapeuta_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id_paciente = citas.paciente_id
      AND p.profile_id = auth.uid()
      AND auth_rol() = 'paciente'
    )
  );

CREATE POLICY "citas_insert" ON citas FOR INSERT
  WITH CHECK (auth_rol() IN ('admin', 'secretaria', 'terapeuta'));

CREATE POLICY "citas_update" ON citas FOR UPDATE
  USING (auth_rol() IN ('admin', 'secretaria', 'terapeuta'));

-- ─── PAGOS ───────────────────────────────────────────────────────────────────
CREATE POLICY "pagos_select" ON pagos FOR SELECT
  USING (
    auth_rol() IN ('admin', 'secretaria')
    OR EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id_paciente = pagos.paciente_id
      AND p.profile_id = auth.uid()
      AND auth_rol() = 'paciente'
    )
  );

CREATE POLICY "pagos_insert" ON pagos FOR INSERT
  WITH CHECK (auth_rol() IN ('admin', 'secretaria'));

CREATE POLICY "pagos_update" ON pagos FOR UPDATE
  USING (auth_rol() IN ('admin', 'secretaria'));

-- ─── PROGRESO_SESIONES ───────────────────────────────────────────────────────
-- Solo INSERT: las notas son inmutables por política de la clínica
CREATE POLICY "progreso_select" ON progreso_sesiones FOR SELECT
  USING (
    auth_rol() = 'admin'
    OR (auth_rol() = 'terapeuta' AND EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id_paciente = progreso_sesiones.paciente_id
      AND p.terapeuta_id = auth.uid()
    ))
    OR (auth_rol() = 'paciente' AND EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id_paciente = progreso_sesiones.paciente_id
      AND p.profile_id = auth.uid()
    ))
  );

-- Solo INSERT: sin UPDATE ni DELETE para garantizar inmutabilidad
CREATE POLICY "progreso_insert" ON progreso_sesiones FOR INSERT
  WITH CHECK (
    auth_rol() = 'admin'
    OR (auth_rol() = 'terapeuta' AND EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id_paciente = progreso_sesiones.paciente_id
      AND p.terapeuta_id = auth.uid()
    ))
  );

-- ─── AUDIT_LOGS ──────────────────────────────────────────────────────────────
-- Cualquier usuario autenticado puede insertar su propio log
-- Solo admin puede leer
-- Nadie puede editar ni borrar
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  USING (auth_rol() = 'admin');
