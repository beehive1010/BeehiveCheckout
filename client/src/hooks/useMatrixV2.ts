import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';

// V2 Matrix 相关的类型定义
interface MatrixLayer {
  layer: number;
  memberWallet: string;
  username: string | null;
  position: number;
  positionName: string;
  parentWallet: string | null;
  parentUsername: string | null;
  joinedTreeAt: string;
  ownedLevels: number[];
}

interface MatrixStats {
  globalPosition: number | null;
  matrixLayer: number | null;
  positionInLayer: number | null;
  matrixPositionName: string | null;
  activatedAt: string | null;
  totalLayerPositions: number;
  directReferrals: number;
  totalTeamSize: number;
}

interface MemberLayerView {
  memberWallet: string;
  username: string | null;
  rootWallet: string;
  rootUsername: string | null;
  layer: number;
  position: number;
  positionName: string;
  parentWallet: string | null;
  parentUsername: string | null;
  joinedTreeAt: string;
  layerCapacity: number;
  ownedLevels: number[];
}

// 获取用户的矩阵层级结构
export function useUserMatrixLayers() {
  const { walletAddress } = useWallet();

  return useQuery<MatrixLayer[]>({
    queryKey: ['/api/v2/matrix/layers', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/v2/matrix/layers/${walletAddress}`, {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch matrix layers: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 10000, // 10秒缓存
    refetchInterval: 30000, // 30秒刷新
  });
}

// 获取用户的矩阵统计信息
export function useMatrixStats() {
  const { walletAddress } = useWallet();

  return useQuery<MatrixStats>({
    queryKey: ['/api/v2/matrix/stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');
      const response = await fetch(`/api/v2/matrix/stats/${walletAddress}`, {
        headers: {
          'X-Wallet-Address': walletAddress,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch matrix stats: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 15000, // 15秒缓存
    refetchInterval: 30000, // 30秒刷新
  });
}

// 获取特定用户下的层级成员视图
export function useMemberLayerView(rootWallet?: string) {
  const { walletAddress } = useWallet();
  const targetWallet = rootWallet || walletAddress;

  return useQuery<MemberLayerView[]>({
    queryKey: ['/api/v2/matrix/member-layers', targetWallet],
    queryFn: async () => {
      if (!targetWallet) throw new Error('No wallet address');
      const response = await fetch(`/api/v2/matrix/member-layers/${targetWallet}`, {
        headers: {
          'X-Wallet-Address': walletAddress || '',
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch member layer view: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!targetWallet,
    staleTime: 15000, // 15秒缓存
    refetchInterval: 45000, // 45秒刷新
  });
}