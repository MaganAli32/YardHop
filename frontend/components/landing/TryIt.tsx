import { useState, useRef, useEffect, useCallback, type CSSProperties, type MouseEvent, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBrowserFingerprint } from '../../lib/fingerprint'
import { landingImages } from '../../lib/landingImages'
import { usePersistence } from '../../store/PersistenceContext'
import { colors as c, fonts as f } from '../../lib/tokens'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ACCEPT_IMAGES = 'image/jpeg,image/png,image/heic,image/webp'

type UsageState = {
  used: number
  limit: number
  remaining: number
  is_limited: boolean
}

type SampleKey = 'chair' | 'camera' | 'sneakers' | 'record'

const SAMPLES: Record<
  SampleKey,
  {
    name: string
    sub: string
    match: number
    low: number
    high: number
    median: number
    conf: number
    label: string
    n: number
    time: number
  }
> = {
  chair: {
    name: 'Walnut <em>lounge chair</em>',
    sub: 'Herman Miller · c. 1963 · 94% match',
    match: 94,
    low: 2850,
    high: 3420,
    median: 3120,
    conf: 87,
    label: 'High',
    n: 142,
    time: 2.4,
  },
  camera: {
    name: 'Leica <em>M6</em> rangefinder',
    sub: 'Black paint · 1988 · 96% match',
    match: 96,
    low: 3600,
    high: 4250,
    median: 3940,
    conf: 91,
    label: 'High',
    n: 88,
    time: 1.9,
  },
  sneakers: {
    name: 'Air Jordan 1 <em>Chicago</em>',
    sub: '2015 retro · size 10.5 · 98% match',
    match: 98,
    low: 620,
    high: 840,
    median: 730,
    conf: 82,
    label: 'High',
    n: 214,
    time: 1.4,
  },
  record: {
    name: '<em>Kind of Blue</em> LP',
    sub: 'Columbia 1959 · 1st press · 89% match',
    match: 89,
    low: 1200,
    high: 1450,
    median: 1320,
    conf: 76,
    label: 'Medium',
    n: 38,
    time: 2.1,
  },
}

const DEMO_SEQUENCE_MS = [200, 600, 1400, 200]

const css = `
  .ti-root * { box-sizing: border-box; }
  .ti-root {
    background: ${c.parchment};
    padding: 140px 0;
    font-family: ${f.sans};
  }
  .ti-container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .ti-head {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: end;
    margin-bottom: 56px;
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }
  .ti-head.vis { opacity: 1; transform: none; }
  .ti-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 400;
    color: ${c.bark};
    margin: 0 0 0 0;
  }
  .ti-headline {
    font-family: ${f.serif};
    font-weight: 300;
    line-height: 1.08;
    letter-spacing: -0.01em;
    color: ${c.ink};
    margin: 20px 0 0;
    font-size: clamp(38px, 4.4vw, 60px);
    text-wrap: balance;
  }
  .ti-headline em { font-style: italic; color: ${c.terracotta}; font-weight: 400; }
  .ti-lede {
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 17px;
    line-height: 1.55;
    color: ${c.sage};
    max-width: 52ch;
    margin: 0;
    text-wrap: pretty;
  }
  .ti-app {
    background: ${c.chalk};
    border: 0.5px solid ${c.mist};
    display: grid;
    grid-template-columns: 1fr 1.3fr;
    min-height: 520px;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.75s ease 0.1s, transform 0.75s ease 0.1s;
  }
  .ti-app.vis { opacity: 1; transform: none; }
  .ti-left {
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    border-right: 0.5px solid ${c.mist};
  }
  .ti-dropzone {
    border: 0.75px dashed ${c.bark};
    aspect-ratio: 1/1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
    padding: 20px;
    background: ${c.parchment};
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
  }
  .ti-dropzone:hover { border-color: ${c.terracotta}; color: ${c.terracotta}; background: #F4EEE3; }
  .ti-dropzone:focus-visible { outline: 2px solid ${c.terracotta}; outline-offset: 2px; }
  .ti-dropzone .g {
    font-family: ${f.serif};
    font-size: 56px;
    color: ${c.terracotta};
    font-weight: 300;
    line-height: 1;
  }
  .ti-upload-hint {
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${c.sage};
    margin-top: 4px;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
  }
  .ti-upload-hint:hover { color: ${c.terracotta}; }
  .ti-samples { display: flex; flex-direction: column; gap: 8px; }
  .ti-samples .ti-sample-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin: 0 0 6px;
  }
  .ti-sample {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border: 0.5px solid ${c.mist};
    cursor: pointer;
    transition: all 0.2s;
    background: ${c.chalk};
    text-align: left;
  }
  .ti-sample:hover { border-color: ${c.terracotta}; background: #FFF8F1; }
  .ti-sample.active { border-color: ${c.terracotta}; background: #FFF8F1; }
  .ti-sample .sm-thumb {
    width: 44px;
    height: 44px;
    background: ${c.parchment};
    flex: 0 0 44px;
    border: 0.5px solid ${c.mist};
    overflow: hidden;
  }
  .ti-sample .sm-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .ti-sample .sm-name { font-family: ${f.serif}; font-size: 15px; color: ${c.ink}; }
  .ti-sample .sm-type {
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${c.bark};
    margin-top: 2px;
  }
  .ti-right {
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    background: linear-gradient(180deg, ${c.chalk}, #FBF6EA);
    position: relative;
    overflow: hidden;
    min-height: 320px;
  }
  .ti-empty {
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 18px;
  }
  .ti-empty .e-dash {
    font-family: ${f.serif};
    font-size: 48px;
    color: ${c.mist};
    font-weight: 300;
  }
  .ti-empty .e-title {
    font-family: ${f.serif};
    font-size: 26px;
    color: ${c.sage};
    font-weight: 300;
    font-style: italic;
  }
  .ti-empty .e-sub {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.2em;
    color: ${c.bark};
    text-transform: uppercase;
  }
  .ti-loading {
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24px;
    padding: 20px 0;
  }
  .ti-loading .step-row {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    align-items: center;
    gap: 14px;
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.14em;
    color: ${c.sage};
    text-transform: uppercase;
  }
  .ti-loading .step-row .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${c.mist};
    border: 0.5px solid ${c.mist};
  }
  .ti-loading .step-row.done .dot { background: ${c.terracotta}; border-color: ${c.terracotta}; }
  .ti-loading .step-row.active .dot {
    background: ${c.chalk};
    border: 1px solid ${c.terracotta};
    animation: ti-pulse 1.2s infinite;
  }
  .ti-loading .step-row.done .label,
  .ti-loading .step-row.active .label { color: ${c.ink}; }
  .ti-loading .step-row .t { font-size: 10px; color: ${c.bark}; }
  @keyframes ti-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }
  .ti-result { display: flex; flex-direction: column; gap: 18px; }
  .ti-result .ident { display: flex; justify-content: space-between; align-items: baseline; }
  .ti-result .ident-t { font-family: ${f.serif}; font-size: 24px; font-weight: 400; color: ${c.ink}; }
  .ti-result .ident-t em { color: ${c.terracotta}; font-style: italic; }
  .ti-result .ident-sub {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin-top: 4px;
  }
  .ti-result .match-pct { font-family: ${f.serif}; font-size: 16px; color: ${c.forest}; }
  .ti-conf-label {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin-bottom: 8px;
  }
  .ti-big-price {
    font-family: ${f.serif};
    font-size: 56px;
    font-weight: 300;
    line-height: 1;
    letter-spacing: -0.02em;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .ti-big-price .low { color: ${c.ink}; }
  .ti-big-price .sep { color: ${c.mist}; font-size: 32px; }
  .ti-big-price .high { color: ${c.terracotta}; font-style: italic; }
  .ti-conf-card { padding-top: 0; }
  .ti-conf-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }
  .ti-conf-val {
    font-family: ${f.serif};
    font-size: 22px;
    font-weight: 400;
    color: ${c.forest};
  }
  .ti-conf-val em { color: ${c.terracotta}; font-style: italic; }
  .ti-conf-bar {
    position: relative;
    height: 4px;
    background: ${c.mist};
    overflow: hidden;
  }
  .ti-conf-bar-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: ${c.terracotta};
    width: var(--conf, 0%);
    transition: width 1s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .ti-conf-ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-family: ${f.mono};
    font-size: 9px;
    color: ${c.bark};
    letter-spacing: 0.14em;
  }
  .ti-result-meta {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    font-family: ${f.mono};
    font-size: 10px;
    color: ${c.bark};
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding-top: 8px;
    border-top: 0.5px solid ${c.mist};
  }
  .ti-limited {
    grid-column: 1 / -1;
    padding: 48px;
    text-align: center;
    border: 0.5px solid ${c.mist};
    background: ${c.chalk};
  }
  .ti-limited h3 {
    font-family: ${f.serif};
    font-size: 28px;
    font-weight: 300;
    color: ${c.ink};
    margin: 0 0 12px;
  }
  .ti-limited p { color: ${c.sage}; margin: 0 0 20px; }
  .ti-limited button {
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 14px 24px;
    background: ${c.forest};
    color: ${c.chalk};
    border: 0;
    cursor: pointer;
  }
  .ti-limited button:hover { background: ${c.terracotta}; }
  @media (max-width: 1000px) {
    .ti-container { padding: 0 24px; }
    .ti-head { grid-template-columns: 1fr; gap: 28px; }
    .ti-app { grid-template-columns: 1fr; }
    .ti-left { border-right: none; border-bottom: 0.5px solid ${c.mist}; }
  }
`

function animateNumber(el: HTMLElement, from: number, to: number, dur: number, fmt: (v: number) => string) {
  const start = performance.now()
  function tick(now: number) {
    const t = Math.min(1, (now - start) / dur)
    const ease = 1 - (1 - t) ** 3
    el.textContent = fmt(from + (to - from) * ease)
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function TryIt() {
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const resLowRef = useRef<HTMLSpanElement>(null)
  const resHighRef = useRef<HTMLSpanElement>(null)
  const barFillRef = useRef<HTMLDivElement>(null)

  const [vis, setVis] = useState(false)
  const navigate = useNavigate()
  const { authToken } = usePersistence()

  const [usage, setUsage] = useState<UsageState>({
    used: 0,
    limit: 3,
    remaining: 3,
    is_limited: false,
  })

  type Panel = 'empty' | 'loading' | 'result' | 'uploading'
  const [panel, setPanel] = useState<Panel>('empty')
  const [activeSample, setActiveSample] = useState<SampleKey | null>(null)
  const [loadPhase, setLoadPhase] = useState(0)
  const [demoData, setDemoData] = useState<(typeof SAMPLES)[SampleKey] | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVis(true)
      },
      { threshold: 0.1 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const headers: Record<string, string> = { 'X-Fingerprint': getBrowserFingerprint() }
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    fetch('/api/usage', { headers })
      .then((r) => r.json())
      .then((data) =>
        setUsage({
          used: data.used ?? 0,
          limit: data.limit ?? 3,
          remaining: data.remaining ?? 3,
          is_limited: data.is_limited ?? false,
        })
      )
      .catch(() => {})
  }, [authToken])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id))
      timersRef.current = []
    }
  }, [])

  const clearDemoTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current = []
  }

  const runDemo = useCallback((key: SampleKey) => {
    clearDemoTimers()
    setUploadError(null)
    setActiveSample(key)
    setPanel('loading')
    setLoadPhase(0)
    const data = SAMPLES[key]
    let t = 0
    for (let i = 0; i < DEMO_SEQUENCE_MS.length; i++) {
      t += DEMO_SEQUENCE_MS[i]
      timersRef.current.push(
        window.setTimeout(() => setLoadPhase(i + 1), t)
      )
    }
    timersRef.current.push(
      window.setTimeout(() => {
        setDemoData(data)
        setPanel('result')
        requestAnimationFrame(() => {
          if (resLowRef.current && resHighRef.current) {
            resLowRef.current.textContent = '$0'
            resHighRef.current.textContent = '$0'
            barFillRef.current?.style.setProperty('--conf', '0%')
            animateNumber(resLowRef.current, 0, data.low, 900, (v) => `$${Math.round(v).toLocaleString()}`)
            animateNumber(resHighRef.current, 0, data.high, 900, (v) => `$${Math.round(v).toLocaleString()}`)
          }
          setTimeout(() => {
            barFillRef.current?.style.setProperty('--conf', `${data.conf}%`)
          }, 80)
        })
      }, t + 120)
    )
  }, [])

  const handleRealFile = async (file: File) => {
    setUploadError(null)
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Please use an image under 20 MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image (JPG, PNG, HEIC).')
      return
    }
    setPanel('uploading')
    const formData = new FormData()
    formData.append('image', file)
    const headers: Record<string, string> = { 'X-Fingerprint': getBrowserFingerprint() }
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    try {
      const response = await fetch('/api/appraise', { method: 'POST', body: formData, headers })
      const data = await response.json().catch(() => ({}))
      if (response.status === 403 && data?.error === 'free_limit_reached') {
        setUsage((p) => ({ ...p, is_limited: true, remaining: 0 }))
        setUploadError("You've used all free appraisals.")
        setPanel('empty')
        return
      }
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Appraisal failed (${response.status})`)
      }
      sessionStorage.setItem('appraisalResult', JSON.stringify(data))
      setUsage((p) => ({
        ...p,
        used: p.used + 1,
        remaining: Math.max(0, p.remaining - 1),
        is_limited: p.used + 1 >= p.limit,
      }))
      navigate('/appraise/results')
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Something went wrong.')
      setPanel('empty')
    }
  }

  const onDropzoneClick = () => {
    if (usage.is_limited) return
    runDemo('chair')
  }

  const openRealUpload = (e: MouseEvent) => {
    e.stopPropagation()
    if (usage.is_limited) return
    fileRef.current?.click()
  }

  const onFileDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (usage.is_limited) return
    const f = e.dataTransfer.files?.[0]
    if (f?.type.startsWith('image/')) handleRealFile(f)
    else setUploadError('Drop an image file (JPG, PNG, HEIC).')
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_IMAGES}
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleRealFile(f)
          e.target.value = ''
        }}
      />

      <section className="ti-root" id="try" ref={ref}>
        <div className="ti-container">
          <div className={`ti-head ${vis ? 'vis' : ''}`}>
            <div>
              <p className="ti-eyebrow">Demonstration</p>
              <h2 className="ti-headline">
                Try it on something
                <br />
                you&apos;ve been <em>wondering about</em>.
              </h2>
            </div>
            <p className="ti-lede">
              Upload a photograph or choose one of the samples. The pipeline runs live — identification, parallel marketplace search, and a confidence-scored range.
            </p>
          </div>

          <div className={`ti-app ${vis ? 'vis' : ''}`}>
            {usage.is_limited ? (
              <div className="ti-limited">
                <h3>Free appraisals used</h3>
                <p>Upgrade or view plans to keep going.</p>
                <button type="button" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                  View pricing
                </button>
              </div>
            ) : (
              <>
                <div className="ti-left">
                  <div
                    role="button"
                    tabIndex={0}
                    className="ti-dropzone"
                    onClick={onDropzoneClick}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={onFileDrop}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onDropzoneClick()
                      }
                    }}
                  >
                    <div className="g">＋</div>
                    <div>Drop a photo or click to upload</div>
                    <div style={{ fontSize: 9, letterSpacing: '0.3em', color: c.mist }}>JPG · PNG · HEIC · 20MB</div>
                    <button type="button" className="ti-upload-hint" onClick={openRealUpload}>
                      Use a real photo (API) →
                    </button>
                  </div>
                  <div className="ti-samples">
                    <p className="ti-sample-eyebrow">Or try a sample</p>
                    {(Object.keys(SAMPLES) as SampleKey[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`ti-sample ${activeSample === k ? 'active' : ''}`}
                        onClick={() => runDemo(k)}
                      >
                        <div className="sm-thumb">
                          <img
                            src={landingImages.tryItSamples[k].src}
                            alt={landingImages.tryItSamples[k].alt}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div>
                          <div className="sm-name">{landingImages.tryItSamples[k].title}</div>
                          <div className="sm-type">
                            {k === 'chair' && 'Herman Miller · 1963'}
                            {k === 'camera' && 'Black paint · 1988'}
                            {k === 'sneakers' && '2015 retro · size 10.5'}
                            {k === 'record' && 'Columbia · 1959 first press'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ti-right">
                  {uploadError && panel === 'empty' && (
                    <p style={{ color: c.terracotta, fontSize: 13, margin: 0 }}>{uploadError}</p>
                  )}
                  {panel === 'empty' && (
                    <div className="ti-empty">
                      <div className="e-dash">$—</div>
                      <div className="e-title">Awaiting specimen.</div>
                      <div className="e-sub">Pick a sample to the left, or drop a photo.</div>
                    </div>
                  )}
                  {panel === 'uploading' && (
                    <div className="ti-empty">
                      <div className="e-title">Uploading…</div>
                      <div className="e-sub">Running real appraisal</div>
                    </div>
                  )}
                  {panel === 'loading' && (
                    <div className="ti-loading">
                      {['Ingesting image', 'Identifying object', 'Searching 7 marketplaces', 'Synthesizing range'].map(
                        (label, i) => (
                          <div
                            key={label}
                            className={`step-row ${loadPhase > i ? 'done' : ''} ${loadPhase === i ? 'active' : ''}`}
                          >
                            <span className="dot" />
                            <span className="label">{label}</span>
                            <span className="t">{['0.2s', '0.6s', '1.4s', '0.2s'][i]}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  {panel === 'result' && demoData && (
                    <div className="ti-result">
                      <div className="ident">
                        <div>
                          <div className="ident-t" dangerouslySetInnerHTML={{ __html: demoData.name }} />
                          <div className="ident-sub">{demoData.sub}</div>
                        </div>
                        <div className="match-pct">{demoData.match}%</div>
                      </div>
                      <div>
                        <div className="ti-conf-label">Estimated resale value</div>
                        <div className="ti-big-price">
                          <span className="low" ref={resLowRef}>
                            $0
                          </span>
                          <span className="sep">/</span>
                          <span className="high" ref={resHighRef}>
                            $0
                          </span>
                        </div>
                      </div>
                      <div className="ti-conf-card">
                        <div className="ti-conf-head">
                          <span className="ti-conf-label" style={{ marginBottom: 0 }}>
                            Confidence
                          </span>
                          <span className="ti-conf-val">
                            <em>{demoData.conf}%</em> · <span>{demoData.label}</span>
                          </span>
                        </div>
                        <div className="ti-conf-bar">
                          <div className="ti-conf-bar-fill" ref={barFillRef} style={{ ['--conf' as string]: '0%' }} />
                        </div>
                        <div className="ti-conf-ticks">
                          <span>Speculative</span>
                          <span>Defensible</span>
                          <span>Ironclad</span>
                        </div>
                      </div>
                      <div className="ti-result-meta">
                        <span>{`n = ${demoData.n}`}</span>
                        <span>{`Median $${demoData.median.toLocaleString()}`}</span>
                        <span>{`Resolved in ${demoData.time}s`}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export default TryIt
