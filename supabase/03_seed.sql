-- ============================================================
-- RehabControl — Datos de prueba (seed)
-- SOLO para desarrollo. NO ejecutar en producción.
-- Los usuarios deben crearse primero desde Supabase Auth
-- (Authentication > Users > Add user) con estos correos:
--   admin@rehabcontrol.dev      / Admin123!
--   terapeuta@rehabcontrol.dev  / Terapeuta123!
--   secretaria@rehabcontrol.dev / Secretaria123!
-- Luego actualizar sus roles en profiles con este script:
-- ============================================================

-- Actualizar roles (reemplaza los UUIDs con los de tu proyecto)
-- UPDATE profiles SET rol = 'admin'      WHERE email = 'admin@rehabcontrol.dev';
-- UPDATE profiles SET rol = 'terapeuta'  WHERE email = 'terapeuta@rehabcontrol.dev';
-- UPDATE profiles SET rol = 'secretaria' WHERE email = 'secretaria@rehabcontrol.dev';

-- ─── Paquetes de ejemplo (igual que en el documento) ─────────────────────────
INSERT INTO paquetes (nombre, tipo, num_sesiones, precio_total, precio_por_sesion) VALUES
  ('Sesión individual', 'individual', 1,  700.00,  700.00),
  ('Paquete contado',   'contado',   10, 6150.00,  615.00),
  ('Paquete aseguradora','aseguradora',15, 9570.00, 638.00)
ON CONFLICT DO NOTHING;
