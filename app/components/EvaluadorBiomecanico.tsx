'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { EjercicioAsignadoIA, NombreEjercicioFijoIA } from '@/lib/rutina-ia'

export type NombreEjercicioIA = NombreEjercicioFijoIA

export interface InfoEjercicioIA {
  id: number
  nombre: NombreEjercicioIA
  articulaciones: string
  metaEstandar: string
  metaAdaptada: string
  reposoTexto: string
  imagenRef: string
  mensajeVozInicio: string
  descripcion: string
  tipoMejorAngulo: 'min' | 'target'
  targetIdeal: number
}

export const CATALOGO_EJERCICIOS_IA: InfoEjercicioIA[] = [
  {
    id: 1,
    nombre: 'Sentadilla',
    articulaciones: 'Cadera [23] · Rodilla [25] · Tobillo [27]',
    metaEstandar: '≤ 95°',
    metaAdaptada: '≤ 125°',
    reposoTexto: '≥ 158°',
    imagenRef: '/referencias/sentadilla.jpg',
    mensajeVozInicio: 'Sentadilla. Colócate de pie.',
    descripcion: 'Flexión bilateral de rodillas y cadera manteniendo la espalda alineada.',
    tipoMejorAngulo: 'min',
    targetIdeal: 90,
  },
  {
    id: 2,
    nombre: 'Desplante de Pierna',
    articulaciones: 'Cadera [23] · Rodilla [25] · Tobillo [27]',
    metaEstandar: '≤ 95°',
    metaAdaptada: '≤ 125°',
    reposoTexto: '≥ 158°',
    imagenRef: '/referencias/desplante_de_pierna.jpg',
    mensajeVozInicio: 'Desplante. Paso al frente y flexiona.',
    descripcion: 'Zancada frontal controlada evaluando estabilidad y flexión de rodilla.',
    tipoMejorAngulo: 'min',
    targetIdeal: 90,
  },
  {
    id: 3,
    nombre: 'Levantar Brazo al Costado',
    articulaciones: 'Cadera [23] · Hombro [11] · Muñeca [15]',
    metaEstandar: '80° a 105°',
    metaAdaptada: '60° a 79°',
    reposoTexto: '≤ 30° (Exceso > 120°)',
    imagenRef: '/referencias/levantar_brazo_al_costado.jpg',
    mensajeVozInicio: 'Levantar brazo. Sube hasta la altura del hombro.',
    descripcion: 'Abducción lateral de hombro sin sobrepasar los 120° para proteger el manguito rotador.',
    tipoMejorAngulo: 'target',
    targetIdeal: 90,
  },
  {
    id: 4,
    nombre: 'Doblar y Estirar Codo',
    articulaciones: 'Hombro [11] · Codo [13] · Muñeca [15]',
    metaEstandar: '≤ 45°',
    metaAdaptada: '≤ 75°',
    reposoTexto: '≥ 148°',
    imagenRef: '/referencias/doblar_y_estirar_codo.jpg',
    mensajeVozInicio: 'Doblar codo. Flexiona hacia el pecho.',
    descripcion: 'Flexo-extensión de codo aislando el movimiento del brazo superior.',
    tipoMejorAngulo: 'min',
    targetIdeal: 40,
  },
  {
    id: 5,
    nombre: 'Elevación de Pierna',
    articulaciones: 'Hombro [11] · Cadera [23] · Rodilla [25]',
    metaEstandar: '≤ 118°',
    metaAdaptada: '≤ 135°',
    reposoTexto: '≥ 165°',
    imagenRef: '/referencias/elevacion_de_pierna.jpg',
    mensajeVozInicio: 'Elevación de pierna. Sube la pierna recta.',
    descripcion: 'Flexión de cadera con rodilla extendida para fortalecimiento de psoas y cuádriceps.',
    tipoMejorAngulo: 'min',
    targetIdeal: 110,
  },
  {
    id: 6,
    nombre: 'Inclinación de Tronco',
    articulaciones: 'Pendiente Hombro Izq [11] y Der [12]',
    metaEstandar: '22° a 42°',
    metaAdaptada: '14° a 21°',
    reposoTexto: '≤ 7° (Exceso > 54°)',
    imagenRef: '/referencias/inclinacion_de_tronco.jpg',
    mensajeVozInicio: 'Inclinación de tronco. Flexiona suavemente a un lado.',
    descripcion: 'Flexión lateral controlada de columna evitando compensación excesiva (> 54°).',
    tipoMejorAngulo: 'target',
    targetIdeal: 30,
  },
]

const CONEXIONES_POSE: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
]

const INDICES_ARTICULACIONES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

type EstadoEtapa = 'REPOSO' | 'EN_MOVIMIENTO' | 'FONDO_OPTIMO' | 'FONDO_ADAPTADO'

export interface ResultadoEjercicioIA {
  ejercicio: NombreEjercicioIA
  repeticiones_meta: number
  modo_adaptado: boolean
  repeticiones_estandar: number
  repeticiones_adaptadas: number
  repeticiones_incompletas: number
  angulo_mejor_rango: number
  precision_porcentaje: number
  completado: boolean
}

interface Props {
  rutinaAsignada: EjercicioAsignadoIA[]
  indiceInicial?: number
  onVolverCatalogo?: () => void
  onSerieGuardada?: (nuevaSesion: any) => void
}

function calcularAngulo(a: [number, number], b: [number, number], c: [number, number]): number {
  const rad = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(a[1] - b[1], a[0] - b[0])
  let ang = Math.abs((rad * 180.0) / Math.PI)
  if (ang > 180.0) {
    ang = 360.0 - ang
  }
  return ang
}

export default function EvaluadorBiomecanico({
  rutinaAsignada,
  indiceInicial = 0,
  onVolverCatalogo,
  onSerieGuardada,
}: Props) {
  const listaEjercicios: EjercicioAsignadoIA[] =
    rutinaAsignada.length > 0
      ? rutinaAsignada
      : [{ ejercicio: 'Sentadilla', repeticiones: 5, modo_adaptado: false }]

  const [indiceActual, setIndiceActual] = useState<number>(
    Math.min(indiceInicial, listaEjercicios.length - 1)
  )
  const itemAsignadoActual = listaEjercicios[indiceActual] ?? listaEjercicios[0]
  const ejercicioActivo = itemAsignadoActual.ejercicio
  const metaRepeticiones = itemAsignadoActual.repeticiones

  const [modoAdaptado, setModoAdaptado] = useState<boolean>(itemAsignadoActual.modo_adaptado)
  const [vozActiva, setVozActiva] = useState<boolean>(true)
  const [mostrarPiP, setMostrarPiP] = useState<boolean>(true)
  const [imgError, setImgError] = useState<boolean>(false)

  // Contadores del ejercicio actual
  const [contadorEstandar, setContadorEstandar] = useState<number>(0)
  const [contadorAdaptado, setContadorAdaptado] = useState<number>(0)
  const [contadorIncompletas, setContadorIncompletas] = useState<number>(0)
  const [anguloActual, setAnguloActual] = useState<number>(0)
  const [mejorAngulo, setMejorAngulo] = useState<number | null>(null)
  const [mensajeHud, setMensajeHud] = useState<string>('LISTO PARA INICIAR')
  const [colorHud, setColorHud] = useState<string>('#E7EDF7')
  const [etapaActual, setEtapaActual] = useState<EstadoEtapa>('REPOSO')

  // Control de postura firme inicial (no grabar ni contar hasta que el paciente esté bien posicionado frente a la cámara)
  const [posturaFirme, setPosturaFirme] = useState<boolean>(false)
  const posturaFirmeRef = useRef<boolean>(false)
  const framesEnPosicionInicialRef = useRef<number>(0)

  // Control de meta cumplida por ejercicio (detenerse y pedir confirmación antes de pasar al siguiente)
  const [metaAlcanzadaActual, setMetaAlcanzadaActual] = useState<boolean>(false)
  const [resultadosPorEjercicio, setResultadosPorEjercicio] = useState<Record<string, ResultadoEjercicioIA>>({})
  const [capturasPreview, setCapturasPreview] = useState<Array<{ nombre: string; url: string }>>([])

  // Estado de cámara / modelo MediaPipe
  const [cargandoModelo, setCargandoModelo] = useState<boolean>(true)
  const [camaraActiva, setCamaraActiva] = useState<boolean>(false)
  const [grabandoVideo, setGrabandoVideo] = useState<boolean>(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [usandoVideoArchivo, setUsandoVideoArchivo] = useState<boolean>(false)

  // Guardado de serie completa
  const [nivelDolor, setNivelDolor] = useState<number>(2)
  const [observaciones, setObservaciones] = useState<string>('')
  const [guardando, setGuardando] = useState<boolean>(false)
  const [mensajeGuardado, setMensajeGuardado] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)

  // Referencias mutables para el loop de animación
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileVideoInputRef = useRef<HTMLInputElement | null>(null)
  const landmarkerRef = useRef<any>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Grabación de video (.webm) y capturas de postura (.jpg)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const fotosPosturaFilesRef = useRef<Map<string, File>>(new Map())
  // Guarda el DataURL del fotograma exacto de mejor rango para convertirlo en foto oficial solo cuando la repetición se complete
  const mejorFramePendienteRef = useRef<{ dataUrl: string; angulo: number } | null>(null)

  const bufferAngulosRef = useRef<number[]>([])
  const estadoEtapaRef = useRef<EstadoEtapa>('REPOSO')
  const estandarRef = useRef<number>(0)
  const adaptadoRef = useRef<number>(0)
  const incompletasRef = useRef<number>(0)
  const mejorAnguloRef = useRef<number | null>(null)
  const metaAlcanzadaRef = useRef<boolean>(false)
  const metaRepsRef = useRef<number>(metaRepeticiones)
  const ejercicioRef = useRef<NombreEjercicioIA>(ejercicioActivo)
  const modoAdaptadoRef = useRef<boolean>(modoAdaptado)
  const vozActivaRef = useRef<boolean>(true)
  const ultimaFraseRef = useRef<{ texto: string; ts: number }>({ texto: '', ts: 0 })

  const infoEjercicio =
    CATALOGO_EJERCICIOS_IA.find(e => e.nombre === ejercicioActivo) ?? CATALOGO_EJERCICIOS_IA[0]

  useEffect(() => {
    modoAdaptadoRef.current = modoAdaptado
  }, [modoAdaptado])

  useEffect(() => {
    vozActivaRef.current = vozActiva
  }, [vozActiva])

  useEffect(() => {
    metaRepsRef.current = metaRepeticiones
  }, [metaRepeticiones])

  // ── Motor de Voz Asistida (Web Speech API es-MX) ──
  const hablar = useCallback((texto: string, forzar = false) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (!vozActivaRef.current) return

    const ahora = Date.now()
    if (!forzar && ultimaFraseRef.current.texto === texto && ahora - ultimaFraseRef.current.ts < 2200) {
      return
    }
    ultimaFraseRef.current = { texto, ts: ahora }

    try {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(texto)
      utter.lang = 'es-MX'
      utter.rate = 1.12
      utter.pitch = 1.0
      const voces = window.speechSynthesis.getVoices()
      const vozEs = voces.find(
        v =>
          v.lang.toLowerCase().includes('es-mx') ||
          v.lang.toLowerCase().includes('es') ||
          v.name.toLowerCase().includes('sabina') ||
          v.name.toLowerCase().includes('helena') ||
          v.name.toLowerCase().includes('spanish')
      )
      if (vozEs) utter.voice = vozEs
      window.speechSynthesis.speak(utter)
    } catch {
      // Silenciar errores de síntesis
    }
  }, [])

  // ── Iniciar o reanudar grabación del Canvas en .webm SOLO cuando el paciente ya está firme ──
  const asegurarGrabacionActiva = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof MediaRecorder === 'undefined') return
    try {
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.resume()
          setGrabandoVideo(true)
        }
        return
      }
      const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(20) : null
      if (!canvasStream) return

      videoChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : ''

      const recorder = mimeType
        ? new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 900000 })
        : new MediaRecorder(canvasStream)

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data)
        }
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setGrabandoVideo(true)
    } catch {
      // Si el navegador no soporta captureStream, aún se enviarán las fotos de postura .jpg
    }
  }, [])

  // ── Pausar grabación cuando el paciente aún se está acomodando o ya terminó su serie ──
  const pausarGrabacionCanvas = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause()
      }
    } catch {}
    setGrabandoVideo(false)
  }, [])

  // ── Guardar temporalmente el fotograma del punto máximo de esfuerzo (aún sin publicarlo como foto hasta que la repetición o el ejercicio se complete) ──
  const guardarFotogramaPicoTemporal = useCallback((ang: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      mejorFramePendienteRef.current = { dataUrl, angulo: Math.round(ang) }
    } catch {}
  }, [])

  // ── Confirmar y publicar la foto de postura SOLO cuando la repetición / ejercicio se haya completado ──
  const confirmarFotoEjercicioCompletado = useCallback((nombreEj: NombreEjercicioIA, anguloFallback: number) => {
    const pendiente = mejorFramePendienteRef.current
    const canvas = canvasRef.current

    const guardarDesdeBlob = (blob: Blob, anguloFinal: number) => {
      const nombreLimpio = nombreEj.replace(/\s+/g, '_').toLowerCase()
      const fileName = `postura_${nombreLimpio}_${Math.round(anguloFinal)}deg.jpg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })
      fotosPosturaFilesRef.current.set(nombreEj, file)
      const previewUrl = URL.createObjectURL(blob)
      setCapturasPreview(prev => {
        const sinPrevio = prev.filter(p => !p.nombre.startsWith(nombreEj))
        return [...sinPrevio, { nombre: `${nombreEj} (${Math.round(anguloFinal)}°)`, url: previewUrl }]
      })
    }

    if (pendiente?.dataUrl) {
      fetch(pendiente.dataUrl)
        .then(r => r.blob())
        .then(blob => guardarDesdeBlob(blob, pendiente.angulo))
        .catch(() => {})
      return
    }

    if (!canvas) return
    try {
      canvas.toBlob(
        blob => {
          if (!blob) return
          guardarDesdeBlob(blob, anguloFallback)
        },
        'image/jpeg',
        0.85
      )
    } catch {}
  }, [])

  // ── Filtro Anti-Temblor (ventana móvil de 6 fotogramas) ──
  const suavizar = useCallback((valor: number): number => {
    const buf = bufferAngulosRef.current
    buf.push(valor)
    if (buf.length > 6) buf.shift()
    const suma = buf.reduce((acc, v) => acc + v, 0)
    return suma / buf.length
  }, [])

  // ── Actualizar mejor ángulo alcanzado y respaldar en memoria el fotograma pico ──
  const registrarMejorAngulo = useCallback(
    (ang: number, nombreEj: NombreEjercicioIA) => {
      const actual = mejorAnguloRef.current
      let esNuevoMejor = false
      if (
        nombreEj === 'Sentadilla' ||
        nombreEj === 'Desplante de Pierna' ||
        nombreEj === 'Doblar y Estirar Codo' ||
        nombreEj === 'Elevación de Pierna'
      ) {
        if (actual === null || ang < actual) {
          mejorAnguloRef.current = Math.round(ang)
          setMejorAngulo(Math.round(ang))
          esNuevoMejor = true
        }
      } else {
        if (actual === null || ang > actual) {
          mejorAnguloRef.current = Math.round(ang)
          setMejorAngulo(Math.round(ang))
          esNuevoMejor = true
        }
      }
      if (esNuevoMejor || !mejorFramePendienteRef.current) {
        guardarFotogramaPicoTemporal(ang)
      }
    },
    [guardarFotogramaPicoTemporal]
  )

  // ── Cambiar al ejercicio de un índice de la rutina asignada ──
  const irAEjercicioPorIndice = useCallback(
    (nuevoIndice: number) => {
      const item = listaEjercicios[nuevoIndice]
      if (!item) return

      setIndiceActual(nuevoIndice)
      ejercicioRef.current = item.ejercicio
      metaRepsRef.current = item.repeticiones
      modoAdaptadoRef.current = item.modo_adaptado
      setModoAdaptado(item.modo_adaptado)
      setImgError(false)

      // Si ya tenía progreso guardado en esta sesión, restaurarlo o iniciar en 0
      const previo = resultadosPorEjercicio[item.ejercicio]
      estandarRef.current = previo ? previo.repeticiones_estandar : 0
      adaptadoRef.current = previo ? previo.repeticiones_adaptadas : 0
      incompletasRef.current = previo ? previo.repeticiones_incompletas : 0
      mejorAnguloRef.current = previo ? previo.angulo_mejor_rango : null
      metaAlcanzadaRef.current = previo ? previo.completado : false
      estadoEtapaRef.current = 'REPOSO'
      bufferAngulosRef.current = []
      mejorFramePendienteRef.current = null
      posturaFirmeRef.current = false
      framesEnPosicionInicialRef.current = 0
      setPosturaFirme(false)
      pausarGrabacionCanvas()

      setContadorEstandar(estandarRef.current)
      setContadorAdaptado(adaptadoRef.current)
      setContadorIncompletas(incompletasRef.current)
      setMejorAngulo(mejorAnguloRef.current)
      setMetaAlcanzadaActual(metaAlcanzadaRef.current)
      setAnguloActual(0)
      setEtapaActual('REPOSO')
      setMensajeHud(metaAlcanzadaRef.current ? '¡META CUMPLIDA!' : 'COLÓCATE FIRME FRENTE A LA CÁMARA')
      setColorHud(metaAlcanzadaRef.current ? '#34D399' : '#FBBF24')
      setMensajeGuardado(null)

      const info = CATALOGO_EJERCICIOS_IA.find(e => e.nombre === item.ejercicio)
      if (info) {
        hablar(`${info.mensajeVozInicio} Colócate firme en posición inicial para comenzar a grabar.`, true)
      }
    },
    [listaEjercicios, resultadosPorEjercicio, hablar, pausarGrabacionCanvas]
  )

  // ── Verificar si ya llegó a la meta de repeticiones asignadas por el terapeuta ──
  const verificarMetaAlcanzada = useCallback(() => {
    const hechas = estandarRef.current + adaptadoRef.current
    const meta = metaRepsRef.current
    const nombreEj = ejercicioRef.current
    const info = CATALOGO_EJERCICIOS_IA.find(e => e.nombre === nombreEj) ?? CATALOGO_EJERCICIOS_IA[0]

    const totalIntentos = hechas + incompletasRef.current
    const prec = totalIntentos > 0 ? Math.round((hechas / totalIntentos) * 100) : 100
    const cumplio = hechas >= meta

    // Confirmar la foto de la repetición completada (usando el fotograma pico donde ejecutó el ejercicio, nunca cuando apenas se está acomodando)
    if (hechas > 0) {
      confirmarFotoEjercicioCompletado(nombreEj, mejorAnguloRef.current ?? info.targetIdeal)
    }

    setResultadosPorEjercicio(prev => ({
      ...prev,
      [nombreEj]: {
        ejercicio: nombreEj,
        repeticiones_meta: meta,
        modo_adaptado: modoAdaptadoRef.current,
        repeticiones_estandar: estandarRef.current,
        repeticiones_adaptadas: adaptadoRef.current,
        repeticiones_incompletas: incompletasRef.current,
        angulo_mejor_rango: mejorAnguloRef.current ?? info.targetIdeal,
        precision_porcentaje: prec,
        completado: cumplio,
      },
    }))

    if (cumplio && !metaAlcanzadaRef.current) {
      metaAlcanzadaRef.current = true
      setMetaAlcanzadaActual(true)
      pausarGrabacionCanvas()
      setMensajeHud(`¡META DE ${meta} REPETICIONES COMPLETADA!`)
      setColorHud('#34D399')
      confirmarFotoEjercicioCompletado(nombreEj, mejorAnguloRef.current ?? info.targetIdeal)
      hablar(
        `¡Excelente! Completaste las ${meta} repeticiones de ${nombreEj}. Grabación en pausa. Confirma en pantalla para continuar.`,
        true
      )
    }
  }, [confirmarFotoEjercicioCompletado, hablar, pausarGrabacionCanvas])

  // ── Inicializar MediaPipe PoseLandmarker ──
  useEffect(() => {
    let cancelado = false

    async function cargarPoseLandmarker() {
      try {
        setCargandoModelo(true)
        const vision = await import('@mediapipe/tasks-vision')
        const { PoseLandmarker, FilesetResolver } = vision

        const wasmFileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        )

        let detector: any = null
        try {
          detector = await PoseLandmarker.createFromOptions(wasmFileset, {
            baseOptions: {
              modelAssetPath: '/models/pose_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55,
          })
        } catch {
          detector = await PoseLandmarker.createFromOptions(wasmFileset, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55,
          })
        }

        if (!cancelado) {
          landmarkerRef.current = detector
          setCargandoModelo(false)
        }
      } catch (err: any) {
        console.error('[MediaPipe PoseLandmarker Error]', err)
        if (!cancelado) {
          setErrorCamara('No se pudo inicializar el motor biomecánico MediaPipe.')
          setCargandoModelo(false)
        }
      }
    }

    cargarPoseLandmarker()

    return () => {
      cancelado = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // ── Bucle de inferencia biomecánica en tiempo real ──
  const procesarFotograma = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const detector = landmarkerRef.current

    if (!video || !canvas || !detector || video.paused || video.ended || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(procesarFotograma)
      return
    }

    const w = video.videoWidth || 960
    const h = video.videoHeight || 540
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    if (!usandoVideoArchivo) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, w, h)
    ctx.restore()

    const ahoraMs = performance.now()
    let resultado: any = null
    try {
      resultado = detector.detectForVideo(video, ahoraMs)
    } catch {
      animFrameRef.current = requestAnimationFrame(procesarFotograma)
      return
    }

    const lmList = resultado?.landmarks?.[0]
    const ejActual = ejercicioRef.current
    const adaptadoActivo = modoAdaptadoRef.current

    if (lmList && lmList.length > 28) {
      const getPt = (idx: number): [number, number] => {
        const rawX = lmList[idx].x
        const x = !usandoVideoArchivo ? 1 - rawX : rawX
        return [x, lmList[idx].y]
      }

      const hombroIzq = getPt(11)
      const hombroDer = getPt(12)
      const codoIzq = getPt(13)
      const munecaIzq = getPt(15)
      const caderaIzq = getPt(23)
      const rodillaIzq = getPt(25)
      const tobilloIzq = getPt(27)

      let ang = 0
      let posLabel: [number, number] = [60, 160]
      let etapa = estadoEtapaRef.current
      let hudMsg = mensajeHud
      let hudCol = colorHud

      // ── Calcular primero el ángulo del ejercicio actual y verificar si está en POSICIÓN FIRME INICIAL ──
      let enPosicionReposo = false
      if (ejActual === 'Sentadilla' || ejActual === 'Desplante de Pierna') {
        ang = suavizar(calcularAngulo(caderaIzq, rodillaIzq, tobilloIzq))
        posLabel = [rodillaIzq[0] * w, rodillaIzq[1] * h]
        enPosicionReposo = ang >= 158
      } else if (ejActual === 'Levantar Brazo al Costado') {
        ang = suavizar(calcularAngulo(caderaIzq, hombroIzq, munecaIzq))
        posLabel = [hombroIzq[0] * w, hombroIzq[1] * h]
        enPosicionReposo = ang <= 30
      } else if (ejActual === 'Doblar y Estirar Codo') {
        ang = suavizar(calcularAngulo(hombroIzq, codoIzq, munecaIzq))
        posLabel = [codoIzq[0] * w, codoIzq[1] * h]
        enPosicionReposo = ang >= 148
      } else if (ejActual === 'Elevación de Pierna') {
        ang = suavizar(calcularAngulo(hombroIzq, caderaIzq, rodillaIzq))
        posLabel = [caderaIzq[0] * w, caderaIzq[1] * h]
        enPosicionReposo = ang >= 165
      } else if (ejActual === 'Inclinación de Tronco') {
        const dx = hombroDer[0] - hombroIzq[0]
        const dy = hombroDer[1] - hombroIzq[1]
        ang = suavizar(Math.abs((Math.atan2(dy, dx) * 180.0) / Math.PI))
        if (ang > 90) ang = Math.abs(180 - ang)
        posLabel = [hombroIzq[0] * w, Math.max(40, hombroIzq[1] * h - 24)]
        enPosicionReposo = ang <= 7
      }

      // Verificar visibilidad de las articulaciones principales del ejercicio antes de marcar FIRME
      const visHombro = (lmList[11]?.visibility ?? 1) > 0.5 && (lmList[12]?.visibility ?? 1) > 0.5
      const visCadera = (lmList[23]?.visibility ?? 1) > 0.45
      const cuerpoEnCuadro = visHombro && visCadera

      if (!posturaFirmeRef.current && !metaAlcanzadaRef.current) {
        if (cuerpoEnCuadro && enPosicionReposo) {
          framesEnPosicionInicialRef.current += 1
          const progresoFirme = Math.min(100, Math.round((framesEnPosicionInicialRef.current / 18) * 100))
          hudMsg = `MANTENTE FIRME... (${progresoFirme}%)`
          hudCol = '#38BDF8'

          if (framesEnPosicionInicialRef.current >= 18) {
            posturaFirmeRef.current = true
            setPosturaFirme(true)
            estadoEtapaRef.current = 'REPOSO'
            setEtapaActual('REPOSO')
            asegurarGrabacionActiva()
            hudMsg = '¡POSTURA FIRME! GRABANDO — INICIA EL EJERCICIO'
            hudCol = '#34D399'
            hablar('Postura firme detectada. Grabando, puedes iniciar el ejercicio.', true)
          }
        } else {
          framesEnPosicionInicialRef.current = Math.max(0, framesEnPosicionInicialRef.current - 1)
          hudMsg = 'ACOMÓDATE EN POSICIÓN INICIAL FIRME PARA GRABAR'
          hudCol = '#FBBF24'
        }

        setAnguloActual(Math.round(ang))
        setMensajeHud(hudMsg)
        setColorHud(hudCol)
      }

      // Si YA está firme y todavía NO ha llegado a la meta de repeticiones de este ejercicio, evaluamos y contamos
      if (posturaFirmeRef.current && !metaAlcanzadaRef.current) {
        // ── 1 y 2. SENTADILLA / DESPLANTE DE PIERNA ──
        if (ejActual === 'Sentadilla' || ejActual === 'Desplante de Pierna') {

          const uOptimo = 95
          const uAdaptado = 125
          const uReposo = 158

          if (ang >= uReposo) {
            if (etapa === 'FONDO_OPTIMO') {
              estandarRef.current += 1
              setContadorEstandar(estandarRef.current)
              hablar(`Bien, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              hudMsg = `CORRECTA (${estandarRef.current + adaptadoRef.current}/${metaRepsRef.current})`
              hudCol = '#34D399'
              verificarMetaAlcanzada()
            } else if (etapa === 'FONDO_ADAPTADO') {
              adaptadoRef.current += 1
              setContadorAdaptado(adaptadoRef.current)
              hablar(`Adaptada, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              hudMsg = `ADAPTADA (${estandarRef.current + adaptadoRef.current}/${metaRepsRef.current})`
              hudCol = '#38BDF8'
              verificarMetaAlcanzada()
            } else if (etapa === 'EN_MOVIMIENTO') {
              incompletasRef.current += 1
              setContadorIncompletas(incompletasRef.current)
              hablar('Baja un poco más', true)
              hudMsg = 'FALTÓ PROFUNDIDAD'
              hudCol = '#F25555'
              verificarMetaAlcanzada()
            } else {
              hudMsg = 'DE PIE (FIRME)'
              hudCol = '#E7EDF7'
            }
            etapa = 'REPOSO'
          } else if (ang <= uOptimo) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO') {
              etapa = 'FONDO_OPTIMO'
              hablar('Sube', true)
              hudMsg = 'PROFUNDIDAD CORRECTA'
              hudCol = '#34D399'
            }
          } else if (ang <= uAdaptado) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO' && etapa !== 'FONDO_ADAPTADO') {
              etapa = 'FONDO_ADAPTADO'
              if (adaptadoActivo) hablar('Sube', true)
              hudMsg = 'RANGO ADAPTADO'
              hudCol = '#38BDF8'
            }
          } else {
            if (etapa === 'REPOSO') {
              etapa = 'EN_MOVIMIENTO'
              hablar('Baja')
            }
            hudMsg = 'BAJANDO...'
            hudCol = '#CBD5E1'
          }
        }

        // ── 3. LEVANTAR BRAZO AL COSTADO ──
        else if (ejActual === 'Levantar Brazo al Costado') {

          const uOptMin = 80
          const uOptMax = 105
          const uAdpMin = 60
          const uReposo = 30

          if (ang <= uReposo) {
            if (etapa === 'FONDO_OPTIMO') {
              estandarRef.current += 1
              setContadorEstandar(estandarRef.current)
              hablar(`Bien, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              verificarMetaAlcanzada()
            } else if (etapa === 'FONDO_ADAPTADO') {
              adaptadoRef.current += 1
              setContadorAdaptado(adaptadoRef.current)
              hablar(`Adaptada, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              verificarMetaAlcanzada()
            } else if (etapa === 'EN_MOVIMIENTO') {
              incompletasRef.current += 1
              setContadorIncompletas(incompletasRef.current)
              hablar('Sube más el brazo', true)
              verificarMetaAlcanzada()
            }
            etapa = 'REPOSO'
            hudMsg = 'BRAZO AL COSTADO'
            hudCol = '#E7EDF7'
          } else if (ang >= uOptMin && ang <= uOptMax) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO') {
              etapa = 'FONDO_OPTIMO'
              hablar('Baja el brazo', true)
              hudMsg = 'ALTURA PERFECTA'
              hudCol = '#34D399'
            }
          } else if (ang >= uAdpMin && ang < uOptMin) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO' && etapa !== 'FONDO_ADAPTADO') {
              etapa = 'FONDO_ADAPTADO'
              if (adaptadoActivo) hablar('Baja', true)
              hudMsg = 'ALTURA MEDIA (ADAPTADA)'
              hudCol = '#38BDF8'
            }
          } else {
            if (ang > uOptMax + 15) {
              hablar('No subas tanto')
              hudMsg = 'SUBISTE DEMASIADO (>120°)'
              hudCol = '#F25555'
            } else if (etapa === 'REPOSO') {
              etapa = 'EN_MOVIMIENTO'
              hablar('Sube')
              hudMsg = 'SUBIENDO BRAZO...'
              hudCol = '#CBD5E1'
            }
          }
        }

        // ── 4. DOBLAR Y ESTIRAR CODO ──
        else if (ejActual === 'Doblar y Estirar Codo') {

          const uOptimo = 45
          const uAdaptado = 75
          const uReposo = 148

          if (ang >= uReposo) {
            if (etapa === 'FONDO_OPTIMO') {
              estandarRef.current += 1
              setContadorEstandar(estandarRef.current)
              hablar(`Bien, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              verificarMetaAlcanzada()
            } else if (etapa === 'FONDO_ADAPTADO') {
              adaptadoRef.current += 1
              setContadorAdaptado(adaptadoRef.current)
              hablar(`Adaptada, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              verificarMetaAlcanzada()
            } else if (etapa === 'EN_MOVIMIENTO') {
              incompletasRef.current += 1
              setContadorIncompletas(incompletasRef.current)
              hablar('Dobla un poco más', true)
              verificarMetaAlcanzada()
            }
            etapa = 'REPOSO'
            hudMsg = 'BRAZO EXTENDIDO'
            hudCol = '#E7EDF7'
          } else if (ang <= uOptimo) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO') {
              etapa = 'FONDO_OPTIMO'
              hablar('Estira', true)
              hudMsg = 'FLEXIÓN COMPLETA'
              hudCol = '#34D399'
            }
          } else if (ang <= uAdaptado) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO' && etapa !== 'FONDO_ADAPTADO') {
              etapa = 'FONDO_ADAPTADO'
              if (adaptadoActivo) hablar('Estira', true)
              hudMsg = 'FLEXIÓN MEDIA (ADAPTADA)'
              hudCol = '#38BDF8'
            }
          } else {
            if (etapa === 'REPOSO') {
              etapa = 'EN_MOVIMIENTO'
              hablar('Dobla')
              hudMsg = 'FLEXIONANDO CODO...'
              hudCol = '#CBD5E1'
            }
          }
        }

        // ── 5. ELEVACIÓN DE PIERNA ──
        else if (ejActual === 'Elevación de Pierna') {

          const uOptimo = 118
          const uAdaptado = 135
          const uReposo = 165

          if (ang >= uReposo) {
            if (etapa === 'FONDO_OPTIMO') {
              estandarRef.current += 1
              setContadorEstandar(estandarRef.current)
              hablar(`Bien, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              verificarMetaAlcanzada()
            } else if (etapa === 'FONDO_ADAPTADO') {
              adaptadoRef.current += 1
              setContadorAdaptado(adaptadoRef.current)
              hablar(`Adaptada, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              verificarMetaAlcanzada()
            } else if (etapa === 'EN_MOVIMIENTO') {
              incompletasRef.current += 1
              setContadorIncompletas(incompletasRef.current)
              hablar('Levanta un poco más', true)
              verificarMetaAlcanzada()
            }
            etapa = 'REPOSO'
            hudMsg = 'PIERNA EN EL SUELO'
            hudCol = '#E7EDF7'
          } else if (ang <= uOptimo) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO') {
              etapa = 'FONDO_OPTIMO'
              hablar('Baja la pierna', true)
              hudMsg = 'ALTURA PERFECTA'
              hudCol = '#34D399'
            }
          } else if (ang <= uAdaptado) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO' && etapa !== 'FONDO_ADAPTADO') {
              etapa = 'FONDO_ADAPTADO'
              if (adaptadoActivo) hablar('Baja', true)
              hudMsg = 'ALTURA MEDIA (ADAPTADA)'
              hudCol = '#38BDF8'
            }
          } else {
            if (etapa === 'REPOSO') {
              etapa = 'EN_MOVIMIENTO'
              hablar('Sube la pierna')
              hudMsg = 'ELEVANDO PIERNA...'
              hudCol = '#CBD5E1'
            }
          }
        }

        // ── 6. INCLINACIÓN DE TRONCO ──
        else if (ejActual === 'Inclinación de Tronco') {

          const uOptMin = 22
          const uOptMax = 42
          const uAdpMin = 14
          const uReposo = 7

          if (ang <= uReposo) {
            if (etapa === 'FONDO_OPTIMO') {
              estandarRef.current += 1
              setContadorEstandar(estandarRef.current)
              hablar(`Bien, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              verificarMetaAlcanzada()
            } else if (etapa === 'FONDO_ADAPTADO') {
              adaptadoRef.current += 1
              setContadorAdaptado(adaptadoRef.current)
              hablar(`Adaptada, ${estandarRef.current + adaptadoRef.current} de ${metaRepsRef.current}`, true)
              verificarMetaAlcanzada()
            } else if (etapa === 'EN_MOVIMIENTO') {
              incompletasRef.current += 1
              setContadorIncompletas(incompletasRef.current)
              hablar('Inclínate un poco más', true)
              verificarMetaAlcanzada()
            }
            etapa = 'REPOSO'
            hudMsg = 'ESPALDA RECTA'
            hudCol = '#E7EDF7'
          } else if (ang >= uOptMin && ang <= uOptMax) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO') {
              etapa = 'FONDO_OPTIMO'
              hablar('Regresa al centro', true)
              hudMsg = 'INCLINACIÓN ÓPTIMA'
              hudCol = '#34D399'
            }
          } else if (ang >= uAdpMin && ang < uOptMin) {
            registrarMejorAngulo(ang, ejActual)
            if (etapa !== 'FONDO_OPTIMO' && etapa !== 'FONDO_ADAPTADO') {
              etapa = 'FONDO_ADAPTADO'
              if (adaptadoActivo) hablar('Regresa', true)
              hudMsg = 'INCLINACIÓN MEDIA (ADAPTADA)'
              hudCol = '#38BDF8'
            }
          } else {
            if (ang > uOptMax + 12) {
              hablar('No te inclines tanto')
              hudMsg = 'EXCESO DE INCLINACIÓN (>54°)'
              hudCol = '#F25555'
            } else if (etapa === 'REPOSO') {
              etapa = 'EN_MOVIMIENTO'
              hablar('Inclínate')
              hudMsg = 'INCLINANDO TRONCO...'
              hudCol = '#CBD5E1'
            }
          }
        }

        estadoEtapaRef.current = etapa
        setEtapaActual(etapa)
        setAnguloActual(Math.round(ang))
        setMensajeHud(hudMsg)
        setColorHud(hudCol)
      }

      // ── Dibujar Esqueleto Biomecánico sobre el Canvas (queda grabado en el video .webm y fotos .jpg) ──
      ctx.lineWidth = 3.5
      ctx.strokeStyle =
        etapa === 'FONDO_OPTIMO' ? '#34D399' : etapa === 'FONDO_ADAPTADO' ? '#38BDF8' : '#3B82F6'
      for (const [ini, fin] of CONEXIONES_POSE) {
        const p1 = getPt(ini)
        const p2 = getPt(fin)
        ctx.beginPath()
        ctx.moveTo(p1[0] * w, p1[1] * h)
        ctx.lineTo(p2[0] * w, p2[1] * h)
        ctx.stroke()
      }

      for (const idx of INDICES_ARTICULACIONES) {
        const pt = getPt(idx)
        ctx.beginPath()
        ctx.arc(pt[0] * w, pt[1] * h, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#38BDF8'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#060B14'
        ctx.stroke()
      }

      // Etiqueta flotante con el ángulo en la articulación activa
      const textoAngulo = `${Math.round(ang)}°`
      ctx.font = 'bold 20px Inter, sans-serif'
      const textWidth = ctx.measureText(textoAngulo).width
      const lx = Math.min(w - textWidth - 24, Math.max(14, posLabel[0] + 12))
      const ly = Math.min(h - 20, Math.max(36, posLabel[1]))

      ctx.fillStyle = 'rgba(6, 11, 20, 0.85)'
      ctx.beginPath()
      ctx.roundRect(lx - 8, ly - 22, textWidth + 16, 30, 8)
      ctx.fill()
      ctx.strokeStyle = hudCol
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(textoAngulo, lx, ly)
    } else {
      // Si el paciente aún no aparece completo en cuadro mientras se acomoda
      if (!posturaFirmeRef.current && !metaAlcanzadaRef.current) {
        framesEnPosicionInicialRef.current = 0
        setMensajeHud('COLÓCATE FRENTE A LA CÁMARA (CUERPO VISIBLE)')
        setColorHud('#FBBF24')
      }
    }

    animFrameRef.current = requestAnimationFrame(procesarFotograma)
  }, [suavizar, hablar, registrarMejorAngulo, verificarMetaAlcanzada, asegurarGrabacionActiva, mensajeHud, colorHud, usandoVideoArchivo])

  // ── Iniciar Cámara Web (`navigator.mediaDevices.getUserMedia`) ──
  async function iniciarCamara() {
    setErrorCamara(null)
    setUsandoVideoArchivo(false)
    posturaFirmeRef.current = false
    framesEnPosicionInicialRef.current = 0
    mejorFramePendienteRef.current = null
    setPosturaFirme(false)
    setGrabandoVideo(false)
    setMensajeHud('COLÓCATE FIRME EN POSICIÓN INICIAL...')
    setColorHud('#FBBF24')
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.src = ''
        await videoRef.current.play()
        setCamaraActiva(true)
        hablar(
          `Cámara encendida. ${infoEjercicio.mensajeVozInicio} Colócate firme frente a la cámara; la grabación iniciará cuando estés listo.`,
          true
        )
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = requestAnimationFrame(procesarFotograma)
      }
    } catch (err: any) {
      console.error('[Error getUserMedia]', err)
      setErrorCamara(
        'No se pudo acceder a la cámara web. Verifica los permisos del navegador o carga un video de prueba.'
      )
    }
  }

  // ── Detener cámara / video ──
  function detenerCamara() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
    }
    setGrabandoVideo(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
    setCamaraActiva(false)
    setUsandoVideoArchivo(false)
  }

  // ── Cargar video local de prueba ──
  function handleCargarVideoPrueba(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !videoRef.current) return

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    const url = URL.createObjectURL(file)
    setUsandoVideoArchivo(true)
    setErrorCamara(null)
    posturaFirmeRef.current = false
    framesEnPosicionInicialRef.current = 0
    mejorFramePendienteRef.current = null
    setPosturaFirme(false)
    videoRef.current.srcObject = null
    videoRef.current.src = url
    videoRef.current.loop = true
    videoRef.current.muted = true
    videoRef.current.play().then(() => {
      setCamaraActiva(true)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = requestAnimationFrame(procesarFotograma)
    })
  }

  // ── Cálculos de progreso en vivo ──
  const totalValidasActual = contadorEstandar + contadorAdaptado
  const totalIntentosActual = totalValidasActual + contadorIncompletas
  const precisionPorcentajeActual =
    totalIntentosActual > 0 ? Math.round((totalValidasActual / totalIntentosActual) * 100) : 0

  const haySiguienteEjercicio = indiceActual < listaEjercicios.length - 1
  const siguienteItem = haySiguienteEjercicio ? listaEjercicios[indiceActual + 1] : null

  const ejerciciosCompletadosCount = listaEjercicios.filter(
    item =>
      resultadosPorEjercicio[item.ejercicio]?.completado ||
      (item.ejercicio === ejercicioActivo && metaAlcanzadaActual)
  ).length

  // ── Guardar toda la rutina y subir el video (.webm) + capturas (.jpg) a Supabase ──
  async function finalizarYGuardarRutina() {
    // Asegurar que el ejercicio actual también esté en el diccionario de resultados
    const mapaFinal: Record<string, ResultadoEjercicioIA> = {
      ...resultadosPorEjercicio,
      [ejercicioActivo]: {
        ejercicio: ejercicioActivo,
        repeticiones_meta: metaRepeticiones,
        modo_adaptado: modoAdaptado,
        repeticiones_estandar: contadorEstandar,
        repeticiones_adaptadas: contadorAdaptado,
        repeticiones_incompletas: contadorIncompletas,
        angulo_mejor_rango: mejorAngulo ?? infoEjercicio.targetIdeal,
        precision_porcentaje: precisionPorcentajeActual,
        completado: totalValidasActual >= metaRepeticiones,
      },
    }

    const listaResultados = listaEjercicios
      .map(item => mapaFinal[item.ejercicio])
      .filter(Boolean)

    const sumaRepeticiones = listaResultados.reduce(
      (acc, r) => acc + r.repeticiones_estandar + r.repeticiones_adaptadas + r.repeticiones_incompletas,
      0
    )

    if (sumaRepeticiones === 0) {
      setMensajeGuardado({
        tipo: 'err',
        texto: 'Realiza las repeticiones asignadas frente a la cámara antes de guardar.',
      })
      return
    }

    setGuardando(true)
    setMensajeGuardado(null)

    try {
      // Detener grabación de video para empaquetar el archivo .webm
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        await new Promise<void>(resolve => {
          const rec = mediaRecorderRef.current!
          rec.onstop = () => resolve()
          try {
            rec.stop()
          } catch {
            resolve()
          }
        })
        setGrabandoVideo(false)
      }

      const fd = new FormData()
      fd.append('ejercicios', JSON.stringify(listaResultados))
      fd.append('nivel_dolor', String(nivelDolor))
      if (observaciones.trim()) {
        fd.append('observaciones', observaciones.trim())
      }

      // Adjuntar capturas automáticas de postura (.jpg) con el esqueleto dibujado
      fotosPosturaFilesRef.current.forEach(file => {
        fd.append('archivos', file)
      })

      // Adjuntar el video (.webm) grabado de la sesión si no supera 45 MB
      if (videoChunksRef.current.length > 0) {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' })
        if (videoBlob.size > 0 && videoBlob.size <= 45 * 1024 * 1024) {
          const videoFile = new File(
            [videoBlob],
            `grabacion_rutina_ia_${Date.now()}.webm`,
            { type: 'video/webm' }
          )
          fd.append('archivos', videoFile)
        }
      }

      const res = await fetch('/api/paciente/ejercicios-ia', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()
      if (!res.ok) {
        setMensajeGuardado({ tipo: 'err', texto: data.error || 'No se pudo guardar la rutina.' })
        setGuardando(false)
        return
      }

      hablar(
        '¡Rutina guardada con éxito! Tu fisioterapeuta ya recibió el aviso en tu expediente junto con tu grabación y posturas.',
        true
      )
      setMensajeGuardado({
        tipo: 'ok',
        texto:
          '¡Rutina guardada! Se registró en tu progreso y se envió el aviso con tus posturas y grabación al expediente de tu terapeuta.',
      })
      setGuardando(false)
      detenerCamara()
      if (onSerieGuardada && data.sesion) {
        onSerieGuardada(data.sesion)
      }
    } catch {
      setMensajeGuardado({ tipo: 'err', texto: 'Error de red al guardar la evaluación.' })
      setGuardando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* BARRA SUPERIOR: RUTINA ASIGNADA POR EL TERAPEUTA */}
      <div
        style={{
          background: 'rgba(10, 18, 32, 0.92)',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onVolverCatalogo && (
              <button
                type="button"
                onClick={() => {
                  detenerCamara()
                  onVolverCatalogo()
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#E7EDF7',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Mis Ejercicios Asignados
              </button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC' }}>
                  🎥 Evaluador de Rutina Asignada ({ejerciciosCompletadosCount}/{listaEjercicios.length} ejercicios)
                </span>
                {grabandoVideo ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 100,
                      background: 'rgba(242, 85, 85, 0.18)',
                      color: '#F87171',
                      border: '1px solid rgba(242,85,85,0.4)',
                    }}
                  >
                    ● REC Grabando Ejercicio (Postura Firme)
                  </span>
                ) : camaraActiva && !metaAlcanzadaActual ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 100,
                      background: 'rgba(245, 180, 0, 0.16)',
                      color: '#FBBF24',
                      border: '1px solid rgba(245, 180, 0, 0.4)',
                    }}
                  >
                    ⏸ En espera de postura firme inicial para grabar...
                  </span>
                ) : null}
              </div>
              <p style={{ fontSize: 12, color: '#8C9BB5', marginTop: 2 }}>
                La cámara IA cuenta tus repeticiones hasta cumplir la meta asignada en tu expediente y detiene el conteo para que confirmes.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setVozActiva(v => !v)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: vozActiva ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${vozActiva ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: vozActiva ? '#38BDF8' : '#8C9BB5',
              }}
            >
              {vozActiva ? '🔊 Voz Activa' : '🔇 Voz Silenciada'}
            </button>

            <button
              type="button"
              onClick={() => setMostrarPiP(p => !p)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                background: mostrarPiP ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${mostrarPiP ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: mostrarPiP ? '#38BDF8' : '#8C9BB5',
              }}
            >
              🖼️ Guía PiP
            </button>
          </div>
        </div>

        {/* PASO A PASO DE LOS EJERCICIOS ASIGNADOS POR EL TERAPEUTA */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 8,
          }}
        >
          {listaEjercicios.map((item, idx) => {
            const activo = idx === indiceActual
            const resGuardado = resultadosPorEjercicio[item.ejercicio]
            const completado =
              resGuardado?.completado || (activo && metaAlcanzadaActual)
            const hechas = activo
              ? totalValidasActual
              : resGuardado
              ? resGuardado.repeticiones_estandar + resGuardado.repeticiones_adaptadas
              : 0

            return (
              <button
                key={item.ejercicio}
                type="button"
                onClick={() => irAEjercicioPorIndice(idx)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 11,
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: completado
                    ? 'rgba(52, 211, 153, 0.14)'
                    : activo
                    ? 'linear-gradient(135deg, rgba(37,99,235,0.32), rgba(56,189,248,0.20))'
                    : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${
                    completado ? '#34D399' : activo ? '#38BDF8' : 'rgba(255,255,255,0.08)'
                  }`,
                  color: '#F8FAFC',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: completado ? '#34D399' : '#38BDF8' }}>
                    Paso {idx + 1}: {item.ejercicio}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>
                    {completado ? '✅' : `${hechas}/${item.repeticiones}`}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                  Meta asignada: <strong>{item.repeticiones} repeticiones</strong>
                  {item.modo_adaptado ? ' · Modo Lesión' : ''}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* BANNER DE CONFIRMACIÓN AL CUMPLIR LA META DEL EJERCICIO ACTUAL (RESPUESTA A3) */}
      {metaAlcanzadaActual && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.22), rgba(16, 185, 129, 0.12))',
            border: '2px solid #34D399',
            borderRadius: 16,
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            boxShadow: '0 8px 28px rgba(16, 185, 129, 0.22)',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#6EE7B7' }}>
              🎉 ¡Meta alcanzada en {ejercicioActivo}! ({totalValidasActual} de {metaRepeticiones} repeticiones)
            </div>
            <p style={{ fontSize: 13, color: '#E2E8F0', marginTop: 3 }}>
              {haySiguienteEjercicio && siguienteItem
                ? `La cámara detuvo el conteo de este ejercicio. Confirma cuando estés listo para pasar a "${siguienteItem.ejercicio}" (${siguienteItem.repeticiones} repeticiones).`
                : '¡Has completado todos los ejercicios asignados por tu fisioterapeuta! Ahora guarda tu progreso para enviarle el aviso y tu grabación.'}
            </p>
          </div>

          {haySiguienteEjercicio && siguienteItem ? (
            <button
              type="button"
              onClick={() => irAEjercicioPorIndice(indiceActual + 1)}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #2563EB, #38BDF8)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
              }}
            >
              ✅ Confirmar y Pasar a: {siguienteItem.ejercicio} (×{siguienteItem.repeticiones}) →
            </button>
          ) : (
            <button
              type="button"
              disabled={guardando}
              onClick={finalizarYGuardarRutina}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #059669, #10B981)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: 800,
                cursor: guardando ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              }}
            >
              {guardando
                ? '⏳ Subiendo Grabación y Posturas...'
                : '🏆 Confirmar y Enviar Rutina Completada al Terapeuta'}
            </button>
          )}
        </div>
      )}

      {/* PANEL DE 4 TARJETAS DE TELEMETRÍA EN VIVO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.10)',
            border: '1.5px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 14,
            padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase' }}>
            🎯 Progreso Meta Asignada
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#F8FAFC', marginTop: 4 }}>
            {totalValidasActual} <span style={{ fontSize: 20, color: '#38BDF8' }}>/ {metaRepeticiones}</span>
          </div>
          <div style={{ fontSize: 11, color: '#8C9BB5' }}>Repeticiones requeridas en {ejercicioActivo}</div>
        </div>

        <div
          style={{
            background: 'rgba(52, 211, 153, 0.08)',
            border: '1.5px solid rgba(52, 211, 153, 0.35)',
            borderRadius: 14,
            padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase' }}>
            ✅ Estándar / 🦿 Adaptadas
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#34D399', marginTop: 4 }}>
            {contadorEstandar} <span style={{ fontSize: 18, color: '#38BDF8' }}>+ {contadorAdaptado}</span>
          </div>
          <div style={{ fontSize: 11, color: '#8C9BB5' }}>
            Meta ángulo: {modoAdaptado ? infoEjercicio.metaAdaptada : infoEjercicio.metaEstandar}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(242, 85, 85, 0.08)',
            border: '1.5px solid rgba(242, 85, 85, 0.35)',
            borderRadius: 14,
            padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#F87171', textTransform: 'uppercase' }}>
            ⚠️ Incompletas
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#F87171', marginTop: 4 }}>
            {contadorIncompletas}
          </div>
          <div style={{ fontSize: 11, color: '#8C9BB5' }}>No cuentan para la meta</div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 14,
            padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase' }}>
            📐 Ángulo Actual / Mejor
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#F8FAFC', marginTop: 4 }}>
            {anguloActual}°{' '}
            <span style={{ fontSize: 15, color: '#38BDF8', fontWeight: 600 }}>
              / {mejorAngulo !== null ? `${mejorAngulo}°` : '—'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#8C9BB5' }}>
            Precisión: <strong style={{ color: '#34D399' }}>{precisionPorcentajeActual}%</strong>
          </div>
        </div>
      </div>

      {/* ÁREA CENTRAL: VISOR DE CÁMARA + CANVAS DE ESQUELETO + PANEL DE GUARDADO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 330px',
          gap: 16,
          alignItems: 'start',
        }}
        className="evaluador-grid-layout"
      >
        <style>{`
          @media (max-width: 1024px) {
            .evaluador-grid-layout {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        <div
          style={{
            position: 'relative',
            background: '#050911',
            border: '1.5px solid rgba(56, 189, 248, 0.28)',
            borderRadius: 18,
            overflow: 'hidden',
            minHeight: 460,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video ref={videoRef} playsInline muted style={{ display: 'none' }} />

          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: 600,
              display: camaraActiva ? 'block' : 'none',
              objectFit: 'contain',
            }}
          />

          {camaraActiva && (
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                background: 'rgba(6, 11, 20, 0.86)',
                backdropFilter: 'blur(8px)',
                border: `1.5px solid ${colorHud}`,
                borderRadius: 12,
                padding: '10px 16px',
                zIndex: 10,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38BDF8', letterSpacing: '0.04em' }}>
                {ejercicioActivo.toUpperCase()} · META: {totalValidasActual}/{metaRepeticiones} REPS
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: colorHud, marginTop: 2 }}>
                GUÍA: {mensajeHud}
              </div>
            </div>
          )}

          {mostrarPiP && (
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 175,
                background: 'rgba(10, 18, 32, 0.92)',
                border: '2px solid #38BDF8',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 10px 28px rgba(0,0,0,0.65)',
                zIndex: 12,
              }}
            >
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.16)',
                  padding: '5px 10px',
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: '#38BDF8',
                  textAlign: 'center',
                  letterSpacing: '0.05em',
                }}
              >
                GUÍA POSTURAL (PiP)
              </div>

              {!imgError ? (
                <img
                  src={infoEjercicio.imagenRef}
                  alt={infoEjercicio.nombre}
                  onError={() => setImgError(true)}
                  style={{
                    width: '100%',
                    height: 145,
                    objectFit: 'cover',
                    display: 'block',
                    background: '#111827',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 145,
                    background: '#1E293B',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 10,
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: 32 }}>🏋️</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC', marginTop: 4 }}>
                    {infoEjercicio.nombre}
                  </span>
                </div>
              )}

              <div
                style={{
                  padding: '6px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#34D399',
                  textAlign: 'center',
                  borderTop: '1px solid rgba(56,189,248,0.2)',
                }}
              >
                Meta: {modoAdaptado ? infoEjercicio.metaAdaptada : infoEjercicio.metaEstandar}
              </div>
            </div>
          )}

          {!camaraActiva && (
            <div
              style={{
                padding: '48px 28px',
                textAlign: 'center',
                maxWidth: 460,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.14)',
                  border: '1.5px solid rgba(56, 189, 248, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 30,
                }}
              >
                📷
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC' }}>
                Ejercicio asignado: {ejercicioActivo} (×{metaRepeticiones} repeticiones)
              </div>
              <p style={{ fontSize: 13, color: '#8C9BB5', lineHeight: 1.55 }}>
                {infoEjercicio.descripcion} La cámara grabará tu postura y contará automáticamente hasta llegar a las{' '}
                <strong>{metaRepeticiones} repeticiones</strong> que indicó tu fisioterapeuta.
              </p>

              {errorCamara && (
                <div
                  style={{
                    background: 'rgba(242, 85, 85, 0.12)',
                    border: '1px solid rgba(242, 85, 85, 0.4)',
                    color: '#FCA5A5',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 12.5,
                  }}
                >
                  {errorCamara}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
                <button
                  type="button"
                  disabled={cargandoModelo}
                  onClick={iniciarCamara}
                  style={{
                    padding: '12px 22px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #2563EB, #38BDF8)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: cargandoModelo ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  {cargandoModelo ? '⏳ Cargando Modelo IA...' : '▶ Encender Cámara IA'}
                </button>

                <button
                  type="button"
                  disabled={cargandoModelo}
                  onClick={() => fileVideoInputRef.current?.click()}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#E2E8F0',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: cargandoModelo ? 'not-allowed' : 'pointer',
                  }}
                >
                  🎬 Probar con Video Local
                </button>
                <input
                  ref={fileVideoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleCargarVideoPrueba}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}

          {camaraActiva && (
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                right: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={detenerCamara}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    background: 'rgba(242, 85, 85, 0.85)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⏹ Detener Cámara
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PANEL LATERAL DERECHO: RESUMEN DE RUTINA, CAPTURAS DE POSTURA Y GUARDADO */}
        <div
          style={{
            background: 'rgba(10, 18, 32, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 18,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#F8FAFC' }}>
              📋 Avance de tu Rutina Asignada
            </div>
            <p style={{ fontSize: 12, color: '#8C9BB5', marginTop: 2 }}>
              Al finalizar se enviará el video (.webm) y las capturas de postura con el esqueleto a tu terapeuta.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {listaEjercicios.map((item, i) => {
              const esAct = i === indiceActual
              const r = resultadosPorEjercicio[item.ejercicio]
              const hechas = esAct
                ? totalValidasActual
                : r
                ? r.repeticiones_estandar + r.repeticiones_adaptadas
                : 0
              const ok = r?.completado || (esAct && metaAlcanzadaActual)
              return (
                <div
                  key={item.ejercicio}
                  style={{
                    background: ok ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${ok ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 10,
                    padding: '8px 11px',
                    fontSize: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    {ok ? '✅ ' : '⏳ '}
                    <strong>{item.ejercicio}</strong>
                  </span>
                  <span style={{ color: ok ? '#34D399' : '#38BDF8', fontWeight: 700 }}>
                    {hechas}/{item.repeticiones} reps
                  </span>
                </div>
              )
            })}
          </div>

          {capturasPreview.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38BDF8', marginBottom: 6 }}>
                📸 Posturas capturadas automáticamente ({capturasPreview.length})
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {capturasPreview.map(cap => (
                  <div
                    key={cap.nombre}
                    style={{
                      width: 82,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid rgba(56,189,248,0.35)',
                      background: '#060B14',
                    }}
                  >
                    <img
                      src={cap.url}
                      alt={cap.nombre}
                      style={{ width: '100%', height: 56, objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ fontSize: 9.5, color: '#CBD5E1', padding: '2px 4px', textAlign: 'center' }}>
                      {cap.nombre}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#CBD5E1',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}
            >
              <span>🩹 Nivel de dolor / esfuerzo percibido:</span>
              <strong style={{ color: nivelDolor <= 3 ? '#34D399' : nivelDolor <= 6 ? '#FBBF24' : '#F87171' }}>
                {nivelDolor}/10
              </strong>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={nivelDolor}
              onChange={e => setNivelDolor(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38BDF8', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#CBD5E1', display: 'block', marginBottom: 6 }}>
              📝 Comentario para tu terapeuta (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Completé las repeticiones sin molestia..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(6, 11, 20, 0.8)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 10,
                padding: '8px 10px',
                color: '#E7EDF7',
                fontSize: 12.5,
                fontFamily: 'Inter, sans-serif',
                resize: 'vertical',
              }}
            />
          </div>

          {mensajeGuardado && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                background:
                  mensajeGuardado.tipo === 'ok' ? 'rgba(52, 211, 153, 0.14)' : 'rgba(242, 85, 85, 0.14)',
                border: `1px solid ${
                  mensajeGuardado.tipo === 'ok' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(242, 85, 85, 0.4)'
                }`,
                color: mensajeGuardado.tipo === 'ok' ? '#6EE7B7' : '#FCA5A5',
              }}
            >
              {mensajeGuardado.texto}
            </div>
          )}

          <button
            type="button"
            disabled={guardando}
            onClick={finalizarYGuardarRutina}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #059669, #10B981)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: guardando ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
            }}
          >
            {guardando
              ? '⏳ Subiendo Video y Posturas...'
              : '✅ Finalizar y Enviar Rutina al Terapeuta'}
          </button>
        </div>
      </div>
    </div>
  )
}
