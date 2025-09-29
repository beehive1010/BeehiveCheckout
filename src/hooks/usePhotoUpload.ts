import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UploadResult {
  url: string;
  fileName: string;
  error?: string;
}

interface UsePhotoUploadOptions {
  bucket?: string;
  folder?: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export function usePhotoUpload({
  bucket = 'uploads',
  folder = 'user-photos',
  onSuccess,
  onError
}: UsePhotoUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Upload photo and optionally update user profile
  const uploadPhoto = useCallback(async (
    file: File,
    updateProfile: boolean = false,
    walletAddress?: string
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${folder}/${timestamp}_${randomStr}.${extension}`;

      console.log(`📤 Uploading photo: ${fileName}`);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setUploadProgress(80);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log(`✅ Photo uploaded: ${publicUrl}`);

      // Update user profile if requested
      if (updateProfile && walletAddress) {
        console.log(`📝 Updating user profile with photo URL...`);
        
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            wallet_address: walletAddress,
            avatar_url: publicUrl,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'wallet_address'
          });

        if (profileError) {
          console.warn('Failed to update profile:', profileError);
          // Don't throw error here as photo upload was successful
        } else {
          console.log(`✅ User profile updated with avatar`);
        }
      }

      setUploadProgress(100);

      const result: UploadResult = {
        url: publicUrl,
        fileName: data.path
      };

      onSuccess?.(result);
      return result;

    } catch (error: any) {
      console.error('❌ Photo upload failed:', error);
      const errorMessage = error.message || 'Upload failed';
      
      onError?.(errorMessage);
      return {
        url: '',
        fileName: '',
        error: errorMessage
      };
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [bucket, folder, onSuccess, onError]);

  // Delete photo from storage
  const deletePhoto = useCallback(async (fileName: string): Promise<boolean> => {
    try {
      console.log(`🗑️ Deleting photo: ${fileName}`);
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ Photo deleted successfully`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to delete photo:', error);
      onError?.(error.message || 'Delete failed');
      return false;
    }
  }, [bucket, onError]);

  // Get signed URL for private files (if needed)
  const getSignedUrl = useCallback(async (
    fileName: string,
    expiresIn: number = 3600
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, expiresIn);

      if (error) {
        throw new Error(error.message);
      }

      return data.signedUrl;
    } catch (error: any) {
      console.error('❌ Failed to get signed URL:', error);
      onError?.(error.message || 'Failed to get signed URL');
      return null;
    }
  }, [bucket, onError]);

  return {
    uploadPhoto,
    deletePhoto,
    getSignedUrl,
    uploading,
    uploadProgress
  };
}

export default usePhotoUpload;