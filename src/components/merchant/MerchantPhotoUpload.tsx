import React, { useState } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { useWallet } from '../../hooks/useWallet';
import { PhotoUpload } from '../shared/PhotoUpload';
import { usePhotoUpload } from '../../hooks/usePhotoUpload';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Store, Plus, X, Image as ImageIcon } from 'lucide-react';

interface MerchantPhoto {
  id: string;
  url: string;
  fileName: string;
  uploadedAt: Date;
  type: 'logo' | 'banner' | 'product' | 'gallery';
}

interface MerchantPhotoUploadProps {
  merchantId?: string;
  currentPhotos?: MerchantPhoto[];
  onPhotosUpdate?: (photos: MerchantPhoto[]) => void;
  className?: string;
  maxPhotos?: number;
  allowedTypes?: ('logo' | 'banner' | 'product' | 'gallery')[];
}

export function MerchantPhotoUpload({
  merchantId,
  currentPhotos = [],
  onPhotosUpdate,
  className = '',
  maxPhotos = 10,
  allowedTypes = ['logo', 'banner', 'product', 'gallery']
}: MerchantPhotoUploadProps) {
  const { t } = useI18n();
  const { walletAddress } = useWallet();
  const { toast } = useToast();
  
  const [photos, setPhotos] = useState<MerchantPhoto[]>(currentPhotos);
  const [activeUploadType, setActiveUploadType] = useState<string>('product');

  const { uploadPhoto, deletePhoto, uploading } = usePhotoUpload({
    bucket: 'uploads',
    folder: `merchants/${merchantId || 'temp'}`,
    onSuccess: (result) => {
      const newPhoto: MerchantPhoto = {
        id: `photo_${Date.now()}`,
        url: result.url,
        fileName: result.fileName,
        uploadedAt: new Date(),
        type: activeUploadType as any
      };

      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);
      onPhotosUpdate?.(updatedPhotos);

      toast({
        title: '✅ Photo Uploaded',
        description: `${activeUploadType} photo uploaded successfully!`,
        duration: 3000
      });
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: `Failed to upload photo: ${error}`,
        variant: 'destructive'
      });
    }
  });

  const handleUploadSuccess = async (url: string, fileName: string) => {
    // Photo is handled in the uploadPhoto hook onSuccess callback
  };

  const handleDeletePhoto = async (photo: MerchantPhoto) => {
    const success = await deletePhoto(photo.fileName);
    if (success) {
      const updatedPhotos = photos.filter(p => p.id !== photo.id);
      setPhotos(updatedPhotos);
      onPhotosUpdate?.(updatedPhotos);

      toast({
        title: '🗑️ Photo Deleted',
        description: 'Photo removed successfully',
        duration: 2000
      });
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      logo: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      banner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      product: 'bg-green-500/20 text-green-400 border-green-500/30',
      gallery: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };
    return colors[type as keyof typeof colors] || colors.gallery;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'logo': return '🏪';
      case 'banner': return '🖼️';
      case 'product': return '📦';
      case 'gallery': return '🎨';
      default: return '📸';
    }
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-5 h-5 text-honey" />
          Merchant Photos
          <Badge variant="outline" className="ml-auto">
            {photos.length}/{maxPhotos}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Photo Type Selector */}
        {canAddMore && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Photo Type</h4>
            <div className="flex flex-wrap gap-2">
              {allowedTypes.map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={activeUploadType === type ? "default" : "outline"}
                  onClick={() => setActiveUploadType(type)}
                  className="capitalize"
                >
                  <span className="mr-1">{getTypeIcon(type)}</span>
                  {type}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Upload Component */}
        {canAddMore && walletAddress && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">
              Upload {activeUploadType} Photo
            </h4>
            <PhotoUpload
              bucket="uploads"
              folder={`merchants/${merchantId || walletAddress}`}
              maxFileSize={5}
              allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
              onUploadSuccess={handleUploadSuccess}
              disabled={!walletAddress || uploading}
            />
          </div>
        )}

        {/* Current Photos Grid */}
        {photos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">
              Current Photos ({photos.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={photo.url}
                      alt={`${photo.type} photo`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  
                  {/* Photo Info Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex flex-col justify-between p-2">
                    <Badge className={`${getTypeColor(photo.type)} w-fit text-xs`}>
                      {photo.type}
                    </Badge>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeletePhoto(photo)}
                      className="w-full"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>

                  {/* Upload Date */}
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {photo.uploadedAt.toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {photos.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">No photos uploaded yet</p>
            <p className="text-sm text-muted-foreground">
              Upload photos to showcase your business
            </p>
          </div>
        )}

        {/* Limits Warning */}
        {!canAddMore && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-400">
              Maximum photos reached ({maxPhotos}). Delete some photos to upload new ones.
            </p>
          </div>
        )}

        {/* Connection Warning */}
        {!walletAddress && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              Connect your wallet to upload merchant photos
            </p>
          </div>
        )}

        {/* Guidelines */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
          <p className="font-medium">Photo Guidelines:</p>
          <p>• Logo: Square format, transparent background preferred</p>
          <p>• Banner: Wide format (16:9 or 21:9) for hero sections</p>
          <p>• Product: Clear product shots with good lighting</p>
          <p>• Gallery: Additional photos showcasing your business</p>
          <p>• Maximum file size: 5MB per photo</p>
          <p>• Supported formats: JPEG, PNG, WebP</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default MerchantPhotoUpload;