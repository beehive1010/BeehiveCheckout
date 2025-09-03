import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CheckCircle, Clock, Gift, Crown, Zap, Target } from 'lucide-react';
import MembershipLevelList from '../components/membership/MembershipLevelList';
import { useWallet } from '../hooks/useWallet';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: 'pending' | 'completed' | 'claimed';
  category: 'daily' | 'weekly' | 'special';
  type: 'task' | 'advertisement';
}

export default function Tasks() {
  const { t } = useI18n();
  const { walletAddress } = useWallet();

  // Mock tasks data
  const taskNFTs: Task[] = [
    {
      id: '1',
      title: 'Complete Daily Check-in',
      description: 'Visit the platform and check-in daily',
      reward: 10,
      status: 'pending',
      category: 'daily',
      type: 'task'
    },
    {
      id: '2',
      title: 'Refer a Friend',
      description: 'Invite someone to join BeeHive',
      reward: 100,
      status: 'pending',
      category: 'special',
      type: 'task'
    },
    {
      id: '3',
      title: 'Complete 7-Day Streak',
      description: 'Login daily for 7 consecutive days',
      reward: 50,
      status: 'completed',
      category: 'weekly',
      type: 'task'
    }
  ];

  // Advertisement NFT data
  const advertisementNFTs: Task[] = [
    {
      id: 'ad1',
      title: 'Starbucks Merchant NFT',
      description: 'Exclusive coffee discount NFT - 15% off all drinks',
      reward: 200,
      status: 'pending',
      category: 'special',
      type: 'advertisement'
    },
    {
      id: 'ad2',
      title: 'Nike Sports NFT',
      description: 'Premium athletic gear access token',
      reward: 350,
      status: 'pending',
      category: 'special',
      type: 'advertisement'
    },
    {
      id: 'ad3',
      title: 'McDonald\'s VIP NFT',
      description: 'Fast food loyalty program with exclusive rewards',
      reward: 150,
      status: 'claimed',
      category: 'special',
      type: 'advertisement'
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

  const renderTaskCard = (task: Task) => (
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
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-honey mb-2">
          {t('tasks.title') || 'Tasks & NFT Marketplace'}
        </h1>
        <p className="text-muted-foreground">
          {t('tasks.subtitle') || 'Complete tasks, upgrade membership and claim exclusive NFTs'}
        </p>
      </div>

      <Tabs defaultValue="membership" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-secondary h-auto">
          <TabsTrigger value="membership" className="flex items-center gap-2 text-sm py-3">
            <Crown className="w-4 h-4" />
            Membership NFTs
          </TabsTrigger>
          <TabsTrigger value="advertisements" className="flex items-center gap-2 text-sm py-3">
            <Zap className="w-4 h-4" />
            Advertisement NFTs
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2 text-sm py-3">
            <Target className="w-4 h-4" />
            Task NFTs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="membership" className="space-y-6">
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
                window.location.reload();
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="advertisements" className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-honey mb-2">
              Advertisement NFT Collection
            </h2>
            <p className="text-muted-foreground text-sm">
              Exclusive merchant NFTs claimable with BCC tokens
            </p>
          </div>

          <div className="grid gap-4">
            {advertisementNFTs.map(renderTaskCard)}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-honey mb-2">
              Task NFT Rewards
            </h2>
            <p className="text-muted-foreground text-sm">
              Complete daily and weekly tasks to earn exclusive NFT rewards
            </p>
          </div>

          <div className="grid gap-4">
            {taskNFTs.map(renderTaskCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}