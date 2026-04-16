import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

type Screen = 'loading' | 'login' | 'home' | 'camera' | 'preview' | 'uploading' | 'done'
type CaptureType = 'receita' | 'armacao_marcacao'

export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Camera
  const [captureType, setCaptureType] = useState<CaptureType>('receita')
  const [photoData, setPhotoData] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Init — check session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setScreen('home')
      } else {
        setScreen('login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
        setScreen('login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ============================================================
  // Login
  // ============================================================
  async function handleLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setLoginLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    setLoginLoading(false)

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email ou senha inválidos'
          : `Erro: ${authError.message}`
      )
    } else {
      setScreen('home')
    }
  }

  async function handleLogout(): Promise<void> {
    await supabase.auth.signOut({ scope: 'local' })
    setUser(null)
    setScreen('login')
  }

  // ============================================================
  // Camera
  // ============================================================
  function startCapture(tipo: CaptureType): void {
    setCaptureType(tipo)
    setPhotoData(null)
    setError(null)
    setScreen('camera')
  }

  useEffect(() => {
    if (screen !== 'camera') return

    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err) {
        console.error(err)
        setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
        setScreen('home')
      }
    })()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [screen])

  function takePhoto(): void {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPhotoData(dataUrl)
    streamRef.current?.getTracks().forEach(t => t.stop())
    setScreen('preview')
  }

  function retake(): void {
    setPhotoData(null)
    setScreen('camera')
  }

  async function uploadPhoto(): Promise<void> {
    if (!photoData || !user) return
    setScreen('uploading')

    try {
      // Converte dataURL em blob
      const res = await fetch(photoData)
      const blob = await res.blob()

      // Gera um nome único
      const ts = Date.now()
      const fileName = `${captureType}/${user.id}/${ts}.jpg`

      const { error: upErr } = await supabase.storage
        .from('capturas')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })

      if (upErr) throw upErr

      setScreen('done')
    } catch (err) {
      console.error(err)
      setError('Falha no envio: ' + (err as Error).message)
      setScreen('preview')
    }
  }

  const captureLabels: Record<CaptureType, { title: string; hint: string }> = {
    receita: {
      title: 'Receita oftalmológica',
      hint: 'Fotografe a receita em boa iluminação, de forma legível.'
    },
    armacao_marcacao: {
      title: 'Marcação da armação',
      hint: 'Fotografe a parte interna da haste (números gravados, ex: 52□18 140).'
    }
  }

  // ============================================================
  // Render
  // ============================================================

  // Loading
  if (screen === 'loading') {
    return (
      <div className="login-screen">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  // Login
  if (screen === 'login') {
    return (
      <div className="login-screen">
        <div className="login-logo">👁</div>
        <div className="login-brand">Óptica</div>
        <div className="login-sub">Versão mobile — câmera e capturas</div>

        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <div className="login-error">{error}</div>}

          <button className="btn" type="submit" disabled={loginLoading}>
            {loginLoading ? <><span className="spinner" /> Entrando...</> : 'Acessar Óptica'}
          </button>
        </form>

        <p className="footer-text">v1.0 · Versão mobile</p>
      </div>
    )
  }

  // Home
  if (screen === 'home') {
    return (
      <div className="screen">
        <header className="header">
          <div className="header-left">
            <span style={{ fontSize: 24 }}>👁</span>
            <h1>Óptica</h1>
          </div>
          <button className="btn-ghost" onClick={handleLogout}>Sair</button>
        </header>

        <main className="main">
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>
              Olá, {user?.email?.split('@')[0]}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Selecione o tipo de captura.
            </p>
          </div>

          <div className="card" onClick={() => startCapture('receita')} style={{ cursor: 'pointer' }}>
            <div className="card-header">
              <div className="card-icon blue">📋</div>
              <div>
                <h2>Receita oftalmológica</h2>
                <p>Tire foto da receita do cliente para preencher os dados automaticamente.</p>
              </div>
            </div>
            <button className="btn">📷 Fotografar receita</button>
          </div>

          <div className="card" onClick={() => startCapture('armacao_marcacao')} style={{ cursor: 'pointer' }}>
            <div className="card-header">
              <div className="card-icon green">🔍</div>
              <div>
                <h2>Marcação da armação</h2>
                <p>Fotografe os números gravados na haste interna da armação.</p>
              </div>
            </div>
            <button className="btn btn-outline">📷 Fotografar marcação</button>
          </div>

          {error && <div className="status error"><p>{error}</p></div>}
        </main>

        <p className="footer-text">
          Conectado ao mesmo banco de dados do desktop.
        </p>
      </div>
    )
  }

  // Camera
  if (screen === 'camera') {
    const label = captureLabels[captureType]
    return (
      <div className="camera-screen">
        <div className="camera-top">
          <button className="btn-ghost" onClick={() => setScreen('home')}>✕ Cancelar</button>
          <p>{label.title}</p>
        </div>

        <div className="camera-video">
          <video ref={videoRef} playsInline muted />
        </div>

        <div className="camera-bottom">
          <button className="shutter" onClick={takePhoto}>
            <div className="shutter-inner" />
          </button>
        </div>
      </div>
    )
  }

  // Preview
  if (screen === 'preview' && photoData) {
    return (
      <div className="camera-screen">
        <div className="camera-top">
          <button className="btn-ghost" onClick={retake}>✕ Cancelar</button>
          <p>Pré-visualização</p>
        </div>

        <div className="camera-video">
          <img src={photoData} alt="Preview" />
        </div>

        <div className="camera-bottom">
          <button className="btn btn-outline btn-small" onClick={retake}>↺ Refazer</button>
          <button className="btn btn-small" onClick={uploadPhoto}>✓ Enviar</button>
        </div>
      </div>
    )
  }

  // Uploading
  if (screen === 'uploading') {
    return (
      <div className="login-screen">
        <div className="status">
          <p><span className="spinner" /> Enviando foto...</p>
        </div>
      </div>
    )
  }

  // Done
  if (screen === 'done') {
    return (
      <div className="login-screen">
        <div className="status success">
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>✓ Foto enviada!</p>
          <p>A imagem já está disponível no sistema.</p>
        </div>
        <button
          className="btn"
          style={{ maxWidth: 300, marginTop: 20 }}
          onClick={() => setScreen('home')}
        >
          Tirar outra foto
        </button>
        <button
          className="btn btn-outline"
          style={{ maxWidth: 300, marginTop: 10 }}
          onClick={() => setScreen('home')}
        >
          Voltar ao início
        </button>
      </div>
    )
  }

  return <div />
}
