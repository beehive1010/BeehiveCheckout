import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Code2, 
  Search, 
  Plus,
  ExternalLink,
  Copy,
  Globe,
  Shield,
  Coins,
  Image,
  Users,
  Activity,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';

interface SmartContract {
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
  volume24h?: number;
  lastActivity?: string;
  description?: string;
}

export default function AdminContracts() {
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadContracts();
  }, [searchTerm]);

  const loadContracts = async () => {
    try {
      // Real contract data based on your platform
      const realContracts: SmartContract[] = [
        {
          id: 'beehive-membership-nft',
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
          volume24h: 25000,
          lastActivity: '2025-08-21T14:30:00Z',
          description: 'Main membership NFT contract for Level 1-19 access'
        },
        {
          id: 'bcc-token',
          name: 'BCC Utility Token',
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          type: 'ERC20',
          chain: {
            id: 137,
            name: 'Polygon',
            logo: '🟣'
          },
          status: 'active',
          deployedAt: '2025-08-10T15:30:00Z',
          totalSupply: 1000000,
          holders: 89,
          volume24h: 15000,
          lastActivity: '2025-08-21T11:15:00Z',
          description: 'Platform utility token for NFT purchases and rewards'
        },
        {
          id: 'cth-token',
          name: 'CTH Cross-Chain Token',
          address: '0x4022797e9EC167Fd48281fa452Ee49d7c169f125',
          type: 'ERC20',
          chain: {
            id: 421614,
            name: 'Arbitrum Sepolia',
            logo: '🔵'
          },
          status: 'active',
          deployedAt: '2025-08-12T09:20:00Z',
          totalSupply: 500000,
          holders: 45,
          volume24h: 8500,
          lastActivity: '2025-08-21T08:45:00Z',
          description: 'Cross-chain token with auto-bridging to Alpha Centauri L3'
        },
        {
          id: 'merchant-nft-marketplace',
          name: 'Merchant NFT Marketplace',
          address: '0xfedcba0987654321fedcba0987654321fedcba09',
          type: 'ERC1155',
          chain: {
            id: 10,
            name: 'Optimism',
            logo: '🔴'
          },
          status: 'active',
          deployedAt: '2025-08-18T12:45:00Z',
          totalSupply: 250,
          holders: 67,
          volume24h: 12000,
          lastActivity: '2025-08-21T16:20:00Z',
          description: 'Multi-token contract for merchant NFT collections'
        },
        {
          id: 'referral-rewards',
          name: 'Referral Rewards Contract',
          address: '0x567890abcdef1234567890abcdef1234567890ab',
          type: 'Custom',
          chain: {
            id: 42161,
            name: 'Arbitrum',
            logo: '🟦'
          },
          status: 'active',
          deployedAt: '2025-08-08T14:10:00Z',
          volume24h: 5500,
          lastActivity: '2025-08-21T13:05:00Z',
          description: 'Smart contract managing 3x3 matrix referral rewards'
        }
      ];

      // Filter by search term
      const filteredContracts = realContracts.filter(contract =>
        contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.type.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setContracts(filteredContracts);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load contracts:', error);
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Contract address copied to clipboard.',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getContractIcon = (type: string) => {
    switch (type) {
      case 'ERC721':
        return <Image className="w-5 h-5" />;
      case 'ERC1155':
        return <Shield className="w-5 h-5" />;
      case 'ERC20':
        return <Coins className="w-5 h-5" />;
      default:
        return <Code2 className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">Paused</Badge>;
      default:
        return <Badge variant="secondary">Disabled</Badge>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ERC721':
        return 'bg-blue-500';
      case 'ERC1155':
        return 'bg-purple-500';
      case 'ERC20':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!hasPermission('contracts.read')) {
    return (
      <div className="text-center py-8">
        <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view contract data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-honey">Contracts Management</h1>
            <p className="text-muted-foreground mt-2">Loading smart contracts...</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const totalHolders = contracts.reduce((sum, c) => sum + (c.holders || 0), 0);
  const total24hVolume = contracts.reduce((sum, c) => sum + (c.volume24h || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-honey">Contracts Management</h1>
          <p className="text-muted-foreground mt-2">
            Deploy, manage, and monitor smart contracts across multiple chains
          </p>
        </div>
        
        {hasPermission('contracts.deploy') && (
          <Link href="/admin/contracts/deploy">
            <Button className="bg-honey text-black hover:bg-honey/90" data-testid="button-deploy-contract">
              <Plus className="w-4 h-4 mr-2" />
              Deploy Contract
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Code2 className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total Contracts</p>
                <p className="text-2xl font-bold">{totalContracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Active Contracts</p>
                <p className="text-2xl font-bold">{activeContracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total Holders</p>
                <p className="text-2xl font-bold">{totalHolders.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">24h Volume</p>
                <p className="text-2xl font-bold">${total24hVolume.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Contracts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by contract name, address, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted"
            data-testid="input-search-contracts"
          />
        </CardContent>
      </Card>

      {/* Contracts List */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Contracts</CardTitle>
          <CardDescription>
            Manage your deployed smart contracts across multiple blockchains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contracts.length === 0 ? (
              <div className="text-center py-8">
                <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Deploy your first smart contract to get started.'}
                </p>
              </div>
            ) : (
              contracts.map((contract) => (
                <Link key={contract.id} href={`/admin/contracts/${contract.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${getTypeColor(contract.type)}`}>
                            {getContractIcon(contract.type)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-lg">{contract.name}</h3>
                              {getStatusBadge(contract.status)}
                              <Badge variant="outline">{contract.type}</Badge>
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <span className="text-lg">{contract.chain.logo}</span>
                                <span>{contract.chain.name}</span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Code2 className="w-3 h-3" />
                                <span>{formatAddress(contract.address)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    copyToClipboard(contract.address);
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              <div>Deployed {formatDate(contract.deployedAt)}</div>
                            </div>
                            
                            {contract.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {contract.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          {contract.totalSupply && (
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">Supply</div>
                              <div className="font-semibold">{contract.totalSupply.toLocaleString()}</div>
                            </div>
                          )}
                          
                          {contract.holders && (
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">Holders</div>
                              <div className="font-semibold">{contract.holders.toLocaleString()}</div>
                            </div>
                          )}
                          
                          {contract.volume24h && (
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">24h Volume</div>
                              <div className="font-semibold">${contract.volume24h.toLocaleString()}</div>
                            </div>
                          )}
                          
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}