import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CheckCircle, Clock, Gift } from 'lucide-react';
import MembershipLevelList from '../components/membership/MembershipLevelList';
import { useWallet } from '../hooks/useWallet';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: 'pending' | 'completed' | 'claimed';
  category: 'daily' | 'weekly' | 'special';
}

export default function Tasks() {
  const { t } = useI18n();
  const { walletAddress } = useWallet();

  // Mock tasks data
  const tasks: Task[] = [
    {
      id: '1',
      title: 'Complete Daily Check-in',
      description: 'Visit the platform and check-in daily',
      reward: 10,
      status: 'pending',
      category: 'daily'
    },
    {
      id: '2',
      title: 'Refer a Friend',
      description: 'Invite someone to join BeeHive',
      reward: 100,
      status: 'pending',
      category: 'special'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'claimed':
        return <Gift className="w-4 h-4 text-honey" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-honey mb-2">
          {t('tasks.title') || 'Tasks & Marketplace'}
        </h1>
        <p className="text-muted-foreground">
          {t('tasks.subtitle') || 'Browse membership NFTs and claim merchant rewards'}
        </p>
      </div>

      {/* Membership Upgrade Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-honey mb-2">
            Bumblebees Membership NFTs
          </h2>
          <p className="text-muted-foreground text-sm">
            Authentic membership levels with USDT payments on multi-chain support
          </p>
        </div>
        
        {walletAddress && (
          <MembershipLevelList 
            onPurchaseSuccess={() => {
              // Refresh the page or show success message
              window.location.reload();
            }}
          />
        )}
      </div>

      {/* Advertisement NFTs Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-honey mb-2">
            Advertisement NFT Collection
          </h2>
          <p className="text-muted-foreground text-sm">
            Exclusive merchant NFTs claimable with BCC tokens
          </p>
        </div>

        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-secondary border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-honey flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      {task.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-4">
                    {task.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-honey font-semibold">
                    {task.reward} BCC
                  </span>
                  <Button
                    size="sm"
                    disabled={task.status === 'claimed'}
                    className="bg-honey text-secondary hover:bg-honey/90"
                  >
                    {task.status === 'completed' ? t('tasks.claim') || 'Claim' : 
                     task.status === 'claimed' ? t('tasks.claimed') || 'Claimed' :
                     t('tasks.start') || 'Start'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}