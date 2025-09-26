import React from 'react';
import {Card, CardContent} from '../../components/ui/card';
import {Button} from '../../components/ui/button';
import {ArrowLeft, CreditCard} from 'lucide-react';
import {useLocation} from 'wouter';
import {WithdrawalManagement} from '../../components/admin/WithdrawalManagement';
import {useIsMobile} from '../../hooks/use-mobile';

export default function AdminWithdrawals() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Header with back button */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "default"}
            onClick={() => setLocation('/admin')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {!isMobile && <span>Back</span>}
          </Button>
          
          <div>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-6 w-6 text-honey" />
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
                Withdrawal Management
              </h1>
            </div>
            <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
              Process and manage user withdrawal requests
            </p>
          </div>
        </div>

        {/* Withdrawal Management Component */}
        <Card>
          <CardContent className="p-0">
            <WithdrawalManagement />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}