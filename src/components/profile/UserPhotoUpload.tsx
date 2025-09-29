import React from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { useWallet } from '../../hooks/useWallet';
import { PhotoUpload } from '../shared/PhotoUpload';
import { usePhotoUpload } from '../../hooks/usePhotoUpload';
import { useToast } from '../../hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { User, Camera } from 'lucide-react';

interface UserPhotoUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate?: (newUrl: string) => void;
  className?: string;
  showCard?: boolean;
}

export function UserPhotoUpload({
  currentAvatarUrl,
  onAvatarUpdate,
  className = '',
  showCard = true
}: UserPhotoUploadProps) {
  const { t } = useI18n();
  const { walletAddress } = useWallet();
  const { toast } = useToast();

  const { uploadPhoto, uploading } = usePhotoUpload({
    bucket: 'uploads',
    folder: 'avatars',
    onSuccess: (result) => {
      toast({
        title: '✅ Avatar Updated',
        description: 'Your profile photo has been updated successfully!',
        duration: 3000
      });
      onAvatarUpdate?.(result.url);
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: `Failed to update avatar: ${error}`,
        variant: 'destructive'
      });
    }
  });

  const handleUploadSuccess = async (url: string, fileName: string) => {
    if (!walletAddress) return;

    // Upload and update profile automatically
    const file = new File([], fileName); // This will be handled by PhotoUpload component
    await uploadPhoto(file, true, walletAddress);
  };

  const getInitials = (address?: string): string => {
    if (!address) return 'U';
    return address.slice(0, 2).toUpperCase();
  };

  const content = (
    <div className="space-y-4">
      {/* Current Avatar Display */}
      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20">
          <AvatarImage src={currentAvatarUrl || ''} alt="Profile" />
          <AvatarFallback className="text-lg bg-honey/10 text-honey">
            <User className="w-8 h-8" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-medium text-foreground">Profile Photo</h3>
          <p className="text-sm text-muted-foreground">
            Upload a photo to personalize your profile
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Wallet: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
          </p>
        </div>
      </div>

      {/* Photo Upload Component */}
      <PhotoUpload
        bucket="uploads"
        folder="avatars"
        maxFileSize={3}
        allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
        onUploadSuccess={handleUploadSuccess}
        currentImage={currentAvatarUrl}
        disabled={!walletAddress || uploading}
      />

      {/* Connection Warning */}
      {!walletAddress && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-yellow-400" />
            <p className="text-sm text-yellow-400 font-medium">
              Connect your wallet to upload photos
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-honey" />
          Profile Photo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

export default UserPhotoUpload;