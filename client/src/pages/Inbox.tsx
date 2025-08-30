import { useWallet } from '@/hooks/useWallet';
import { OrganizationActivity } from '@/components/organization/OrganizationActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function Inbox() {
  const { userData, walletAddress } = useWallet();
  const [, setLocation] = useLocation();

  if (!walletAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-honey mb-4">请连接钱包</h1>
          <p className="text-muted-foreground">需要连接钱包才能查看消息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/me')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-honey flex items-center gap-2">
              <Mail className="w-5 h-5" />
              组织活动消息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationActivity 
              walletAddress={walletAddress}
              maxItems={50}
              showHeader={false}
              className=""
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}