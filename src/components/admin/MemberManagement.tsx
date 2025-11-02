import React, { useState } from 'react';
import {
  useMember,
  useMembers,
  useMemberLayerInfo,
  useSearchMembers,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  CreateMemberData,
  UpdateMemberData
} from '../../hooks/useMemberAPI';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Users, Search, Plus, Edit, Trash2 } from 'lucide-react';

/**
 * 成员管理组件
 * 演示如何使用 useMemberAPI hooks
 */

export default function MemberManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Query hooks
  const { data: membersData, isLoading: loadingMembers } = useMembers({
    limit: pageSize,
    offset: page * pageSize
  });
  const { data: searchResults } = useSearchMembers(searchTerm);
  const { data: selectedMember } = useMember(selectedWallet);
  const { data: layerInfo } = useMemberLayerInfo(selectedWallet);

  // Mutation hooks
  const createMember = useCreateMember();
  const updateMember = useUpdateMember(selectedWallet || '');
  const deleteMember = useDeleteMember();

  // ============================================
  // Handlers
  // ============================================
  const handleCreateMember = () => {
    const newMemberData: CreateMemberData = {
      wallet_address: '0x' + '0'.repeat(40), // 示例地址
      username: 'New Member',
      referrer_wallet: undefined
    };

    createMember.mutate(newMemberData);
  };

  const handleUpdateMember = () => {
    if (!selectedWallet) return;

    const updateData: UpdateMemberData = {
      username: 'Updated Name'
    };

    updateMember.mutate(updateData);
  };

  const handleDeleteMember = (walletAddress: string) => {
    if (confirm(`Are you sure you want to delete member ${walletAddress}?`)) {
      deleteMember.mutate(walletAddress);
    }
  };

  // ============================================
  // Render
  // ============================================
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" />
          Member Management
        </h1>
        <Button onClick={handleCreateMember} disabled={createMember.isPending}>
          <Plus className="w-4 h-4 mr-2" />
          Create Member
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by wallet address or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchTerm.length >= 3 && searchResults && searchResults.length > 0 && (
            <div className="mt-4 border rounded-lg divide-y">
              {searchResults.map((member) => (
                <div
                  key={member.wallet_address}
                  className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                  onClick={() => setSelectedWallet(member.wallet_address)}
                >
                  <div>
                    <p className="font-medium">{member.member_username || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground">{member.wallet_address}</p>
                  </div>
                  <Badge variant={member.is_active ? 'default' : 'secondary'}>
                    Level {member.current_level}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Members ({membersData?.total || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMembers ? (
              <div className="text-center py-8">Loading members...</div>
            ) : (
              <>
                <div className="space-y-2">
                  {membersData?.members.map((member) => (
                    <div
                      key={member.wallet_address}
                      className="p-4 border rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => setSelectedWallet(member.wallet_address)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {member.member_username || 'Unnamed'}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              #{member.activation_sequence}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.wallet_address}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.is_active ? 'default' : 'secondary'}>
                            L{member.current_level}
                          </Badge>
                          {member.layer_level && (
                            <Badge variant="outline">Layer {member.layer_level}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {Math.ceil((membersData?.total || 0) / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * pageSize >= (membersData?.total || 0)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Member Details */}
        <Card>
          <CardHeader>
            <CardTitle>Member Details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedWallet ? (
              <div className="text-center text-muted-foreground py-8">
                Select a member to view details
              </div>
            ) : selectedMember ? (
              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <label className="text-xs text-muted-foreground">Username</label>
                  <p className="font-medium">{selectedMember.member_username || 'Unnamed'}</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Wallet Address</label>
                  <p className="text-sm font-mono break-all">{selectedMember.wallet_address}</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Current Level</label>
                  <p className="font-medium">Level {selectedMember.current_level}</p>
                </div>

                {/* Layer Info */}
                {layerInfo && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">Matrix Position</label>
                      <div className="flex gap-2 items-center">
                        {layerInfo.layer_level && (
                          <Badge>Layer {layerInfo.layer_level}</Badge>
                        )}
                        {layerInfo.position && (
                          <Badge variant="outline">{layerInfo.position}</Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Direct Children</label>
                      <p className="font-medium">{layerInfo.children_count}</p>
                      {layerInfo.direct_children.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {layerInfo.direct_children.map(child => (
                            <div key={child.wallet_address} className="text-xs flex items-center gap-2">
                              <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                                {child.position}
                              </Badge>
                              <span className="truncate">{child.username || child.wallet_address.slice(0, 10)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateMember}
                    disabled={updateMember.isPending}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Update
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteMember(selectedWallet)}
                    disabled={deleteMember.isPending}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Loading member details...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
