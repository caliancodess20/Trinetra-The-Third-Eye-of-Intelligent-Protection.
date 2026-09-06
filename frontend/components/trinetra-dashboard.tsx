'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Camera, CheckCircle2, ChevronDown, CircleAlert, Menu, QrCode, ShieldCheck, X } from 'lucide-react'
import { createQrEntry, getFestivals, getTemples, type Festival, type Temple } from '@/lib/trinetra-api'

const nav = ['Overview', 'Temples', 'Safety', 'Journey', 'Festival calendar']
const features = [
  ['Live crowd intelligence', 'Monitor pressure across every checkpoint before it becomes a bottleneck.'],
  ['Instant QR entry', 'Scan pilgrim passes and create a dated gate entry in the Firebase backend.'],
  ['Route-aware protection', 'Keep groups, staff and response teams connected across the entire circuit.'],
  ['One operational view', 'See alerts, check-ins and movement signals in one calm, clear workspace.'],
  ['SOS readiness', 'Surface medical, route and crowd risks where your team can act immediately.'],
  ['Festival planning', 'Plan around peak dates with a live calendar built for temple operations.'],
]

export default function TrinetraDashboard() {
  const [temples, setTemples] = useState<Temple[]>([])
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [status, setStatus] = useState('')
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [mobileOpen, setMobileOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    getTemples().then(setTemples)
    getFestivals().then(setFestivals)
  }, [])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanState('error')
      setStatus('Camera access is unavailable. Enter the pass code manually.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()

      if (!('BarcodeDetector' in window)) {
        setStatus('Camera ready. QR detection is unavailable in this browser; enter the pass code below.')
        return
      }

      const Detector = (window as typeof window & { BarcodeDetector: new (options?: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]> } }).BarcodeDetector
      const detector = new Detector({ formats: ['qr_code'] })
      const poll = async () => {
        if (!videoRef.current || !streamRef.current || video.readyState < 2) return
        try {
          const result = await detector.detect(video)
          if (result[0]?.rawValue) {
            await saveEntry(result[0].rawValue, 'qr')
            return
          }
        } catch {
          setStatus('QR detection is unavailable. Enter the pass code manually.')
          return
        }
        if (streamRef.current && scanState === 'scanning') window.setTimeout(poll, 500)
      }
      poll()
    } catch {
      setScanState('error')
      setStatus('Camera access is unavailable. Enter the pass code manually.')
    }
  }

  function openScanner() {
    setScannerOpen(true)
    setScanState('scanning')
    setStatus('Starting camera…')
  }

  useEffect(() => {
    if (!scannerOpen || scanState !== 'scanning') return
    const timer = window.setTimeout(() => void startCamera(), 100)
    return () => window.clearTimeout(timer)
  }, [scannerOpen])

  async function saveEntry(code: string, source: 'qr' | 'manual') {
    if (!code.trim()) return
    setScanState('scanning'); setStatus('Saving dated entry to Firebase…')
    try {
      await createQrEntry({ code: code.trim(), temple: 'temple_1', enteredAt: new Date().toISOString(), source })
      setScanState('success'); setStatus(`Entry ${code.trim()} recorded at Somnath.`)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    } catch { setScanState('error'); setStatus('Entry could not be saved. Check the Firebase connection and try again.') }
  }

  function closeScanner() { streamRef.current?.getTracks().forEach((track) => track.stop()); setScannerOpen(false); setScanState('idle'); setManualCode(''); setStatus('') }

  return <div className="min-h-screen bg-background text-foreground">
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-white/20 bg-[#8b5a3c]/15 text-white backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a href="#top" className="font-sans text-lg font-bold tracking-[0.25em]">TRINETRA</a>
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">{nav.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`} className="transition-opacity hover:opacity-65">{item}</a>)}</nav>
        <button onClick={openScanner} className="hidden rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#26364f] transition-transform hover:scale-105 sm:block">Scan pilgrim pass</button>
        <button onClick={() => setMobileOpen((open) => !open)} aria-label="Open navigation" className="md:hidden"><Menu className="size-6" /></button>
      </div>
      {mobileOpen && <nav className="flex flex-col gap-5 border-t border-white/20 bg-[#26364f] px-6 py-5 text-sm md:hidden">{nav.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setMobileOpen(false)}>{item}</a>)}<button onClick={openScanner} className="w-fit rounded-full bg-white px-5 py-3 font-semibold text-[#26364f]">Scan pilgrim pass</button></nav>}
    </header>

    <main id="top">
      <section className="relative flex min-h-[92vh] items-end overflow-hidden bg-[#26364f] px-6 pb-16 pt-32 lg:px-10 lg:pb-24">
        <img src="/trinetra-hero.png" alt="Golden light over a temple pilgrimage route" className="absolute inset-0 size-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#26364f]/90 via-[#26364f]/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl"><p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-white/75">Pilgrimage protection system</p><h1 className="max-w-6xl font-sans text-[clamp(5rem,16vw,15rem)] font-bold leading-[0.78] tracking-[-0.08em] text-white">TRINETRA</h1><div className="mt-10 flex max-w-xl flex-col gap-5 text-white sm:flex-row sm:items-end sm:justify-between"><p className="max-w-sm text-base leading-7 text-white/80">The third eye for safer, smarter journeys across Gujarat&apos;s temple circuit.</p><button onClick={openScanner} className="flex w-fit items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#26364f]">Record an entry <ArrowRight className="size-4" /></button></div></div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#26364f] px-6 py-24 lg:px-10 lg:py-32" style={{ backgroundImage: 'url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/temples-bg-wHrDhVFRCKaAh7xkj37Z7BCnXNNpnf.png)', backgroundColor: '#26364f', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}><div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[#26364f]/35" /><div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"><svg viewBox="0 0 1200 620" preserveAspectRatio="none" className="absolute inset-0 size-full opacity-[0.11]" fill="none"><g stroke="#26364f" strokeWidth="1"><path d="M530 80c110-42 218-23 296 37s163 52 270 8"/><path d="M520 112c114-42 223-19 303 40s167 55 275 4"/><path d="M510 146c119-42 230-17 311 43s170 57 279 0"/><path d="M500 182c123-41 238-15 320 46s171 59 280-4"/><path d="M490 220c128-39 245-12 328 49s171 60 279-8"/><path d="M478 260c134-37 252-9 336 52s168 61 273-11"/><path d="M467 304c141-35 261-5 344 56s163 62 265-13"/><path d="M458 350c146-31 270-1 350 60s156 61 255-13"/><path d="M449 399c152-28 280 4 357 64s148 57 244-9"/><path d="M440 452c158-25 290 8 365 68s140 52 232-3"/></g><g stroke="#b88a4a" strokeWidth="1.5" opacity="0.55"><path d="M745 188c66 33 91 71 78 115s-48 68-87 102-48 67-24 110"/><path d="M755 188c67 35 94 74 80 118s-49 70-89 103-47 65-22 106"/></g><path d="M812 142c-18 11-40 18-49 40-8 18-2 35-15 48-18 18-13 42-28 61-14 18-2 37-12 55-12 22-34 37-27 62 8 30 43 43 58 61 18 21 18 47 42 65 18 14 45 9 63-4 20-14 27-37 44-53 18-16 43-22 60-41 17-18 12-43 5-64-8-24-2-49 13-68 14-18 34-33 30-57-4-24-28-40-45-56-16-15-20-39-40-49-24-13-37 6-59 10-20 4-27-17-40-10z" stroke="#26364f" strokeWidth="2" opacity="0.16"/><path d="M790 186C845 247 873 307 850 374s-52 91-71 139" stroke="#b88a4a" strokeWidth="1.5" strokeDasharray="3 9" opacity="0.5"/><g fill="#b88a4a" opacity="0.5"><circle cx="790" cy="186" r="4"/><circle cx="850" cy="374" r="4"/><circle cx="822" cy="438" r="4"/><circle cx="779" cy="513" r="4"/></g><g stroke="#26364f" strokeWidth="2" opacity="0.13"><path d="M930 555v-58l18-18 18 18v58M922 555h52M1005 555v-45l16-16 16 16v45M997 555h48M1074 555v-69l20-22 20 22v69M1064 555h60"/></g></svg></div><div className="relative mx-auto max-w-7xl"><div className="grid gap-10 lg:grid-cols-[1fr_2fr]"><h2 className="max-w-md font-sans text-4xl font-bold leading-tight tracking-tight text-[#26364f] md:text-6xl"><span className="text-white">Protection that moves with every pilgrim.</span></h2><p className="max-w-xl text-lg leading-8 text-muted-foreground"><span className="text-white">Trinetra connects temple teams, pilgrim groups and live signals so every entry is visible, every risk is actionable and every journey feels looked after.</span></p></div><div id="overview" className="mt-20 grid gap-px overflow-hidden rounded-2xl bg-[#26364f]/15 sm:grid-cols-2 lg:grid-cols-3">{features.map(([title, copy]) => <article key={title} className="bg-background p-7 lg:p-9"><div className="mb-16 flex items-center justify-between"><ShieldCheck className="size-6 text-primary" /><span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trinetra</span></div><h3 className="text-xl font-bold text-[#26364f]">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p></article>)}</div></div></section>

      <section id="temples" className="relative overflow-hidden bg-[#26364f] px-6 py-24 text-white lg:px-10 lg:py-32"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/temples-bg-wHrDhVFRCKaAh7xkj37Z7BCnXNNpnf.png" alt="Temple at sunset above a mountain pilgrimage route" className="absolute inset-0 size-full object-cover" /><div className="absolute inset-0 bg-[#26364f]/25" /><div className="relative mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">Live circuit</p><h2 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight md:text-6xl">Where devotion meets intelligence.</h2></div><p className="max-w-xs text-sm leading-6 text-white/65">Every temple, every entry point, and every pilgrim movement — connected in one view.</p></div><div className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-white/20 sm:grid-cols-2 lg:grid-cols-4">{temples.map((temple) => <article key={temple.id} className="bg-[#26364f] p-6"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-[0.2em] text-white/50">{temple.city}</span><span className={`size-2 rounded-full ${temple.pressure >= 75 ? 'bg-[#e6a071]' : 'bg-[#a9c4a0]'}`} /></div><h3 className="mt-16 text-2xl font-bold">{temple.name}</h3><div className="mt-6 flex items-end justify-between"><span className="text-4xl font-bold">{temple.pressure}%</span><span className="text-xs text-white/50">{temple.status}</span></div><div className="mt-5 h-1 rounded-full bg-white/15"><div className="h-1 rounded-full bg-[#e6a071]" style={{ width: `${temple.pressure}%` }} /></div></article>)}</div></div></section>

      <section id="festival-calendar" className="relative overflow-hidden bg-[#26364f] px-6 py-24 text-white lg:px-10 lg:py-32"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/festival-calendar-bg-M2QjOhcTVwXPhuNF4HcIOg24V7w5Bc.png" alt="Festival lamps and flowers beside a temple lake at sunset" className="absolute inset-0 size-full object-cover" /><div className="absolute inset-0 bg-[#26364f]/25" /><div className="relative mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">2026 festival calendar</p><h2 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-white md:text-6xl">When the crowd grows, preparation can&apos;t wait.</h2></div><p className="max-w-sm text-sm leading-6 text-white">Turn festival dates and expected crowds into actionable plans before the first pilgrim arrives.</p></div><div className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-[#26364f]/15 md:grid-cols-2 lg:grid-cols-5">{festivals.map((festival) => { const date = new Date(`${festival.date}T12:00:00`); return <article key={festival.id} className="bg-background p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-4xl font-bold leading-none text-primary">{date.getDate()}</p><p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{date.toLocaleDateString('en-IN', { month: 'short' })}</p></div><span className="rounded-full bg-[#e6a071]/25 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8b5a3c]">{festival.crowdLevel}</span></div><h3 className="mt-12 text-xl font-bold text-[#26364f]">{festival.name}</h3><p className="mt-2 text-sm font-semibold text-primary">{festival.temple}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{festival.note}</p></article> })}</div></div></section>

      <section id="journey" className="relative overflow-hidden bg-[#26364f] px-6 py-24 text-white lg:px-10 lg:py-32"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/journey-bg-xbRFuzLQ0al11nlqfEwJ5SXaPkEBQq.png" alt="Sunset mountain road winding through a pilgrimage landscape" className="absolute inset-0 size-full object-cover" /><div className="absolute inset-0 bg-[#26364f]/25" /><div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] opacity-60">Active journey</p><h2 className="mt-5 max-w-3xl text-4xl font-bold leading-[0.95] tracking-tight md:text-7xl">Your journey moves. TRINETRA moves with it.</h2><p className="mt-5 max-w-xl text-base leading-7 text-white">From departure to destination, TRINETRA keeps pilgrim groups, routes, and checkpoints connected.</p></div><div className="border-t border-[#26364f]/30 pt-6"><p className="text-2xl font-semibold">Desai Family Circuit</p><p className="mt-3 text-sm leading-6 opacity-70">Somnath → Dwarka → Ambaji → Pavagadh</p><div className="mt-7 h-2 rounded-full bg-[#26364f]/20"><div className="h-2 w-[38%] rounded-full bg-[#26364f]" /></div><div className="mt-3 flex justify-between text-xs font-semibold"><span>38% complete</span><span>4 checkpoints</span></div></div></div></section>

      <section id="safety" className="relative overflow-hidden bg-[#26364f] px-6 py-24 text-white lg:px-10 lg:py-32"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/safety-bg-1zETMoSBpHnipTAxmYdRrvvjBZ6JIu.png" alt="Temple lamp glowing at sunset above a hilltop shrine" className="absolute inset-0 size-full object-cover" /><div className="absolute inset-0 bg-[#26364f]/25" /><div className="relative mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Operations desk</p><h2 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-white md:text-6xl">Don&apos;t react to the crowd. Read it.</h2><p className="mt-5 max-w-xl text-base leading-7 text-white">Live crowd signals, route awareness, and instant alerts help teams act before situations escalate.</p></div><button onClick={openScanner} className="flex w-fit items-center gap-2 rounded-full bg-[#26364f] px-5 py-3 text-sm font-bold text-white">Open QR scanner <QrCode className="size-4" /></button></div><div className="mt-16 grid gap-8 lg:grid-cols-2"><div className="border-t-2 border-[#26364f] pt-5"><div className="flex items-center justify-between"><h3 className="text-2xl font-bold text-white">Safety alerts</h3><CircleAlert className="size-5 text-primary" /></div>{['High crowd pressure · Ambaji', 'Medical assistance · Dwarka Gate 2', 'Route deviation · Circuit bus GJ-18'].map((alert) => <div key={alert} className="flex items-center justify-between border-b border-[#26364f]/15 py-5 text-sm"><span className="text-white">{alert}</span><span className="text-xs text-white">Open</span></div>)}</div><div className="border-t-2 border-[#26364f] pt-5"><h3 className="text-2xl font-bold text-white">Today on the circuit</h3>{[['1,284', 'check-ins recorded'], ['94.6', 'average safety score'], ['03', 'active SOS signals']].map(([value, label]) => <div key={label} className="flex items-baseline justify-between border-b border-[#26364f]/15 py-5"><span className="text-4xl font-bold text-primary">{value}</span><span className="text-sm text-white">{label}</span></div>)}</div></div></div></section>
    </main>

    <footer className="bg-[#26364f] px-6 py-12 text-white lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-lg font-bold tracking-[0.25em]">TRINETRA</p><p className="mt-4 max-w-xs text-sm leading-6 text-white/60">The third eye of intelligent protection for every sacred journey.</p></div><div className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/70"><a href="#overview">Overview</a><a href="#temples">Temples</a><a href="#safety">Safety</a><button onClick={openScanner}>Scan pass</button></div></div></footer>

    {scannerOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#26364f]/80 p-4"><div className="w-full max-w-md rounded-2xl bg-background p-5 text-foreground shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Gate checkpoint</p><h2 className="mt-2 text-2xl font-bold text-[#26364f]">Scan pilgrim pass</h2></div><button onClick={closeScanner} aria-label="Close scanner"><X className="size-5" /></button></div><div className="mt-5 overflow-hidden rounded-xl bg-[#26364f]"><video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" /><div className="flex items-center gap-2 px-4 py-3 text-xs text-white/70"><Camera className="size-4" /> Camera scanner active</div></div><p className={`mt-4 rounded-lg px-3 py-3 text-sm ${scanState === 'success' ? 'bg-[#e7f0e1] text-[#496641]' : scanState === 'error' ? 'bg-[#f8e5dc] text-[#9b5239]' : 'bg-[#f1e7de] text-[#6a5344]'}`}>{status || 'Use the camera or enter a pass code manually.'}</p><div className="mt-4 flex gap-2"><input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="e.g. TRN-2048" className="min-w-0 flex-1 rounded-lg border border-[#26364f]/20 bg-transparent px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" /><button onClick={() => saveEntry(manualCode, 'manual')} className="rounded-lg bg-[#26364f] px-4 text-sm font-bold text-white">Record</button></div>{scanState === 'idle' && <button onClick={openScanner} className="mt-3 w-full rounded-lg border border-[#26364f]/20 py-3 text-sm font-bold">Enable camera</button>}<div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4" /> Entries are dated and sent to Firebase gate_scans.</div></div></div>}
  </div>
}
