import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useWallet } from '../hooks/useWallet';
import { UserPhotoUpload } from '../components/profile/UserPhotoUpload';
import { MerchantPhotoUpload } from '../components/merchant/MerchantPhotoUpload';
import { PhotoUpload } from '../components/shared/PhotoUpload';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Camera, Store, Upload, Image as ImageIcon } from 'lucide-react';

export default function PhotoUploadDemo() {
  const { t } = useI18n();
  const { walletAddress } = useWallet();
  
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [merchantPhotos, setMerchantPhotos] = useState<any[]>([]);
  const [generalUploads, setGeneralUploads] = useState<string[]>([]);

  const handleGeneralUpload = (url: string, fileName: string) => {
    setGeneralUploads(prev => [...prev, url]);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-honey mb-3 bg-gradient-to-r from-honey via-honey/90 to-honey/70 bg-clip-text text-transparent">
          Photo Upload System
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Comprehensive photo upload system using Supabase Storage with S3 backend. Upload user avatars, merchant photos, and general images.
        </p>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 mt-4">
          <Badge variant={walletAddress ? "default" : "destructive"}>
            {walletAddress ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Wallet not connected"}
          </Badge>
          <Badge variant="outline" className="bg-green-500/10 text-green-400">
            Supabase Storage Ready
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="user-avatar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="user-avatar" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            User Avatar
          </TabsTrigger>
          <TabsTrigger value="merchant-photos" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Merchant Photos
          </TabsTrigger>
          <TabsTrigger value="general-upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            General Upload
          </TabsTrigger>
          <TabsTrigger value="storage-info" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Storage Info
          </TabsTrigger>
        </TabsList>

        {/* User Avatar Tab */}
        <TabsContent value="user-avatar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserPhotoUpload
              currentAvatarUrl={userAvatar}
              onAvatarUpdate={setUserAvatar}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Avatar Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-muted mx-auto">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt="User Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {userAvatar ? 'Avatar uploaded successfully' : 'No avatar uploaded yet'}
                  </p>
                  {userAvatar && (
                    <p className="text-xs text-muted-foreground text-center break-all">
                      URL: {userAvatar}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Merchant Photos Tab */}
        <TabsContent value="merchant-photos" className="space-y-6">
          <MerchantPhotoUpload
            merchantId={walletAddress || 'demo'}
            currentPhotos={merchantPhotos}
            onPhotosUpdate={setMerchantPhotos}
            maxPhotos={8}
            allowedTypes={['logo', 'banner', 'product', 'gallery']}
          />
        </TabsContent>

        {/* General Upload Tab */}
        <TabsContent value="general-upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>General Photo Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUpload
                  bucket="uploads"
                  folder="general"
                  maxFileSize={10}
                  allowedTypes={['image/jpeg', 'image/png', 'image/webp', 'image/gif']}
                  onUploadSuccess={handleGeneralUpload}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uploaded Images ({generalUploads.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {generalUploads.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {generalUploads.slice(-4).map((url, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No images uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Storage Info Tab */}
        <TabsContent value="storage-info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Storage Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Region:</span>
                    <Badge variant="outline" className="ml-2">ap-southeast-1</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Bucket:</span>
                    <Badge variant="outline" className="ml-2">uploads</Badge>
                  </div>
                  <div>
                    <span className="font-medium">S3 Endpoint:</span>
                    <p className="text-xs text-muted-foreground mt-1 break-all">
                      https://cvqibjcbfrwsgkvthccp.storage.supabase.co
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Access Key:</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      e3206d399df281f9040b15a844308816
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Max File Size:</span>
                    <Badge variant="outline">10MB</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Supported Formats:</span>
                    <Badge variant="outline">JPEG, PNG, WebP</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Drag & Drop:</span>
                    <Badge className="bg-green-500/20 text-green-400">✓ Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Preview:</span>
                    <Badge className="bg-green-500/20 text-green-400">✓ Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Auto Upload:</span>
                    <Badge className="bg-green-500/20 text-green-400">✓ Enabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Folders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <span>/avatars/</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-400" />
                    <span>/merchants/</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-green-400" />
                    <span>/general/</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-orange-400" />
                    <span>/nfts/</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{userAvatar ? 1 : 0}</div>
                  <div className="text-sm text-muted-foreground">User Avatar</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{merchantPhotos.length}</div>
                  <div className="text-sm text-muted-foreground">Merchant Photos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{generalUploads.length}</div>
                  <div className="text-sm text-muted-foreground">General Uploads</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-honey">
                    {(userAvatar ? 1 : 0) + merchantPhotos.length + generalUploads.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Files</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}