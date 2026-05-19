import { useState, useEffect } from 'react'
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
} from 'firebase/auth'
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

  useEffect(() => {
    // Handle Google redirect result when app resumes
    getRedirectResult(auth).catch(() => {})
  }, [])

  if (user) return <Navigate to={from} replace />

  async function signInWithGoogle() {
    setError('')
    setLoading(true)
    try {
      if (isNative) {
        await signInWithRedirect(auth, googleProvider)
      } else {
        await signInWithPopup(auth, googleProvider)
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function signInWithApple() {
    setError('')
    setLoading(true)
    try {
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')
      const nonce = Math.random().toString(36).slice(2)
      const result = await SignInWithApple.authorize({
        clientId: 'app.odyssey',
        redirectURI: 'https://voyager-301a2.firebaseapp.com/__/auth/handler',
        scopes: 'email name',
        nonce,
      })
      const provider = new OAuthProvider('apple.com')
      const credential = provider.credential({
        idToken: result.response.identityToken,
      })
      await signInWithCredential(auth, credential)
    } catch (err: any) {
      if (err?.message !== 'The user closed the native sign in flow.') {
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
          {/* Sign in with Apple — shown on native only */}
          {isNative && (
            <button
              onClick={signInWithApple}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.8-155.5-127.4C46 389.6 0 250 0 109.5 0 46.9 26.1 0 66.2 0c63.1 0 93.8 55 122.1 55 26.6 0 63.8-55 122.1-55 49.3 0 79.3 19.5 112.9 53.9 34.9 35.7 55 83.5 55 131.3 0 3.8-.3 7.5-.6 11.2 0 .3-.1.5-.1.8zM451.3 550.6c0 85.4-69.4 154.8-154.8 154.8s-154.8-69.4-154.8-154.8V0h-66v550.6C75.7 670 169.5 763.8 289.4 763.8 409.4 763.8 502.4 670 502.4 550.6V0h-51.1v550.6z"/>
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
