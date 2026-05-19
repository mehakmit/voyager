import { useState } from 'react'
import { GoogleAuthProvider, OAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { Navigate, useLocation } from 'react-router-dom'
const googleProvider = new GoogleAuthProvider()
const isNative = !!(window as any).Capacitor?.isNativePlatform?.()

export default function AuthPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  if (user) return <Navigate to={from} replace />

  async function signInWithGoogle() {
    setError('')
    setLoading(true)
    try {
      if (isNative) {
        const { SocialLogin } = await import('@capgo/capacitor-social-login')
        await SocialLogin.initialize({
          google: {
            webClientId: '947837806868-m7rrbj27g3atsk0bqadtcrdkkq6b18q3.apps.googleusercontent.com',
            iOSClientId: '947837806868-m7rrbj27g3atsk0bqadtcrdkkq6b18q3.apps.googleusercontent.com',
          },
        })
        const result = await SocialLogin.login({ provider: 'google', options: {} })
        const { idToken, accessToken } = result.result as any
        const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken?.token)
        await signInWithCredential(auth, credential)
      } else {
        await signInWithPopup(auth, googleProvider)
      }
    } catch (err: any) {
      if (err?.message !== 'The user closed the sign in dialog.') {
        setError(err.message)
      }
      setLoading(false)
    }
  }

  async function signInWithApple() {
    setError('')
    setLoading(true)
    try {
      const { SocialLogin } = await import('@capgo/capacitor-social-login')
      await SocialLogin.initialize({ apple: {} })
      const result = await SocialLogin.login({
        provider: 'apple',
        options: { scopes: ['email', 'name'] },
      })
      const { idToken } = result.result as any
      const provider = new OAuthProvider('apple.com')
      const credential = provider.credential({ idToken })
      await signInWithCredential(auth, credential)
    } catch (err: any) {
      if (err?.message !== 'The user closed the sign in dialog.') {
        setError(err.message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display italic text-4xl text-white">Odyssey</h1>
          <p className="text-slate-400 mt-1">Plan trips with your people</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 space-y-3">
          {/* Sign in with Apple — native only */}
          {isNative && (
            <button
              onClick={signInWithApple}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-black disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <svg width="16" height="19" viewBox="0 0 16 19" fill="white">
                <path d="M13.27 9.93c-.02-2.04 1.67-3.02 1.74-3.07C13.97 4.8 12.3 4.6 11.7 4.58c-1.38-.14-2.7.82-3.4.82-.7 0-1.78-.8-2.93-.78C3.83 4.65 2.3 5.67 1.47 7.2-.23 10.3.84 14.9 2.5 17.38c.82 1.2 1.8 2.54 3.08 2.49 1.24-.05 1.71-.8 3.21-.8 1.5 0 1.93.8 3.24.78 1.34-.02 2.18-1.22 2.99-2.43.95-1.39 1.34-2.74 1.36-2.81-.03-.01-2.6-1-2.61-3.68zM10.72 2.94C11.38 2.14 11.82 1.02 11.7 0c-.97.04-2.14.65-2.83 1.44C8.22 2.2 7.68 3.34 7.82 4.34c1.08.08 2.19-.55 2.9-1.4z"/>
              </svg>
              Sign in with Apple
            </button>
          )}

          {/* Continue with Google */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-800 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
            </svg>
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        </div>
      </div>
    </div>
  )
}
