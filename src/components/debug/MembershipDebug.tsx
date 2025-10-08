import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useWeb3 } from '../../contexts/Web3Context';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

/**
 * 诊断组件：显示会员数据加载状态
 *
 * 使用方法：在任何页面添加 <MembershipDebug />
 */
export function MembershipDebug() {
  const { walletAddress, isConnected } = useWeb3();
  const { userStatus, isUserLoading, bccBalance } = useWallet();

  return (
    <Card className="border-2 border-yellow-500">
      <CardHeader>
        <CardTitle className="text-yellow-500">🔍 Membership Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm font-mono">
        {/* 钱包状态 */}
        <div>
          <strong>Wallet Connected:</strong>{' '}
          {isConnected ? (
            <Badge variant="outline" className="bg-green-500/20 text-green-400">✅ Yes</Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/20 text-red-400">❌ No</Badge>
          )}
        </div>

        <div>
          <strong>Wallet Address:</strong>{' '}
          <code className="text-xs">{walletAddress || 'N/A'}</code>
        </div>

        {/* Loading 状态 */}
        <div>
          <strong>Data Loading:</strong>{' '}
          {isUserLoading ? (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400">⏳ Loading...</Badge>
          ) : (
            <Badge variant="outline" className="bg-green-500/20 text-green-400">✅ Loaded</Badge>
          )}
        </div>

        {/* 用户状态 */}
        {userStatus && (
          <>
            <div className="border-t border-yellow-500/30 pt-3 mt-3">
              <strong>User Status:</strong>
            </div>

            <div className="ml-4 space-y-2">
              <div>
                <strong>Registered:</strong>{' '}
                {userStatus.isRegistered ? '✅ Yes' : '❌ No'}
              </div>

              <div>
                <strong>Has NFT:</strong>{' '}
                {userStatus.hasNFT ? '✅ Yes' : '❌ No'}
              </div>

              <div>
                <strong>Is Activated:</strong>{' '}
                {userStatus.isActivated ? '✅ Yes' : '❌ No'}
              </div>

              <div>
                <strong>Is Member:</strong>{' '}
                {userStatus.isMember ? '✅ Yes' : '❌ No'}
              </div>

              <div>
                <strong>Membership Level:</strong>{' '}
                <Badge variant="outline" className="bg-purple-500/20 text-purple-400">
                  Level {userStatus.membershipLevel || 0}
                </Badge>
              </div>

              <div>
                <strong>User Flow:</strong>{' '}
                <code className="text-xs">{userStatus.userFlow}</code>
              </div>
            </div>

            {/* Member Data */}
            {userStatus.memberData && (
              <>
                <div className="border-t border-yellow-500/30 pt-3 mt-3">
                  <strong>Member Data:</strong>
                </div>
                <pre className="ml-4 text-xs overflow-auto bg-black/20 p-2 rounded">
                  {JSON.stringify(userStatus.memberData, null, 2)}
                </pre>
              </>
            )}

            {/* User Data */}
            {userStatus.user && (
              <>
                <div className="border-t border-yellow-500/30 pt-3 mt-3">
                  <strong>User Data:</strong>
                </div>
                <pre className="ml-4 text-xs overflow-auto bg-black/20 p-2 rounded">
                  {JSON.stringify(userStatus.user, null, 2)}
                </pre>
              </>
            )}
          </>
        )}

        {/* BCC Balance */}
        {bccBalance && (
          <>
            <div className="border-t border-yellow-500/30 pt-3 mt-3">
              <strong>BCC Balance:</strong>
            </div>
            <pre className="ml-4 text-xs overflow-auto bg-black/20 p-2 rounded">
              {JSON.stringify(bccBalance, null, 2)}
            </pre>
          </>
        )}

        {/* No Data Warning */}
        {!isUserLoading && !userStatus && (
          <div className="border-t border-red-500/30 pt-3 mt-3">
            <Badge variant="outline" className="bg-red-500/20 text-red-400">
              ⚠️ No user status data available
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
