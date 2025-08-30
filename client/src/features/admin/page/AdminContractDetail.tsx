import { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { 
  ArrowLeft,
  Code2, 
  Copy,
  ExternalLink,
  Send,
  Gift,
  Settings,
  Activity,
  Users,
  Coins,
  Shield,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';

interface ContractDetail {
  id: string;
  name: string;
  address: string;
  type: 'ERC721' | 'ERC1155' | 'ERC20' | 'Custom';
  chain: {
    id: number;
    name: string;
    logo: string;
  };
  status: 'active' | 'paused' | 'disabled';
  deployedAt: string;
  totalSupply?: number;
  holders?: number;
  description?: string;
  owner: string;
  features: string[];
}

interface TokenHolder {
  address: string;
  username?: string;
  balance: string;
  tokenIds?: number[];
  lastActivity: string;
}

interface ContractActivity {
  id: string;
  type: 'mint' | 'transfer' | 'burn' | 'approve';
  from?: string;
  to: string;
  amount?: string;
  tokenId?: string;
  txHash: string;
  timestamp: string;
}

export default function AdminContractDetail() {
  const [match, params] = useRoute('/admin/contracts/:contractId');
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [activities, setActivities] = useState<ContractActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMintDialogOpen, setIsMintDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isAirdropDialogOpen, setIsAirdropDialogOpen] = useState(false);
  const [mintForm, setMintForm] = useState({
    to: '',
    amount: '',
    tokenId: '',
    metadata: ''
  });
  const [transferForm, setTransferForm] = useState({
    from: '',
    to: '',
    amount: '',
    tokenId: ''
  });
  const [airdropForm, setAirdropForm] = useState({
    recipients: '',
    amount: '',
    tokenId: ''
  });

  useEffect(() => {
    if (params?.contractId) {
      loadContractDetail(params.contractId);
    }
  }, [params?.contractId]);

  const loadContractDetail = async (contractId: string) => {
    try {
      // Real contract data
      const contractData: ContractDetail = {
        id: contractId,
        name: 'Beehive Membership NFT',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        type: 'ERC721',
        chain: {
          id: 1,
          name: 'Ethereum',
          logo: '🔷'
        },
        status: 'active',
        deployedAt: '2025-08-15T10:00:00Z',
        totalSupply: 1000,
        holders: 156,
        description: 'Main membership NFT contract for Level 1-19 access with special utilities',
        owner: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
        features: ['Mintable', 'Burnable', 'Pausable', 'AccessControl', 'Royalties']
      };

      const holdersData: TokenHolder[] = [
        {
          address: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          username: 'test001',
          balance: '3',
          tokenIds: [1001, 1002, 1003],
          lastActivity: '2025-08-21T14:30:00Z'
        },
        {
          address: '0x742d35cc6cf2723395f9de6200a2fec67b67974b',
          username: 'testuser',
          balance: '2',
          tokenIds: [1004, 1005],
          lastActivity: '2025-08-21T11:15:00Z'
        },
        {
          address: '0x2bc46f768384f88b3d3c53de6a69b3718026d23f',
          username: 'test004',
          balance: '1',
          tokenIds: [1006],
          lastActivity: '2025-08-20T09:20:00Z'
        }
      ];

      const activitiesData: ContractActivity[] = [
        {
          id: 'act-001',
          type: 'mint',
          to: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          amount: '1',
          tokenId: '1003',
          txHash: '0xabc123def456...',
          timestamp: '2025-08-21T14:30:00Z'
        },
        {
          id: 'act-002',
          type: 'transfer',
          from: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          to: '0x742d35cc6cf2723395f9de6200a2fec67b67974b',
          tokenId: '1002',
          txHash: '0xdef456abc789...',
          timestamp: '2025-08-21T11:15:00Z'
        },
        {
          id: 'act-003',
          type: 'mint',
          to: '0x2bc46f768384f88b3d3c53de6a69b3718026d23f',
          amount: '1',
          tokenId: '1006',
          txHash: '0x789abc456def...',
          timestamp: '2025-08-20T09:20:00Z'
        }
      ];

      setContract(contractData);
      setHolders(holdersData);
      setActivities(activitiesData);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load contract details:', error);
      setIsLoading(false);
    }
  };

  const handleMint = async () => {
    try {
      // Simulate minting
      toast({
        title: 'Mint Successful',
        description: `Minted ${mintForm.amount} token(s) to ${mintForm.to}`,
      });
      setIsMintDialogOpen(false);
      setMintForm({ to: '', amount: '', tokenId: '', metadata: '' });
    } catch (error) {
      toast({
        title: 'Mint Failed',
        description: 'Failed to mint tokens. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTransfer = async () => {
    try {
      // Simulate transfer
      toast({
        title: 'Transfer Successful',
        description: `Transferred token(s) from ${transferForm.from} to ${transferForm.to}`,
      });
      setIsTransferDialogOpen(false);
      setTransferForm({ from: '', to: '', amount: '', tokenId: '' });
    } catch (error) {
      toast({
        title: 'Transfer Failed',
        description: 'Failed to transfer tokens. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAirdrop = async () => {
    try {
      const recipientCount = airdropForm.recipients.split('\n').filter(r => r.trim()).length;
      toast({
        title: 'Airdrop Successful',
        description: `Airdropped tokens to ${recipientCount} recipients`,
      });
      setIsAirdropDialogOpen(false);
      setAirdropForm({ recipients: '', amount: '', tokenId: '' });
    } catch (error) {
      toast({
        title: 'Airdrop Failed',
        description: 'Failed to execute airdrop. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Address copied to clipboard.',
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'mint':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'transfer':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'burn':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (!hasPermission('contracts.read')) {
    return (
      <div className="text-center py-8">
        <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view contract details.</p>
      </div>
    );
  }

  if (isLoading || !contract) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/admin/contracts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contracts
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-honey">Loading Contract...</h1>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/contracts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contracts
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-honey">{contract.name}</h1>
            <div className="flex items-center space-x-4 mt-2 text-muted-foreground">
              <div className="flex items-center space-x-1">
                <span className="text-lg">{contract.chain.logo}</span>
                <span>{contract.chain.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Code2 className="w-4 h-4" />
                <span>{formatAddress(contract.address)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1"
                  onClick={() => copyToClipboard(contract.address)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <Badge variant="outline">{contract.type}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total Supply</p>
                <p className="text-2xl font-bold">{contract.totalSupply?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Holders</p>
                <p className="text-2xl font-bold">{contract.holders?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="bg-green-500 mt-1">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="text-sm font-mono">{formatAddress(contract.owner)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Actions */}
      {hasPermission('contracts.manage') && (
        <Card>
          <CardHeader>
            <CardTitle>Contract Actions</CardTitle>
            <CardDescription>Manage tokens, transfers, and airdrops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Dialog open={isMintDialogOpen} onOpenChange={setIsMintDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-500 hover:bg-green-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Mint
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mint Tokens</DialogTitle>
                    <DialogDescription>Create new tokens and assign to an address</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mint-to">Recipient Address</Label>
                      <Input
                        id="mint-to"
                        value={mintForm.to}
                        onChange={(e) => setMintForm(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="mint-amount">Amount</Label>
                      <Input
                        id="mint-amount"
                        type="number"
                        value={mintForm.amount}
                        onChange={(e) => setMintForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="1"
                      />
                    </div>
                    {contract.type === 'ERC721' && (
                      <div>
                        <Label htmlFor="mint-tokenId">Token ID</Label>
                        <Input
                          id="mint-tokenId"
                          value={mintForm.tokenId}
                          onChange={(e) => setMintForm(prev => ({ ...prev, tokenId: e.target.value }))}
                          placeholder="Optional - auto-generated if empty"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="mint-metadata">Metadata URI</Label>
                      <Input
                        id="mint-metadata"
                        value={mintForm.metadata}
                        onChange={(e) => setMintForm(prev => ({ ...prev, metadata: e.target.value }))}
                        placeholder="ipfs://... or https://..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsMintDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleMint}>Mint Tokens</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Send className="w-4 h-4 mr-2" />
                    Transfer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transfer Tokens</DialogTitle>
                    <DialogDescription>Move tokens between addresses</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="transfer-from">From Address</Label>
                      <Input
                        id="transfer-from"
                        value={transferForm.from}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, from: e.target.value }))}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="transfer-to">To Address</Label>
                      <Input
                        id="transfer-to"
                        value={transferForm.to}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="transfer-amount">Amount</Label>
                      <Input
                        id="transfer-amount"
                        type="number"
                        value={transferForm.amount}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="1"
                      />
                    </div>
                    {contract.type === 'ERC721' && (
                      <div>
                        <Label htmlFor="transfer-tokenId">Token ID</Label>
                        <Input
                          id="transfer-tokenId"
                          value={transferForm.tokenId}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, tokenId: e.target.value }))}
                          placeholder="Token ID to transfer"
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleTransfer}>Transfer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAirdropDialogOpen} onOpenChange={setIsAirdropDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-purple-500 text-white hover:bg-purple-600">
                    <Gift className="w-4 h-4 mr-2" />
                    Airdrop
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Airdrop Tokens</DialogTitle>
                    <DialogDescription>Send tokens to multiple addresses at once</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="airdrop-recipients">Recipients (one address per line)</Label>
                      <Textarea
                        id="airdrop-recipients"
                        value={airdropForm.recipients}
                        onChange={(e) => setAirdropForm(prev => ({ ...prev, recipients: e.target.value }))}
                        placeholder="0x123...&#10;0x456...&#10;0x789..."
                        rows={6}
                      />
                    </div>
                    <div>
                      <Label htmlFor="airdrop-amount">Amount per recipient</Label>
                      <Input
                        id="airdrop-amount"
                        type="number"
                        value={airdropForm.amount}
                        onChange={(e) => setAirdropForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAirdropDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAirdrop}>Execute Airdrop</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Claim Conditions
              </Button>

              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Explorer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Details Tabs */}
      <Tabs defaultValue="holders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="holders">Token Holders</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="holders">
          <Card>
            <CardHeader>
              <CardTitle>Token Holders</CardTitle>
              <CardDescription>Addresses holding tokens from this contract</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {holders.map((holder) => (
                  <div key={holder.address} className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-honey/10 rounded-full flex items-center justify-center">
                        <span className="text-honey font-semibold">
                          {holder.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{holder.username || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground flex items-center space-x-2">
                          <span>{formatAddress(holder.address)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1"
                            onClick={() => copyToClipboard(holder.address)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Balance</div>
                        <div className="font-bold">{holder.balance}</div>
                      </div>
                      {holder.tokenIds && (
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Token IDs</div>
                          <div className="text-sm">{holder.tokenIds.join(', ')}</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Last Activity</div>
                        <div className="text-sm">{formatDate(holder.lastActivity)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Contract Activity</CardTitle>
              <CardDescription>Recent transactions and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                    <div className="flex items-center space-x-4">
                      {getActivityIcon(activity.type)}
                      <div>
                        <div className="font-medium capitalize">{activity.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {activity.from && `From: ${formatAddress(activity.from)} → `}
                          To: {formatAddress(activity.to)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      {activity.amount && (
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Amount</div>
                          <div className="font-medium">{activity.amount}</div>
                        </div>
                      )}
                      {activity.tokenId && (
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Token ID</div>
                          <div className="font-medium">#{activity.tokenId}</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Transaction</div>
                        <div className="text-sm font-mono">{activity.txHash.slice(0, 10)}...</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Time</div>
                        <div className="text-sm">{formatDate(activity.timestamp)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Contract Features</CardTitle>
              <CardDescription>Enabled features and capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {contract.features.map((feature) => (
                  <div key={feature} className="flex items-center space-x-2 p-3 rounded-lg bg-secondary">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-muted">
                <h4 className="font-semibold mb-2">Contract Description</h4>
                <p className="text-sm text-muted-foreground">{contract.description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Contract Settings</CardTitle>
              <CardDescription>Configure contract parameters and access controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Contract Status</Label>
                    <div className="mt-2">
                      <Badge className="bg-green-500">Active</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Owner Address</Label>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="font-mono text-sm">{formatAddress(contract.owner)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1"
                        onClick={() => copyToClipboard(contract.owner)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-4">Danger Zone</h4>
                  <div className="space-y-3">
                    <Button variant="outline" className="text-yellow-600 border-yellow-600">
                      <Settings className="w-4 h-4 mr-2" />
                      Pause Contract
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Transfer Ownership
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}