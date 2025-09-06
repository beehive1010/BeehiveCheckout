import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { useLocation } from 'wouter';
import { supabase } from '../lib/supabase';
import { useWeb3 } from '../contexts/Web3Context';
import { Eye, EyeOff, Mail, Key, Chrome, Facebook, Github } from 'lucide-react';

export default function SupabaseAuth() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { walletAddress, isSupabaseAuthenticated } = useWeb3();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isSupabaseAuthenticated && walletAddress) {
      console.log('✅ Both authentications complete, redirecting to dashboard check');
      setLocation('/welcome');
    }
  }, [isSupabaseAuthenticated, walletAddress, setLocation]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: 'Sign In Successful! ✅',
          description: 'Welcome back to Beehive!',
        });
      } else {
        // Sign up
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: 'Password Mismatch',
            description: 'Passwords do not match',
            variant: 'destructive'
          });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              username: formData.username,
              display_name: formData.username
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          toast({
            title: 'Check Your Email 📧',
            description: 'Please check your email and click the confirmation link',
          });
        } else {
          toast({
            title: 'Account Created! 🎉',
            description: 'Welcome to Beehive!',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: isLogin ? 'Sign In Failed' : 'Sign Up Failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'facebook' | 'github') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      // OAuth will redirect, so we don't need to handle success here
    } catch (error: any) {
      toast({
        title: 'Social Sign In Failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey text-center text-2xl">
            {isLogin ? 'Sign In to Beehive' : 'Create Your Account'}
          </CardTitle>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Complete your dual authentication
            </p>
            {walletAddress && (
              <p className="text-xs text-green-400">
                ✅ Wallet Connected: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
              </p>
            )}
            {!walletAddress && (
              <p className="text-xs text-yellow-400">
                ⚠️ Connect wallet first for full access
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email/Password Form - Only Authentication Method */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Choose a username"
                  className="bg-muted border-border"
                  required={!isLogin}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                className="bg-muted border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center">
                <Key className="h-4 w-4 mr-2" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="bg-muted border-border pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm your password"
                  className="bg-muted border-border"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-honey text-secondary hover:bg-honey/90"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          {/* Toggle between login/signup */}
          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-honey hover:text-honey/80 underline"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Help text */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Need help? Contact support</p>
            <p className="text-yellow-400">
              ℹ️ You need both wallet connection AND account authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}