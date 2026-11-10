import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

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

// Limpia caracteres no soportados por WinAnsi (emojis, etc.) para pdf-lib
function sanitizePdfText(texto: string): string {
  return (texto ?? '')
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[•·]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
}

// ── Dibuja la Marca de Agua y el Membrete con Logo Oficial en una página ──
function dibujarMarcaDeAguaYLogo(
  page: any,
  fontBold: any,
  fontRegular: any,
  opts: {
    PAGE_W: number
    PAGE_H: number
    MARGIN: number
    subtituloDoc: string
    folioTexto: string
    esPrimeraPagina: boolean
  }
) {
  const { PAGE_W, PAGE_H, MARGIN, subtituloDoc, folioTexto, esPrimeraPagina } = opts
  const colorAzul = rgb(0.09, 0.32, 0.78)       // #1752C7
  const colorTeal = rgb(0.05, 0.58, 0.53)       // #0D9488
  const colorMuted = rgb(0.42, 0.46, 0.52)
  const colorBorde = rgb(0.82, 0.85, 0.90)

  // 1. MARCA DE AGUA CENTRAL (Diagonal + Escudo Central tenue)
  // Círculo emblema central en marca de agua
  page.drawCircle({
    x: PAGE_W / 2,
    y: PAGE_H / 2 + 10,
    size: 115,
    borderWidth: 4,
    borderColor: colorAzul,
    borderOpacity: 0.055,
    color: colorAzul,
    opacity: 0.02,
  })

  // Iniciales "RC" gigantes en el centro como sello de agua
  page.drawText('RC', {
    x: PAGE_W / 2 - 68,
    y: PAGE_H / 2 - 22,
    size: 92,
    font: fontBold,
    color: colorAzul,
    opacity: 0.055,
  })

  // Texto diagonal de marca de agua
  page.drawText('REHABCONTROL  -  CLINICA DE REHABILITACION', {
    x: 85,
    y: 250,
    size: 26,
    font: fontBold,
    color: colorAzul,
    opacity: 0.055,
    rotate: degrees(38),
  })

  page.drawText('DOCUMENTO CLINICO OFICIAL  -  CONFIDENCIAL', {
    x: 115,
    y: 215,
    size: 16,
    font: fontBold,
    color: colorTeal,
    opacity: 0.05,
    rotate: degrees(38),
  })

  // Marco perimetral tipo expediente clínico
  page.drawRectangle({
    x: 24,
    y: 24,
    width: PAGE_W - 48,
    height: PAGE_H - 48,
    borderColor: colorBorde,
    borderWidth: 1,
  })

  // 2. ENCABEZADO CON LOGO DE LA CLÍNICA
  const headerTop = PAGE_H - 42
  if (esPrimeraPagina) {
    // Franja superior de color institucional
    page.drawRectangle({
      x: 24,
      y: PAGE_H - 30,
      width: PAGE_W - 48,
      height: 6,
      color: colorAzul,
    })

    // Caja del Logo RC (Escudo azul con insignia clínica)
    const logoX = MARGIN
    const logoY = headerTop - 44
    page.drawRectangle({
      x: logoX,
      y: logoY,
      width: 46,
      height: 46,
      color: colorAzul,
      borderColor: colorTeal,
      borderWidth: 1.5,
    })

    // Cruz médica sutil en la esquina del logo
    page.drawRectangle({ x: logoX + 34, y: logoY + 36, width: 8, height: 2.4, color: rgb(1, 1, 1) })
    page.drawRectangle({ x: logoX + 36.8, y: logoY + 33.2, width: 2.4, height: 8, color: rgb(1, 1, 1) })

    // Letras RC dentro del logo
    page.drawText('RC', {
      x: logoX + 8,
      y: logoY + 14,
      size: 21,
      font: fontBold,
      color: rgb(1, 1, 1),
    })

    // Nombre y membrete de la clínica al lado del logo
    page.drawText('REHABCONTROL', {
      x: logoX + 56,
      y: headerTop - 16,
      size: 17,
      font: fontBold,
      color: colorAzul,
    })
    page.drawText('CLINICA DE REHABILITACION FISICA Y TERAPIA MEDICA', {
      x: logoX + 56,
      y: headerTop - 29,
      size: 8.5,
      font: fontBold,
      color: colorTeal,
    })
    page.drawText(sanitizePdfText(subtituloDoc), {
      x: logoX + 56,
      y: headerTop - 41,
      size: 10,
      font: fontRegular,
      color: colorMuted,
    })

    // Recuadro derecho de Folio / Fecha
    const boxW = 140
    const boxX = PAGE_W - MARGIN - boxW
    page.drawRectangle({
      x: boxX,
      y: logoY,
      width: boxW,
      height: 46,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: colorBorde,
      borderWidth: 1,
    })
    page.drawText('EXPEDIENTE / REPORTE', {
      x: boxX + 8,
      y: logoY + 33,
      size: 7,
      font: fontBold,
      color: colorMuted,
    })
    page.drawText(sanitizePdfText(folioTexto), {
      x: boxX + 8,
      y: logoY + 19,
      size: 9.5,
      font: fontBold,
      color: colorAzul,
    })
    const fechaHoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    page.drawText(`Fecha: ${sanitizePdfText(fechaHoy)}`, {
      x: boxX + 8,
      y: logoY + 7,
      size: 8,
      font: fontRegular,
      color: colorMuted,
    })

    // Línea divisoria debajo del encabezado
    page.drawLine({
      start: { x: MARGIN, y: logoY - 10 },
      end: { x: PAGE_W - MARGIN, y: logoY - 10 },
      thickness: 1.2,
      color: colorAzul,
    })

    return logoY - 28
  } else {
    // Encabezado compacto en páginas subsecuentes
    page.drawRectangle({
      x: MARGIN,
      y: headerTop - 18,
      width: 22,
      height: 22,
      color: colorAzul,
    })
    page.drawText('RC', {
      x: MARGIN + 4,
      y: headerTop - 12,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
    page.drawText(`REHABCONTROL  |  ${sanitizePdfText(subtituloDoc)}`, {
      x: MARGIN + 28,
      y: headerTop - 11,
      size: 9,
      font: fontBold,
      color: colorMuted,
    })
    page.drawLine({
      start: { x: MARGIN, y: headerTop - 24 },
      end: { x: PAGE_W - MARGIN, y: headerTop - 24 },
      thickness: 0.75,
      color: colorBorde,
    })
    return headerTop - 42
  }
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

  // Si es terapeuta filtra por su user.id; si es admin puede descargar cualquier expediente
  let queryPac = supabase
    .from('pacientes')
    .select('id_paciente, nombre_completo, curp, fecha_nacimiento, telefono, domicilio, contacto_emergencia, terapeuta_id')
    .eq('id_paciente', idPaciente)
  if (profile?.rol === 'terapeuta') {
    queryPac = queryPac.eq('terapeuta_id', user.id)
  }
  const { data: paciente } = await queryPac.single()

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado o no autorizado' }, { status: 403 })
  }

  const { data: expediente } = await supabase
    .from('expedientes')
    .select('*')
    .eq('paciente_id', idPaciente)
    .maybeSingle()

  if (!expediente) {
    return NextResponse.json({ error: 'Este paciente no tiene un expediente clínico' }, { status: 404 })
  }

  // ── GENERAR EL PDF CON LOGO Y MARCA DE AGUA ───────────────────
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const PAGE_W = 595.28 // A4
  const PAGE_H = 841.89
  const MARGIN = 46
  const LINE_H = 14

  const colorAzul = rgb(0.09, 0.32, 0.78)
  const colorTexto = rgb(0.15, 0.17, 0.2)
  const colorMuted = rgb(0.45, 0.48, 0.53)
  const colorBorde = rgb(0.85, 0.86, 0.88)

  const folioTexto = `EXP-${String(expediente.id_expediente).padStart(4, '0')}`
  const subtituloDoc = 'Expediente Clinico Fisioterapeutico'

  let page = pdfDoc.addPage([PAGE_W, PAGE_H])
  let y = dibujarMarcaDeAguaYLogo(page, fontBold, fontRegular, {
    PAGE_W,
    PAGE_H,
    MARGIN,
    subtituloDoc,
    folioTexto,
    esPrimeraPagina: true,
  })

  function nuevaPaginaSiNecesario(espacioNecesario: number) {
    if (y - espacioNecesario < 52) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H])
      y = dibujarMarcaDeAguaYLogo(page, fontBold, fontRegular, {
        PAGE_W,
        PAGE_H,
        MARGIN,
        subtituloDoc,
        folioTexto,
        esPrimeraPagina: false,
      })
    }
  }

  function wrapText(text: string, font: typeof fontRegular, size: number, maxWidth: number): string[] {
    const limpio = sanitizePdfText(text)
    const parrafos = limpio.split(/\r?\n/)
    const lineas: string[] = []
    for (const parrafo of parrafos) {
      const palabras = parrafo.trim().split(/\s+/).filter(Boolean)
      if (palabras.length === 0) {
        lineas.push('')
        continue
      }
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
    }
    return lineas.length ? lineas : ['-']
  }

  function drawParrafo(text: string, opts?: { size?: number; font?: typeof fontRegular; color?: ReturnType<typeof rgb> }) {
    const size = opts?.size ?? 10
    const font = opts?.font ?? fontRegular
    const color = opts?.color ?? colorTexto
    const lineas = wrapText(text || '-', font, size, PAGE_W - MARGIN * 2)
    for (const linea of lineas) {
      nuevaPaginaSiNecesario(LINE_H)
      if (linea) {
        page.drawText(linea, { x: MARGIN, y, size, font, color })
      }
      y -= LINE_H
    }
  }

  function drawSeccionTitulo(texto: string) {
    nuevaPaginaSiNecesario(30)
    y -= 6
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: PAGE_W - MARGIN * 2,
      height: 18,
      color: rgb(0.94, 0.96, 0.99),
    })
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: 3.5,
      height: 18,
      color: colorAzul,
    })
    page.drawText(sanitizePdfText(texto.toUpperCase()), {
      x: MARGIN + 10,
      y: y + 1,
      size: 10,
      font: fontBold,
      color: colorAzul,
    })
    y -= 18
  }

  function drawCampo(etiqueta: string, valor: string | null | undefined) {
    nuevaPaginaSiNecesario(LINE_H * 2)
    page.drawText(sanitizePdfText(etiqueta.toUpperCase()), {
      x: MARGIN,
      y,
      size: 8,
      font: fontBold,
      color: colorMuted,
    })
    y -= 12
    drawParrafo(valor || 'Sin informacion registrada')
    y -= 5
  }

  // ── DATOS DEL PACIENTE ──
  const edad = calcularEdad(paciente.fecha_nacimiento)
  drawSeccionTitulo('01. Datos generales del paciente')
  drawCampo('Nombre completo', paciente.nombre_completo)
  drawCampo('Edad', edad !== null ? `${edad} anos` : 'No registrada')
  drawCampo('CURP', paciente.curp)
  drawCampo('Telefono', paciente.telefono)
  drawCampo('Domicilio', paciente.domicilio)
  drawCampo('Contacto de emergencia', paciente.contacto_emergencia)

  // ── ESTADO Y FECHAS DEL EXPEDIENTE ──
  drawSeccionTitulo('02. Control del expediente')
  drawCampo('Estado actual', ESTADO_LABEL[expediente.estado] ?? expediente.estado)
  drawCampo('Fecha de apertura', formatFecha(expediente.fecha_apertura))
  drawCampo('Ultima actualizacion', formatFecha(expediente.updated_at ?? expediente.fecha_apertura))

  // ── EVALUACIÓN INICIAL ──
  drawSeccionTitulo('03. Evaluacion clinica inicial')
  drawCampo('Motivo de consulta', expediente.motivo_consulta)
  drawCampo('Diagnostico clinico', expediente.diagnostico)
  drawCampo('Antecedentes medicos', expediente.antecedentes)
  drawCampo('Fecha de inicio del problema', formatFecha(expediente.fecha_inicio_problema))
  drawCampo('Nivel de dolor inicial (EVA)', expediente.nivel_dolor_inicial != null ? `${expediente.nivel_dolor_inicial}/10` : null)

  // ── EVALUACIÓN FÍSICA ──
  drawSeccionTitulo('04. Exploracion fisica y funcional')
  drawCampo('Limitaciones fisicas', expediente.limitaciones_fisicas)
  drawCampo('Diagnostico funcional', expediente.diagnostico_funcional)
  drawCampo('Rango de movimiento (ROM)', expediente.rango_movimiento)
  drawCampo('Fuerza muscular', expediente.fuerza_muscular)
  drawCampo('Postura y movilidad', expediente.postura_movilidad)
  drawCampo('Observaciones clinicas', expediente.observaciones_clinicas)

  // ── PLAN DE TRATAMIENTO ──
  drawSeccionTitulo('05. Plan de tratamiento y ejercicios')
  drawCampo('Objetivos terapeuticos', expediente.objetivos_terapeuticos)
  drawCampo('Plan de tratamiento', expediente.plan_tratamiento)
  drawCampo('Tipo de terapias', expediente.tipo_terapias)
  drawCampo('Frecuencia de sesiones', expediente.frecuencia_sesiones)
  drawCampo('Indicaciones y rutina de ejercicios', expediente.indicaciones)

  // ── ARCHIVOS ADJUNTOS ──
  const archivos = Array.isArray(expediente.archivos) ? expediente.archivos : []
  if (archivos.length > 0) {
    drawSeccionTitulo('06. Documentos clinicos adjuntos')
    for (const a of archivos) {
      nuevaPaginaSiNecesario(LINE_H)
      page.drawText(sanitizePdfText(`- ${a.nombre}`), { x: MARGIN, y, size: 9.5, font: fontRegular, color: colorTexto })
      y -= LINE_H
    }
    y -= 4
    drawParrafo('Nota: los archivos multimedia se consultan directamente en la plataforma RehabControl.', { size: 8, color: colorMuted })
  }

  // ── PIE DE PÁGINA EN TODAS LAS PÁGINAS ──
  const totalPaginas = pdfDoc.getPageCount()
  const fechaGeneracion = sanitizePdfText(
    new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  )
  for (let i = 0; i < totalPaginas; i++) {
    const p = pdfDoc.getPage(i)
    p.drawLine({
      start: { x: MARGIN, y: 42 },
      end: { x: PAGE_W - MARGIN, y: 42 },
      thickness: 0.5,
      color: colorBorde,
    })
    p.drawText(
      `RehabControl Clinica de Rehabilitacion · Documento con Marca de Agua Oficial · Generado el ${fechaGeneracion}`,
      { x: MARGIN, y: 31, size: 7.5, font: fontRegular, color: colorMuted }
    )
    p.drawText(
      `Pag. ${i + 1} / ${totalPaginas}`,
      { x: PAGE_W - MARGIN - 45, y: 31, size: 7.5, font: fontBold, color: colorAzul }
    )
  }

  const pdfBytes = await pdfDoc.save()
  const nombreArchivo = `expediente_${sanitizePdfText(paciente.nombre_completo).replace(/\s+/g, '_')}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  })
}

// ── POST: Genera un PDF oficial con Logo y Marca de Agua para Reportes del Chatbot / Clínica ──
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol, nombre_completo')
      .eq('id', user.id)
      .single()

    const body = await req.json()
    const titulo: string = body.titulo || 'Reporte Clinico RehabControl AI'
    const contenido: string = body.contenido || 'Sin contenido'
    const rolUsuario: string = profile?.rol ?? body.rol ?? 'usuario'
    const autor: string = profile?.nombre_completo ?? 'Usuario RehabControl'

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const PAGE_W = 595.28
    const PAGE_H = 841.89
    const MARGIN = 46
    const LINE_H = 14.5

    const colorAzul = rgb(0.09, 0.32, 0.78)
    const colorTexto = rgb(0.15, 0.17, 0.2)
    const colorMuted = rgb(0.45, 0.48, 0.53)
    const colorBorde = rgb(0.85, 0.86, 0.88)

    const folioTexto = `REP-${Date.now().toString().slice(-6)}`
    const subtituloDoc = `${titulo} (${rolUsuario.toUpperCase()})`

    let page = pdfDoc.addPage([PAGE_W, PAGE_H])
    let y = dibujarMarcaDeAguaYLogo(page, fontBold, fontRegular, {
      PAGE_W,
      PAGE_H,
      MARGIN,
      subtituloDoc,
      folioTexto,
      esPrimeraPagina: true,
    })

    // Ficha superior estilo expediente
    page.drawRectangle({
      x: MARGIN,
      y: y - 34,
      width: PAGE_W - MARGIN * 2,
      height: 36,
      color: rgb(0.95, 0.97, 1),
      borderColor: colorBorde,
      borderWidth: 1,
    })
    page.drawText(`SOLICITADO POR: ${sanitizePdfText(autor.toUpperCase())}`, {
      x: MARGIN + 10,
      y: y - 13,
      size: 8.5,
      font: fontBold,
      color: colorAzul,
    })
    page.drawText(`AREA / ROL: ${sanitizePdfText(rolUsuario.toUpperCase())}   |   ORIGEN: ASISTENTE CLINICO REHABCONTROL AI`, {
      x: MARGIN + 10,
      y: y - 26,
      size: 8,
      font: fontRegular,
      color: colorMuted,
    })
    y -= 52

    // Título de sección
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: PAGE_W - MARGIN * 2,
      height: 18,
      color: rgb(0.94, 0.96, 0.99),
    })
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: 3.5,
      height: 18,
      color: colorAzul,
    })
    page.drawText(sanitizePdfText(titulo.toUpperCase()), {
      x: MARGIN + 10,
      y: y + 1,
      size: 10,
      font: fontBold,
      color: colorAzul,
    })
    y -= 22

    const maxW = PAGE_W - MARGIN * 2
    const parrafos = sanitizePdfText(contenido).split(/\r?\n/)

    for (const p of parrafos) {
      const limpio = p.trim()
      if (!limpio) {
        y -= 8
        continue
      }
      const esSubtitulo = /^[0-9]+[\)\.]|^[-]{2,}|^[A-ZÁÉÍÓÚÑ\s]{5,}:/.test(limpio)
      const fontUsar = esSubtitulo ? fontBold : fontRegular
      const sizeUsar = esSubtitulo ? 10.5 : 10

      const palabras = limpio.split(/\s+/)
      let lineaActual = ''
      for (const palabra of palabras) {
        const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra
        if (fontUsar.widthOfTextAtSize(prueba, sizeUsar) > maxW && lineaActual) {
          if (y - LINE_H < 52) {
            page = pdfDoc.addPage([PAGE_W, PAGE_H])
            y = dibujarMarcaDeAguaYLogo(page, fontBold, fontRegular, {
              PAGE_W,
              PAGE_H,
              MARGIN,
              subtituloDoc,
              folioTexto,
              esPrimeraPagina: false,
            })
          }
          page.drawText(lineaActual, { x: MARGIN, y, size: sizeUsar, font: fontUsar, color: colorTexto })
          y -= LINE_H
          lineaActual = palabra
        } else {
          lineaActual = prueba
        }
      }
      if (lineaActual) {
        if (y - LINE_H < 52) {
          page = pdfDoc.addPage([PAGE_W, PAGE_H])
          y = dibujarMarcaDeAguaYLogo(page, fontBold, fontRegular, {
            PAGE_W,
            PAGE_H,
            MARGIN,
            subtituloDoc,
            folioTexto,
            esPrimeraPagina: false,
          })
        }
        page.drawText(lineaActual, { x: MARGIN, y, size: sizeUsar, font: fontUsar, color: colorTexto })
        y -= LINE_H
      }
    }

    const totalPaginas = pdfDoc.getPageCount()
    const fechaGeneracion = sanitizePdfText(
      new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    )
    for (let i = 0; i < totalPaginas; i++) {
      const p = pdfDoc.getPage(i)
      p.drawLine({
        start: { x: MARGIN, y: 42 },
        end: { x: PAGE_W - MARGIN, y: 42 },
        thickness: 0.5,
        color: colorBorde,
      })
      p.drawText(
        `RehabControl Clinica de Rehabilitacion · Documento con Marca de Agua Oficial · Generado el ${fechaGeneracion}`,
        { x: MARGIN, y: 31, size: 7.5, font: fontRegular, color: colorMuted }
      )
      p.drawText(
        `Pag. ${i + 1} / ${totalPaginas}`,
        { x: PAGE_W - MARGIN - 45, y: 31, size: 7.5, font: fontBold, color: colorAzul }
      )
    }

    const pdfBytes = await pdfDoc.save()
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte_clinico_${folioTexto}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('Error generando PDF de reporte:', err)
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}
