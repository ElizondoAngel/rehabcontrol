import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const ESTADO_LABEL: Record<string, string> = {
  activo: 'Activo',
  en_revision: 'En revisión',
  cerrado: 'Cerrado',
}

function calcularEdad(fechaNacimiento?: string | null) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const mesDiff = hoy.getMonth() - nacimiento.getMonth()
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

function formatFecha(iso?: string | null) {
  if (!iso) return 'No registrada'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const idPaciente = searchParams.get('id_paciente')

  if (!idPaciente) {
    return NextResponse.json({ error: 'Falta id_paciente' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'terapeuta' && profile?.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // El paciente debe existir y pertenecer a este terapeuta
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, curp, fecha_nacimiento, telefono, domicilio, contacto_emergencia')
    .eq('id_paciente', idPaciente)
    .eq('terapeuta_id', user.id)
    .single()

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado o no autorizado' }, { status: 403 })
  }

  // El expediente de ese paciente, también restringido a este terapeuta
  const { data: expediente } = await supabase
    .from('expedientes')
    .select('*')
    .eq('paciente_id', idPaciente)
    .eq('terapeuta_id', user.id)
    .single()

  if (!expediente) {
    return NextResponse.json({ error: 'Este paciente no tiene un expediente clínico' }, { status: 404 })
  }

  // ── GENERAR EL PDF ────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const PAGE_W = 595.28 // A4
  const PAGE_H = 841.89
  const MARGIN = 50
  const LINE_H = 14

  const colorAzul = rgb(0.145, 0.388, 0.922)   // #2563EB
  const colorTexto = rgb(0.15, 0.17, 0.2)
  const colorMuted = rgb(0.45, 0.48, 0.53)
  const colorBorde = rgb(0.85, 0.86, 0.88)

  let page = pdfDoc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  function nuevaPaginaSiNecesario(espacioNecesario: number) {
    if (y - espacioNecesario < MARGIN) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - MARGIN
    }
  }

  // Envuelve texto largo en múltiples líneas según el ancho disponible
  function wrapText(text: string, font: typeof fontRegular, size: number, maxWidth: number): string[] {
    const palabras = text.split(/\s+/)
    const lineas: string[] = []
    let actual = ''
    for (const palabra of palabras) {
      const prueba = actual ? `${actual} ${palabra}` : palabra
      if (font.widthOfTextAtSize(prueba, size) > maxWidth && actual) {
        lineas.push(actual)
        actual = palabra
      } else {
        actual = prueba
      }
    }
    if (actual) lineas.push(actual)
    return lineas
  }

  function drawParrafo(text: string, opts?: { size?: number; font?: typeof fontRegular; color?: ReturnType<typeof rgb> }) {
    const size = opts?.size ?? 10
    const font = opts?.font ?? fontRegular
    const color = opts?.color ?? colorTexto
    const lineas = wrapText(text || '—', font, size, PAGE_W - MARGIN * 2)
    for (const linea of lineas) {
      nuevaPaginaSiNecesario(LINE_H)
      page.drawText(linea, { x: MARGIN, y, size, font, color })
      y -= LINE_H
    }
  }

  function drawSeccionTitulo(texto: string) {
    nuevaPaginaSiNecesario(28)
    y -= 6
    page.drawText(texto.toUpperCase(), { x: MARGIN, y, size: 11, font: fontBold, color: colorAzul })
    y -= 4
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.75,
      color: colorBorde,
    })
    y -= 14
  }

  function drawCampo(etiqueta: string, valor: string | null | undefined) {
    nuevaPaginaSiNecesario(LINE_H * 2)
    page.drawText(etiqueta.toUpperCase(), { x: MARGIN, y, size: 8, font: fontBold, color: colorMuted })
    y -= 12
    drawParrafo(valor || 'Sin información registrada')
    y -= 6
  }

  // ── ENCABEZADO ──
  page.drawText('RehabControl', { x: MARGIN, y, size: 18, font: fontBold, color: colorAzul })
  y -= 22
  page.drawText('Expediente Clínico', { x: MARGIN, y, size: 13, font: fontRegular, color: colorMuted })
  y -= 8
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: colorAzul })
  y -= 24

  // ── DATOS DEL PACIENTE ──
  const edad = calcularEdad(paciente.fecha_nacimiento)
  drawSeccionTitulo('Datos del paciente')
  drawCampo('Nombre completo', paciente.nombre_completo)
  drawCampo('Edad', edad !== null ? `${edad} años` : 'No registrada')
  drawCampo('CURP', paciente.curp)
  drawCampo('Teléfono', paciente.telefono)
  drawCampo('Domicilio', paciente.domicilio)
  drawCampo('Contacto de emergencia', paciente.contacto_emergencia)

  // ── ESTADO Y FECHAS DEL EXPEDIENTE ──
  drawSeccionTitulo('Información del expediente')
  drawCampo('Estado', ESTADO_LABEL[expediente.estado] ?? expediente.estado)
  drawCampo('Fecha de apertura', formatFecha(expediente.fecha_apertura))
  drawCampo('Última actualización', formatFecha(expediente.updated_at ?? expediente.fecha_apertura))

  // ── EVALUACIÓN INICIAL ──
  drawSeccionTitulo('Evaluación inicial')
  drawCampo('Motivo de consulta', expediente.motivo_consulta)
  drawCampo('Diagnóstico', expediente.diagnostico)
  drawCampo('Antecedentes', expediente.antecedentes)
  drawCampo('Fecha de inicio del problema', formatFecha(expediente.fecha_inicio_problema))
  drawCampo('Nivel de dolor inicial', expediente.nivel_dolor_inicial != null ? `${expediente.nivel_dolor_inicial}/10` : null)

  // ── EVALUACIÓN FÍSICA ──
  drawSeccionTitulo('Evaluación física')
  drawCampo('Limitaciones físicas', expediente.limitaciones_fisicas)
  drawCampo('Diagnóstico funcional', expediente.diagnostico_funcional)
  drawCampo('Rango de movimiento', expediente.rango_movimiento)
  drawCampo('Fuerza muscular', expediente.fuerza_muscular)
  drawCampo('Postura y movilidad', expediente.postura_movilidad)
  drawCampo('Observaciones clínicas', expediente.observaciones_clinicas)

  // ── PLAN DE TRATAMIENTO ──
  drawSeccionTitulo('Plan de tratamiento')
  drawCampo('Objetivos terapéuticos', expediente.objetivos_terapeuticos)
  drawCampo('Plan de tratamiento', expediente.plan_tratamiento)
  drawCampo('Tipo de terapias', expediente.tipo_terapias)
  drawCampo('Frecuencia de sesiones', expediente.frecuencia_sesiones)
  drawCampo('Indicaciones', expediente.indicaciones)

  // ── ARCHIVOS ADJUNTOS (solo listado de nombres, no se incrustan) ──
  const archivos = Array.isArray(expediente.archivos) ? expediente.archivos : []
  if (archivos.length > 0) {
    drawSeccionTitulo('Documentos clínicos adjuntos')
    for (const a of archivos) {
      nuevaPaginaSiNecesario(LINE_H)
      page.drawText(`• ${a.nombre}`, { x: MARGIN, y, size: 9.5, font: fontRegular, color: colorTexto })
      y -= LINE_H
    }
    y -= 4
    drawParrafo('Nota: los archivos adjuntos no están incluidos en este PDF. Consulta la plataforma para verlos.', { size: 8, color: colorMuted })
  }

  // ── PIE DE PÁGINA EN TODAS LAS PÁGINAS ──
  const totalPaginas = pdfDoc.getPageCount()
  const fechaGeneracion = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  for (let i = 0; i < totalPaginas; i++) {
    const p = pdfDoc.getPage(i)
    p.drawText(
      `Generado el ${fechaGeneracion} · Página ${i + 1} de ${totalPaginas}`,
      { x: MARGIN, y: 28, size: 7.5, font: fontRegular, color: colorMuted }
    )
  }

  const pdfBytes = await pdfDoc.save()

  const nombreArchivo = `expediente_${paciente.nombre_completo.replace(/\s+/g, '_')}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  })
}