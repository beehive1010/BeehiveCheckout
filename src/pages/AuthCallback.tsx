// Auth Callback Page - Handles Supabase OAuth redirects
import React, { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { supabase } from '../lib/supabase'
import { useWeb3 } from '../contexts/Web3Context'
import { useI18n } from '../contexts/I18nContext'

interface AuthCallbackState {
  loading: boolean
  error: string | null
  success: boolean
}

export const AuthCallback: React.FC = () => {
  const { t } = useI18n()
  const [location, setLocation] = useLocation()
  const { walletAddress, checkMembershipStatus } = useWeb3()
  const [state, setState] = useState<AuthCallbackState>({
    loading: true,
    error: null,
    success: false
  })

  useEffect(() => {
    handleAuthCallback()
  }, [])

  const handleAuthCallback = async () => {
    try {
      setState({ loading: true, error: null, success: false })

      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')

      // Handle OAuth errors
      if (error) {
        throw new Error(errorDescription || error)
      }

      // Handle Supabase OAuth callback - session should be automatically set
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError

      if (session?.user) {
        console.log('✅ Supabase OAuth successful:', session.user.email)
        
        setState({ loading: false, error: null, success: true })
        
        // Wait a moment then trigger membership check
        setTimeout(async () => {
          if (walletAddress) {
            // Both wallet and Supabase auth complete - check membership
            await checkMembershipStatus()
          } else {
            // Supabase auth complete, need wallet - redirect to connect wallet
            setLocation('/') // Or wherever wallet connection happens
          }
        }, 1500)
      } else {
        throw new Error('No session found - authentication may have failed')
      }

    } catch (error) {
      console.error('Auth callback error:', error)
      setState({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Authentication failed',
        success: false 
      })

      // Redirect to auth page after error display
      setTimeout(() => {
        setLocation('/auth')
      }, 3000)
    }
  }

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">{t('auth.completingAuthentication')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('common.thisMayTakeAFewSeconds')}</p>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-white text-xl mb-4">{t('common.authenticationFailed')}</h1>
          <p className="text-gray-400 mb-6">{state.error}</p>
          <button 
            onClick={() => setLocation('/auth')}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    )
  }

  if (state.success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-white text-xl mb-4">{t('auth.authenticationSuccessful')}</h1>
          <p className="text-gray-400 mb-4">{t('auth.redirectingToDashboard')}</p>
          <div className="animate-pulse text-yellow-500">●●●</div>
        </div>
      </div>
    )
  }

  return null
}

export default AuthCallback