'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const router = useRouter()
  const [mode, setMode]         = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')

  async function handleEmailAuth(e) {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/dashboard')
    }
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage('Check your email to confirm your account.')
      setLoading(false)
    }
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard`,
      })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage('Password reset link sent — check your email.')
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const title    = mode === 'signin' ? <>Sign into <em>Vent</em></> :
                   mode === 'signup' ? <>Create your <em>account</em></> :
                                      <>Reset your <em>password</em></>
  const btnLabel = mode === 'signin' ? 'Sign in' :
                   mode === 'signup' ? 'Create account' : 'Send reset link'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Syne',sans-serif;background:#f4f0e8;color:#18140e;-webkit-font-smoothing:antialiased;min-height:100vh;}
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:9999;}
        .si-wrap{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;}
        .si-left{background:#18140e;padding:56px 64px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;}
        .si-left::before{content:'';position:absolute;right:-80px;top:-80px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(200,69,42,.07),transparent 70%);pointer-events:none;}
        .si-logo{display:flex;align-items:center;gap:12px;text-decoration:none;}
        .si-logo-name{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;letter-spacing:5px;color:#faf7f0;text-transform:uppercase;}
        .si-hero{flex:1;display:flex;flex-direction:column;justify-content:center;padding:48px 0;}
        .si-kicker{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:4px;color:#c8452a;text-transform:uppercase;margin-bottom:20px;display:flex;align-items:center;gap:12px;}
        .si-kicker::before{content:'';width:20px;height:1px;background:#c8452a;}
        .si-heading{font-family:'Instrument Serif',serif;font-size:clamp(40px,5vw,64px);font-weight:400;color:#faf7f0;line-height:.95;margin-bottom:24px;}
        .si-heading em{font-style:italic;color:#e05a3a;}
        .si-desc{font-size:14px;color:rgba(250,247,240,.32);line-height:1.85;max-width:360px;}
        .si-stats{display:flex;gap:40px;padding-top:32px;border-top:1px solid rgba(255,255,255,.06);}
        .si-stat-v{font-family:'Instrument Serif',serif;font-size:36px;font-style:italic;color:#c8452a;line-height:1;}
        .si-stat-l{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;color:rgba(250,247,240,.18);text-transform:uppercase;margin-top:4px;}
        .si-right{background:#faf7f0;display:flex;align-items:center;justify-content:center;padding:48px 40px;}
        .si-form-wrap{width:100%;max-width:380px;}
        .si-form-title{font-family:'Instrument Serif',serif;font-size:clamp(28px,3vw,38px);font-weight:400;color:#18140e;line-height:1.05;margin-bottom:8px;}
        .si-form-title em{font-style:italic;color:#c8452a;}
        .si-form-sub{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;color:#a89e88;margin-bottom:36px;}
        .si-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:13px 20px;background:#fff;border:1.5px solid #d4cfc0;border-radius:3px;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;color:#36301f;cursor:pointer;transition:border-color .2s,box-shadow .2s;margin-bottom:24px;}
        .si-google:hover{border-color:#a89e88;box-shadow:0 2px 12px rgba(0,0,0,.06);}
        .si-google:disabled{opacity:.5;cursor:not-allowed;}
        .si-divider{display:flex;align-items:center;gap:12px;margin-bottom:24px;}
        .si-divider::before,.si-divider::after{content:'';flex:1;height:1px;background:#d4cfc0;}
        .si-divider span{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;color:#a89e88;text-transform:uppercase;white-space:nowrap;}
        .si-field{margin-bottom:14px;}
        .si-label{display:block;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#5a5140;margin-bottom:7px;}
        .si-input{width:100%;padding:12px 14px;background:#fff;border:1.5px solid #d4cfc0;border-radius:3px;font-family:'Syne',sans-serif;font-size:14px;color:#18140e;outline:none;transition:border-color .2s,box-shadow .2s;}
        .si-input:focus{border-color:#c8452a;box-shadow:0 0 0 3px rgba(200,69,42,.08);}
        .si-input::placeholder{color:#d4cfc0;}
        .si-submit{width:100%;padding:14px;background:#18140e;color:#faf7f0;border:none;border-radius:3px;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;letter-spacing:.5px;cursor:pointer;transition:background .2s,transform .15s;margin-top:20px;}
        .si-submit:hover:not(:disabled){background:#c8452a;transform:translateY(-1px);}
        .si-submit:disabled{opacity:.5;cursor:not-allowed;transform:none;}
        .si-error{background:rgba(200,69,42,.07);border:1px solid rgba(200,69,42,.2);border-left:3px solid #c8452a;border-radius:2px;padding:10px 14px;margin-bottom:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#c8452a;line-height:1.6;}
        .si-message{background:rgba(42,102,66,.06);border:1px solid rgba(42,102,66,.2);border-left:3px solid #2a6642;border-radius:2px;padding:10px 14px;margin-bottom:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#2a6642;line-height:1.6;}
        .si-switch{margin-top:24px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.5px;color:#a89e88;}
        .si-switch button{background:none;border:none;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;color:#c8452a;text-decoration:underline;padding:0 4px;transition:color .15s;}
        .si-switch button:hover{color:#e05a3a;}
        @media(max-width:768px){.si-wrap{grid-template-columns:1fr;}.si-left{display:none;}.si-right{padding:40px 24px;min-height:100vh;}}
      `}</style>

      <div className="si-wrap">
        {/* Left panel */}
        <div className="si-left">
          <a href="/" className="si-logo">
            <svg viewBox="0 0 44 44" fill="none" width="36" height="36">
              <circle cx="22" cy="22" r="21" stroke="#faf7f0" strokeWidth="1" opacity=".15"/>
              <path d="M22 10 L10 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M22 10 L34 30" stroke="#c8452a" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M10 30 Q22 36 34 30" stroke="#faf7f0" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".3"/>
              <circle cx="22" cy="10" r="2.5" fill="#c8452a"/>
            </svg>
            <span className="si-logo-name">Vent</span>
          </a>
          <div className="si-hero">
            <div className="si-kicker">Your medical study companion</div>
            <h1 className="si-heading">Study like<br/>you <em>breathe.</em></h1>
            <p className="si-desc">Structured clinical notes built for exam prep. Breathe through each concept. Test your recall. Track what sticks.</p>
          </div>
          <div className="si-stats">
            <div><div className="si-stat-v">19</div><div className="si-stat-l">Ophtho notes</div></div>
            <div><div className="si-stat-v">27</div><div className="si-stat-l">OB/GYN notes</div></div>
            <div><div className="si-stat-v">90+</div><div className="si-stat-l">MCQs</div></div>
          </div>
        </div>

        {/* Right panel */}
        <div className="si-right">
          <div className="si-form-wrap">
            <div className="si-form-title">{title}</div>
            <div className="si-form-sub">
              {mode === 'signin' && 'Welcome back.'}
              {mode === 'signup' && 'Free to start. No card required.'}
              {mode === 'reset'  && "We'll send a reset link to your email."}
            </div>

            {error   && <div className="si-error">{error}</div>}
            {message && <div className="si-message">{message}</div>}

            {mode !== 'reset' && (
              <>
                <button className="si-google" onClick={handleGoogle} disabled={loading}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
                <div className="si-divider"><span>or</span></div>
              </>
            )}

            <form onSubmit={handleEmailAuth}>
              <div className="si-field">
                <label className="si-label">Email</label>
                <input className="si-input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
              </div>
              {mode !== 'reset' && (
                <div className="si-field">
                  <label className="si-label">Password</label>
                  <input className="si-input" type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}/>
                </div>
              )}
              <button className="si-submit" type="submit" disabled={loading}>
                {loading ? 'Please wait…' : btnLabel}
              </button>
            </form>

            <div className="si-switch">
              {mode === 'signin' && <>No account?{' '}<button onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Sign up free</button>{' · '}<button onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Forgot password?</button></>}
              {mode === 'signup' && <>Already have an account?{' '}<button onClick={() => { setMode('signin'); setError(''); setMessage('') }}>Sign in</button></>}
              {mode === 'reset'  && <>Remember it?{' '}<button onClick={() => { setMode('signin'); setError(''); setMessage('') }}>Back to sign in</button></>}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
