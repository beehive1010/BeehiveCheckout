import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Progress } from '../../components/ui/progress';
import { 
  ArrowLeft,
  Code2, 
  Zap,
  CheckCircle,
  AlertCircle,
  Image,
  Coins,
  Shield,
  Settings,
  ExternalLink,
  Copy
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';

interface NFTType {
  id: string;
  name: string;
  description: string;
  features: string[];
  useCase: string;
  icon: React.ReactNode;
}

interface Chain {
  id: number;
  name: string;
  logo: string;
  gasToken: string;
  averageGas: string;
  deploymentCost: string;
}

interface DeploymentForm {
  nftType: string;
  chainId: number;
  name: string;
  symbol: string;
  description: string;
  baseUri: string;
  maxSupply: string;
  mintPrice: string;
  royaltyPercentage: string;
  royaltyRecipient: string;
  features: {
    mintable: boolean;
    burnable: boolean;
    pausable: boolean;
    accessControl: boolean;
    royalties: boolean;
    batchMint: boolean;
  };
}

export default function AdminContractDeploy() {
  const [, setLocation] = useLocation();
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deployedContract, setDeployedContract] = useState<{
    address: string;
    txHash: string;
    explorerUrl: string;
  } | null>(null);

  const [form, setForm] = useState<DeploymentForm>({
    nftType: '',
    chainId: 0,
    name: '',
    symbol: '',
    description: '',
    baseUri: '',
    maxSupply: '',
    mintPrice: '',
    royaltyPercentage: '5',
    royaltyRecipient: '',
    features: {
      mintable: true,
      burnable: false,
      pausable: true,
      accessControl: true,
      royalties: true,
      batchMint: false,
    }
  });

  const nftTypes: NFTType[] = [
    {
      id: 'erc721-standard',
      name: 'ERC-721 Standard',
      description: 'Standard non-fungible token contract with basic features',
      features: ['Unique tokens', 'Transfer', 'Approve', 'Metadata'],
      useCase: 'Art, Collectibles, Membership',
      icon: <Image className="w-6 h-6" />
    },
    {
      id: 'erc721-drop',
      name: 'ERC-721 Drop',
      description: 'NFT drop contract with claim conditions and phases',
      features: ['Claim phases', 'Allowlists', 'Public sale', 'Delayed reveal'],
      useCase: 'NFT Launches, Drops',
      icon: <Zap className="w-6 h-6" />
    },
    {
      id: 'erc1155-standard',
      name: 'ERC-1155 Multi-Token',
      description: 'Multi-token standard supporting both NFTs and fungible tokens',
      features: ['Multiple token types', 'Batch operations', 'Efficient transfers'],
      useCase: 'Gaming, Utility tokens',
      icon: <Shield className="w-6 h-6" />
    },
    {
      id: 'erc20-token',
      name: 'ERC-20 Token',
      description: 'Fungible token standard for utility and governance tokens',
      features: ['Transferable', 'Divisible', 'Supply management'],
      useCase: 'Utility, Governance, Rewards',
      icon: <Coins className="w-6 h-6" />
    }
  ];

  const chains: Chain[] = [
    {
      id: 1,
      name: 'Ethereum',
      logo: '🔷',
      gasToken: 'ETH',
      averageGas: '~$15-50',
      deploymentCost: '~$30-100'
    },
    {
      id: 137,
      name: 'Polygon',
      logo: '🟣',
      gasToken: 'MATIC',
      averageGas: '~$0.01-0.05',
      deploymentCost: '~$0.02-0.10'
    },
    {
      id: 42161,
      name: 'Arbitrum',
      logo: '🟦',
      gasToken: 'ETH',
      averageGas: '~$0.50-2',
      deploymentCost: '~$1-5'
    },
    {
      id: 10,
      name: 'Optimism',
      logo: '🔴',
      gasToken: 'ETH',
      averageGas: '~$0.50-2',
      deploymentCost: '~$1-5'
    },
    {
      id: 56,
      name: 'BNB Chain',
      logo: '🟡',
      gasToken: 'BNB',
      averageGas: '~$0.10-0.50',
      deploymentCost: '~$0.20-1'
    },
    {
      id: 421614,
      name: 'Arbitrum Sepolia',
      logo: '🔵',
      gasToken: 'ETH',
      averageGas: '~$0.001',
      deploymentCost: '~$0.002'
    }
  ];

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentProgress(0);

    try {
      // Simulate deployment process
      const steps = [
        { progress: 20, message: 'Preparing contract bytecode...' },
        { progress: 40, message: 'Connecting to blockchain...' },
        { progress: 60, message: 'Submitting transaction...' },
        { progress: 80, message: 'Waiting for confirmation...' },
        { progress: 100, message: 'Contract deployed successfully!' }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setDeploymentProgress(step.progress);
        
        toast({
          title: 'Deployment Progress',
          description: step.message,
        });
      }

      // Simulate successful deployment
      const mockDeployment = {
        address: '0xabc123def456789abc123def456789abc123def45',
        txHash: '0x123abc456def789123abc456def789123abc456def789123abc456def789123abc',
        explorerUrl: `https://etherscan.io/tx/0x123abc456def789123abc456def789123abc456def789123abc456def789123abc`
      };

      setDeployedContract(mockDeployment);
      setCurrentStep(4);

      toast({
        title: 'Deployment Successful!',
        description: `Contract deployed at ${mockDeployment.address}`,
      });

    } catch (error) {
      toast({
        title: 'Deployment Failed',
        description: 'Failed to deploy contract. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Address copied to clipboard.',
    });
  };

  const getSelectedNFTType = () => {
    return nftTypes.find(type => type.id === form.nftType);
  };

  const getSelectedChain = () => {
    return chains.find(chain => chain.id === form.chainId);
  };

  if (!hasPermission('contracts.deploy')) {
    return (
      <div className="text-center py-8">
        <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to deploy contracts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/admin/contracts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contracts
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-honey">Deploy Smart Contract</h1>
          <p className="text-muted-foreground mt-2">
            Create and deploy smart contracts using Thirdweb SDK
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-honey' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-honey bg-honey text-black' : 'border-muted'}`}>
                1
              </div>
              <span className="font-medium">Choose NFT Type</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-honey' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-honey bg-honey text-black' : 'border-muted'}`}>
                2
              </div>
              <span className="font-medium">Select Chain</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-honey' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 3 ? 'border-honey bg-honey text-black' : 'border-muted'}`}>
                3
              </div>
              <span className="font-medium">Contract Details</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${currentStep >= 4 ? 'text-honey' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 4 ? 'border-honey bg-honey text-black' : 'border-muted'}`}>
                4
              </div>
              <span className="font-medium">Deploy</span>
            </div>
          </div>
          
          <Progress value={(currentStep / 4) * 100} className="w-full" />
        </CardContent>
      </Card>

      {/* Step 1: Choose NFT Type */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose NFT Type</CardTitle>
            <CardDescription>Select the type of smart contract you want to deploy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nftTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    form.nftType === type.id ? 'ring-2 ring-honey border-honey' : ''
                  }`}
                  onClick={() => setForm(prev => ({ ...prev, nftType: type.id }))}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-honey/10 rounded-lg flex items-center justify-center text-honey">
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{type.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{type.description}</p>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Features:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {type.features.map((feature) => (
                                <Badge key={feature} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Use Case:</span>
                            <span className="text-xs ml-2">{type.useCase}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-end mt-6">
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!form.nftType}
                className="bg-honey text-black hover:bg-honey/90"
              >
                Next: Select Chain
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Chain */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Blockchain</CardTitle>
            <CardDescription>Choose the blockchain network to deploy your contract</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chains.map((chain) => (
                <Card
                  key={chain.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    form.chainId === chain.id ? 'ring-2 ring-honey border-honey' : ''
                  }`}
                  onClick={() => setForm(prev => ({ ...prev, chainId: chain.id }))}
                >
                  <CardContent className="p-6">
                    <div className="text-center space-y-3">
                      <div className="text-4xl">{chain.logo}</div>
                      <h3 className="font-semibold text-lg">{chain.name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gas Token:</span>
                          <span>{chain.gasToken}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Gas:</span>
                          <span>{chain.averageGas}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Deploy Cost:</span>
                          <span className="text-honey font-medium">{chain.deploymentCost}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)}
                disabled={!form.chainId}
                className="bg-honey text-black hover:bg-honey/90"
              >
                Next: Contract Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Contract Details */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Information</CardTitle>
              <CardDescription>Configure your smart contract parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Contract Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My NFT Collection"
                  />
                </div>
                <div>
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    value={form.symbol}
                    onChange={(e) => setForm(prev => ({ ...prev, symbol: e.target.value }))}
                    placeholder="MNC"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your NFT collection..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="baseUri">Base URI</Label>
                <Input
                  id="baseUri"
                  value={form.baseUri}
                  onChange={(e) => setForm(prev => ({ ...prev, baseUri: e.target.value }))}
                  placeholder="ipfs://QmYourMetadataHash/ or https://api.yoursite.com/metadata/"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxSupply">Max Supply</Label>
                  <Input
                    id="maxSupply"
                    type="number"
                    value={form.maxSupply}
                    onChange={(e) => setForm(prev => ({ ...prev, maxSupply: e.target.value }))}
                    placeholder="10000"
                  />
                </div>
                <div>
                  <Label htmlFor="mintPrice">Mint Price (ETH)</Label>
                  <Input
                    id="mintPrice"
                    value={form.mintPrice}
                    onChange={(e) => setForm(prev => ({ ...prev, mintPrice: e.target.value }))}
                    placeholder="0.01"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="royaltyPercentage">Royalty Percentage (%)</Label>
                  <Input
                    id="royaltyPercentage"
                    type="number"
                    value={form.royaltyPercentage}
                    onChange={(e) => setForm(prev => ({ ...prev, royaltyPercentage: e.target.value }))}
                    placeholder="5"
                    max="10"
                  />
                </div>
                <div>
                  <Label htmlFor="royaltyRecipient">Royalty Recipient</Label>
                  <Input
                    id="royaltyRecipient"
                    value={form.royaltyRecipient}
                    onChange={(e) => setForm(prev => ({ ...prev, royaltyRecipient: e.target.value }))}
                    placeholder="0x..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Contract Features</CardTitle>
              <CardDescription>Enable additional features for your contract</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mintable</Label>
                      <p className="text-sm text-muted-foreground">Allow minting new tokens</p>
                    </div>
                    <Switch
                      checked={form.features.mintable}
                      onCheckedChange={(checked) => 
                        setForm(prev => ({ ...prev, features: { ...prev.features, mintable: checked } }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Burnable</Label>
                      <p className="text-sm text-muted-foreground">Allow burning tokens</p>
                    </div>
                    <Switch
                      checked={form.features.burnable}
                      onCheckedChange={(checked) => 
                        setForm(prev => ({ ...prev, features: { ...prev.features, burnable: checked } }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Pausable</Label>
                      <p className="text-sm text-muted-foreground">Allow pausing contract</p>
                    </div>
                    <Switch
                      checked={form.features.pausable}
                      onCheckedChange={(checked) => 
                        setForm(prev => ({ ...prev, features: { ...prev.features, pausable: checked } }))
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Access Control</Label>
                      <p className="text-sm text-muted-foreground">Role-based permissions</p>
                    </div>
                    <Switch
                      checked={form.features.accessControl}
                      onCheckedChange={(checked) => 
                        setForm(prev => ({ ...prev, features: { ...prev.features, accessControl: checked } }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Royalties</Label>
                      <p className="text-sm text-muted-foreground">EIP-2981 royalty standard</p>
                    </div>
                    <Switch
                      checked={form.features.royalties}
                      onCheckedChange={(checked) => 
                        setForm(prev => ({ ...prev, features: { ...prev.features, royalties: checked } }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Batch Mint</Label>
                      <p className="text-sm text-muted-foreground">Mint multiple tokens at once</p>
                    </div>
                    <Switch
                      checked={form.features.batchMint}
                      onCheckedChange={(checked) => 
                        setForm(prev => ({ ...prev, features: { ...prev.features, batchMint: checked } }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Back
            </Button>
            <Button 
              onClick={handleDeploy}
              disabled={!form.name || !form.symbol || isDeploying}
              className="bg-honey text-black hover:bg-honey/90"
            >
              {isDeploying ? 'Deploying...' : 'Deploy Contract'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Deploy Progress & Results */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {deployedContract ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              )}
              <span>{deployedContract ? 'Deployment Successful!' : 'Deploying Contract...'}</span>
            </CardTitle>
            <CardDescription>
              {deployedContract 
                ? 'Your smart contract has been deployed successfully'
                : 'Please wait while your contract is being deployed to the blockchain'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isDeploying && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Deployment Progress</span>
                  <span className="text-sm font-medium">{deploymentProgress}%</span>
                </div>
                <Progress value={deploymentProgress} className="w-full" />
              </div>
            )}
            
            {deployedContract && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Contract Address</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={deployedContract.address} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(deployedContract.address)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Transaction Hash</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={deployedContract.txHash} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(deployedContract.txHash)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Deployment Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Contract Type:</span>
                      <span className="ml-2">{getSelectedNFTType()?.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Blockchain:</span>
                      <span className="ml-2">{getSelectedChain()?.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2">{form.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Symbol:</span>
                      <span className="ml-2">{form.symbol}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={() => window.open(deployedContract.explorerUrl, '_blank')}
                    variant="outline"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Explorer
                  </Button>
                  
                  <Button
                    onClick={() => setLocation(`/admin/contracts/${deployedContract.address}`)}
                    className="bg-honey text-black hover:bg-honey/90"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Contract
                  </Button>
                  
                  <Button
                    onClick={() => setLocation('/admin/contracts')}
                    variant="outline"
                  >
                    View All Contracts
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}