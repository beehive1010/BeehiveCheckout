import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';
import { motion } from 'framer-motion';
import HexagonIcon from '../../components/shared/HexagonIcon';
import { Shield, Lock, User } from 'lucide-react';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { signInAdmin } = useAdminAuthContext();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use AdminAuthContext signInAdmin method
      await signInAdmin(credentials.email, credentials.password);

      toast({
        title: 'Login Successful',
        description: `Welcome to Admin Panel!`,
      });

      // AdminAuthContext will handle redirect to /admin/dashboard
    } catch (error: any) {
      console.error('Admin login error:', error);

      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid admin credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="bg-secondary border-border glow-hover">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <HexagonIcon className="mx-auto mb-6" size="xl">
                <Shield className="text-honey text-4xl" />
              </HexagonIcon>
            </motion.div>
            
            <CardTitle className="text-3xl font-bold text-honey mb-2">
              Beehive Admin Panel
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Secure access to administrative functions
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-honey mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter admin email"
                    value={credentials.email}
                    onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="bg-muted border-honey/20 focus:border-honey"
                    data-testid="input-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password" className="text-honey mb-2 flex items-center">
                    <Lock className="w-4 h-4 mr-2" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter admin password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="bg-muted border-honey/20 focus:border-honey"
                    data-testid="input-password"
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-honey hover:bg-honey/90 text-black font-semibold"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? 'Authenticating...' : 'Login to Admin Panel'}
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  🔒 Secure admin authentication with audit logging
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}