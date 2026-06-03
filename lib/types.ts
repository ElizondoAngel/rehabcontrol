// ─── Tipos de la base de datos de RehabControl ───────────────────────────────

export type Rol = 'admin' | 'terapeuta' | 'secretaria' | 'paciente'
export type EstadoCita = 'programada' | 'completada' | 'cancelada' | 'no_asistio'
export type EstadoPago = 'pendiente' | 'pagado' | 'reembolsado'
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'aseguradora'
export type TipoPaquete = 'individual' | 'contado' | 'aseguradora'
export type EstadoContrato = 'activo' | 'vencido' | 'cancelado'

export interface Profile {
  id: string
  nombre_completo: string
  email: string
  rol: Rol
  telefono?: string
  activo: boolean
  created_at: string
}

export interface Paciente {
  id_paciente: number
  profile_id?: string
  terapeuta_id: string
  nombre_completo: string
  fecha_nacimiento: string
  curp: string
  telefono?: string
  activo: boolean
  domicilio?: string
  contacto_emergencia?: string
  created_at: string
}

export interface Expediente {
  id_expediente: number
  paciente_id: number
  terapeuta_id: string
  diagnostico: string
  antecedentes?: string
  plan_tratamiento?: string
  fecha_apertura: string
  updated_at: string
}

export interface Cita {
  id_cita: number
  paciente_id: number
  terapeuta_id: string
  contrato_id?: number
  created_by: string
  fecha_hora: string
  duracion_min: number
  estado: EstadoCita
  notas?: string
}

export interface Paquete {
  id_paquete: number
  nombre: string
  tipo: TipoPaquete
  num_sesiones: number
  precio_total: number
  precio_por_sesion: number
  activo: boolean
}

export interface ContratoPaciente {
  id_contrato_paciente: number
  paciente_id: number
  paquete_id: number
  sesiones_totales: number
  sesiones_usadas: number
  sesiones_restantes: number
  monto_pagado: number
  fecha_inicio: string
  fecha_vencimiento: string
  estado: EstadoContrato
}

export interface Pago {
  id_pago: number
  paciente_id: number
  cita_id?: number
  contrato_id?: number
  registrado_por: string
  monto: number
  estado_pago: EstadoPago
  metodo_pago: MetodoPago
  fecha_pago: string
}

export interface ProgresoSesion {
  id_progreso_sesion: number
  cita_id: number
  paciente_id: number
  nivel_dolor: number
  movilidad: number
  ejercicios_completados: number
  observaciones?: string
  fecha_registro: string
}

export interface AuditLog {
  id_logs: number
  user_id: string
  accion: string
  tabla_afectada: string
  registro_id: string
  ip?: string
  timestamp: string
}
