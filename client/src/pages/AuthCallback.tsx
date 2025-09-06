// Auth Callback Page - Handles Thirdweb + Supabase Auth redirects
import React, { useEffect, useState } from 'react'
import { useLocation, useHistory } from 'wouter'
import { supabase, supabaseApi } from '../lib/supabase'
import { beehiveAuth } from '../lib/thirdweb-auth'

interface AuthCallbackState {
  loading: boolean
  error: string | null
  success: boolean
}

export const AuthCallback: React.FC = () => {
  const [location] = useLocation()
  const [, navigate] = useHistory()
  const [state, setState] = useState<AuthCallbackState>({
    loading: true,
    error: null,
    success: false
  })

  useEffect(() => {
    handleAuthCallback()
  }, [location])

  const handleAuthCallback = async () => {
    try {
      setState({ loading: true, error: null, success: false })

      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')
      const referralToken = urlParams.get('ref')
      const referrerWallet = urlParams.get('referrer')

      // Handle OAuth errors
      if (error) {
        throw new Error(errorDescription || error)
      }

      // Handle Supabase OAuth callback
      if (code) {
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (sessionError) throw sessionError

        if (data.session?.user) {
          // Get wallet address from user metadata
          const walletAddress = data.session.user.user_metadata?.wallet_address
          
          if (walletAddress) {
            // Process referral if present
            if (referralToken) {
              try {
                await supabaseApi.processReferralLink(walletAddress, referralToken)
              } catch (referralError) {
                console.warn('Referral processing failed:', referralError)
              }
            } else if (referrerWallet) {
              // Fallback: set referrer directly
              try {
                await supabaseApi.register(walletAddress, referrerWallet)
              } catch (referrerError) {
                console.warn('Referrer setting failed:', referrerError)
              }
            }

            // Initialize auth state
            await beehiveAuth.initialize()
            
            setState({ loading: false, error: null, success: true })
            
            // Redirect to dashboard after brief success message
            setTimeout(() => {
              navigate('/dashboard')
            }, 2000)
          } else {
            throw new Error('Wallet address not found in authentication data')
          }
        } else {
          throw new Error('No session data received')
        }
      } else {
        // Handle direct callback (non-OAuth)
        const authState = await beehiveAuth.initialize()
        
        if (authState.isAuthenticated) {
          setState({ loading: false, error: null, success: true })
          setTimeout(() => {
            navigate('/dashboard')
          }, 1000)
        } else {
          throw new Error('Authentication verification failed')
        }
      }

    } catch (error) {
      console.error('Auth callback error:', error)
      setState({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Authentication failed',
        success: false 
      })

      // Redirect to login after error display
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    }
  }

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Completing authentication...</p>
          <p className="text-gray-400 text-sm mt-2">This may take a few seconds</p>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-white text-xl mb-4">Authentication Failed</h1>
          <p className="text-gray-400 mb-6">{state.error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
          >
            Back to Login
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
          <h1 className="text-white text-xl mb-4">Authentication Successful!</h1>
          <p className="text-gray-400 mb-4">Redirecting to your dashboard...</p>
          <div className="animate-pulse text-yellow-500">●●●</div>
        </div>
      </div>
    )
  }

  return null
}

export default AuthCallback