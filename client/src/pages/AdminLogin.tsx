import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Mail, Lock, Shield } from 'lucide-react';

export default function AdminLogin() {
  const { signInAdmin, isLoading } = useAdminAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both email and password',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await signInAdmin(formData.email, formData.password);
      
      toast({
        title: 'Welcome Back! 👋',
        description: 'Successfully signed in to admin panel',
      });
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      let errorMessage = 'Please check your credentials and try again';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (error.message?.includes('Invalid admin credentials')) {
        errorMessage = 'Access denied: Not an admin account';
      } else if (error.message?.includes('inactive account')) {
        errorMessage = 'Account is inactive. Contact support.';
      }

      toast({
        title: 'Sign In Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-6 w-6 border-2 border-honey border-t-transparent rounded-full"></div>
          <span className="text-muted-foreground">Checking authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-secondary border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-honey/10 rounded-full w-fit">
            <Shield className="h-8 w-8 text-honey" />
          </div>
          <CardTitle className="text-honey text-2xl">
            Admin Sign In
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Access the Beehive administration panel
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="admin@beehive.com"
                className="bg-muted border-border"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                className="bg-muted border-border"
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-honey text-secondary hover:bg-honey/90"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-secondary border-t-transparent rounded-full mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground mt-4">
              <p>⚠️ Admin access only</p>
              <p>Regular users should use the main platform</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}