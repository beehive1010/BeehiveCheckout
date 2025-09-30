import React, { useState, useRef } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PhotoUploadProps {
  bucket?: string;
  folder?: string;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  onUploadSuccess?: (url: string, fileName: string) => void;
  onUploadError?: (error: string) => void;
  currentImage?: string | null;
  className?: string;
  disabled?: boolean;
}

export function PhotoUpload({
  bucket = 'uploads',
  folder = 'user-photos',
  maxFileSize = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  onUploadSuccess,
  onUploadError,
  currentImage,
  className = '',
  disabled = false
}: PhotoUploadProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [dragActive, setDragActive] = useState(false);

  // Generate unique filename
  const generateFileName = (originalName: string): string => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    return `${folder}/${timestamp}_${randomStr}.${extension}`;
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type not supported. Allowed: ${allowedTypes.join(', ')}`;
    }
    
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File too large. Maximum size: ${maxFileSize}MB`;
    }
    
    return null;
  };

  // Upload file to Supabase Storage
  const uploadFile = async (file: File): Promise<string> => {
    const fileName = generateFileName(file.name);
    
    console.log(`📤 Uploading file to Supabase Storage: ${fileName}`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw new Error(error.message);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log(`✅ File uploaded successfully: ${publicUrl}`);
    return publicUrl;
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    if (disabled) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: 'Upload Error',
        description: validationError,
        variant: 'destructive'
      });
      onUploadError?.(validationError);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      const url = await uploadFile(file);
      
      toast({
        title: '✅ Upload Successful',
        description: 'Photo uploaded successfully!',
        duration: 3000
      });

      onUploadSuccess?.(url, file.name);
    } catch (error: any) {
      console.error('Upload failed:', error);
      
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive'
      });

      onUploadError?.(error.message || 'Upload failed');
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);

    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Clear preview
  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
              ${dragActive ? 'border-honey bg-honey/5' : 'border-border hover:border-honey/50'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${uploading ? 'pointer-events-none' : ''}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={allowedTypes.join(',')}
              onChange={handleInputChange}
              className="hidden"
              disabled={disabled || uploading}
            />

            {/* Preview or Upload UI */}
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                {!uploading && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearPreview();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="flex items-center gap-2 text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-honey mb-2" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-honey/10 rounded-full mb-3">
                      <ImageIcon className="w-6 h-6 text-honey" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {allowedTypes.map(type => type.split('/')[1]).join(', ').toUpperCase()} up to {maxFileSize}MB
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Upload Button (alternative) */}
          {!preview && !uploading && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Photo
            </Button>
          )}

          {/* File Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Supported formats: {allowedTypes.map(type => type.split('/')[1]).join(', ').toUpperCase()}</p>
            <p>• Maximum file size: {maxFileSize}MB</p>
            <p>• Images will be stored securely in Supabase Storage</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PhotoUpload;