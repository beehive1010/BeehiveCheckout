import { Level1ClaimWithCheckout } from '../components/membership/Level1ClaimWithCheckout';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Info } from 'lucide-react';

export default function CheckoutTest() {
  const { t } = useI18n();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-honey to-orange-500 bg-clip-text text-transparent">
            Checkout Widget Test
          </h1>
          <p className="text-muted-foreground">
            Testing new payment flow with server-side NFT minting
          </p>
        </div>

        {/* Info Card */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-lg text-blue-400">How it works</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <p className="text-muted-foreground">
                User pays USDT to server wallet using Thirdweb CheckoutWidget
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <p className="text-muted-foreground">
                Payment is verified on-chain by backend
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <p className="text-muted-foreground">
                Server wallet mints NFT via Thirdweb Engine and sends to user
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">4.</span>
              <p className="text-muted-foreground">
                Membership is activated automatically in database
              </p>
            </div>

            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 font-semibold text-xs">
                ✅ Benefits: No gas fees for users, simpler UX, server controls NFT distribution
              </p>
            </div>

            <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 font-semibold text-xs">
                ⚠️ Testing: This is a test branch - comparing with TransactionButton + PayModal approach
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Widget Test */}
        <Level1ClaimWithCheckout
          onSuccess={() => {
            console.log('✅ Checkout test completed successfully!');
          }}
          onError={(error) => {
            console.error('❌ Checkout test failed:', error);
          }}
        />

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="grid grid-cols-2 gap-2">
              <p className="font-semibold">Payment Token:</p>
              <p className="font-mono text-xs">USDT (0xFd08...Cbb9)</p>

              <p className="font-semibold">Server Wallet:</p>
              <p className="font-mono text-xs">{import.meta.env.VITE_SERVER_WALLET_ADDRESS?.slice(0, 10)}...</p>

              <p className="font-semibold">NFT Contract:</p>
              <p className="font-mono text-xs">{import.meta.env.VITE_MEMBERSHIP_NFT_CONTRACT?.slice(0, 10)}...</p>

              <p className="font-semibold">Chain:</p>
              <p>Arbitrum One (42161)</p>

              <p className="font-semibold">Payment Flow:</p>
              <p>Direct payment to server wallet</p>

              <p className="font-semibold">Minting Method:</p>
              <p>Thirdweb Engine (server-side)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
