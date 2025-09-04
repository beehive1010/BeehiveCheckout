import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent } from '../ui/card';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  /** Upload endpoint type */
  uploadType: 'profile-image' | 'nft-asset' | 'merchant-nft' | 'course-material';
  /** Accepted file types */
  accept?: string;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Whether to show image preview */
  showPreview?: boolean;
  /** Additional form data to send with upload */
  additionalData?: Record<string, any>;
  /** Callback when upload completes */
  onUploadComplete?: (data: any) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Custom styling */
  className?: string;
}

interface UploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  message?: string;
}

export function FileUpload({
  uploadType,
  accept,
  maxSizeMB = 10,
  showPreview = true,
  additionalData = {},
  onUploadComplete,
  onUploadError,
  className = ''
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Get upload endpoint based on type
  const getUploadEndpoint = () => {
    const endpoints = {
      'profile-image': '/api/upload/profile-image',
      'nft-asset': '/api/upload/nft-asset',
      'merchant-nft': '/api/upload/merchant-nft',
      'course-material': '/api/upload/course-material'
    };
    return endpoints[uploadType];
  };

  // Get default accept types based on upload type
  const getDefaultAccept = () => {
    const defaults = {
      'profile-image': 'image/*',
      'nft-asset': 'image/*,application/json',
      'merchant-nft': 'image/*',
      'course-material': '*/*'
    };
    return accept || defaults[uploadType];
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type for specific upload types
    if (uploadType === 'profile-image' || uploadType === 'merchant-nft') {
      if (!file.type.startsWith('image/')) {
        return 'Only image files are allowed';
      }
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: 'Invalid File',
        description: error,
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);

    // Generate preview for images
    if (showPreview && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    setUploadProgress(null);
  }, [validateFile, showPreview, toast]);

  // Handle file input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Upload file
  const uploadFile = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    
    // Determine field name based on upload type
    const fieldNames = {
      'profile-image': 'image',
      'nft-asset': 'file',
      'merchant-nft': 'image',
      'course-material': 'file'
    };
    
    formData.append(fieldNames[uploadType], selectedFile);

    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    setUploadProgress({ progress: 0, status: 'uploading' });

    try {
      const xhr = new XMLHttpRequest();
      
      // Progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress({ progress, status: 'uploading' });
        }
      });

      // Handle response
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploadProgress({ progress: 100, status: 'completed', message: 'Upload successful!' });
          
          toast({
            title: 'Upload Successful',
            description: 'Your file has been uploaded successfully.',
          });

          onUploadComplete?.(response);
        } else {
          const error = xhr.responseText || 'Upload failed';
          setUploadProgress({ progress: 0, status: 'error', message: error });
          onUploadError?.(error);
          
          toast({
            title: 'Upload Failed',
            description: error,
            variant: 'destructive'
          });
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        const error = 'Network error occurred';
        setUploadProgress({ progress: 0, status: 'error', message: error });
        onUploadError?.(error);
        
        toast({
          title: 'Upload Failed',
          description: error,
          variant: 'destructive'
        });
      });

      // Get wallet address from localStorage or context
      const walletAddress = localStorage.getItem('walletAddress') || '';
      
      xhr.open('POST', getUploadEndpoint());
      xhr.setRequestHeader('X-Wallet-Address', walletAddress);
      xhr.send(formData);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadProgress({ progress: 0, status: 'error', message: errorMessage });
      onUploadError?.(errorMessage);
      
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`w-full ${className}`}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getDefaultAccept()}
        onChange={handleInputChange}
        className="hidden"
        data-testid="file-input"
      />

      {/* Upload Area */}
      {!selectedFile ? (
        <Card 
          className={`border-dashed border-2 transition-colors ${
            isDragOver 
              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-yellow-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="upload-area"
        >
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload File</h3>
            <p className="text-gray-500 text-center mb-4">
              Drag and drop your file here, or click to select
            </p>
            <Button 
              onClick={triggerFileInput}
              variant="outline"
              data-testid="button-select-file"
            >
              Select File
            </Button>
            <p className="text-xs text-gray-400 mt-2">
              Max size: {maxSizeMB}MB • Accepted: {getDefaultAccept()}
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Selected File Display */
        <Card data-testid="selected-file-card">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* File Preview */}
              <div className="flex-shrink-0">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-20 h-20 object-cover rounded border"
                    data-testid="image-preview"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center">
                    <File className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate" data-testid="file-name">
                  {selectedFile.name}
                </h4>
                <p className="text-sm text-gray-500" data-testid="file-size">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {/* Upload Progress */}
                {uploadProgress && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      {uploadProgress.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : uploadProgress.status === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                      )}
                      <span className="text-sm" data-testid="upload-status">
                        {uploadProgress.status === 'uploading' && `Uploading... ${uploadProgress.progress}%`}
                        {uploadProgress.status === 'completed' && 'Upload completed'}
                        {uploadProgress.status === 'error' && 'Upload failed'}
                      </span>
                    </div>
                    {uploadProgress.status === 'uploading' && (
                      <Progress value={uploadProgress.progress} className="h-2" data-testid="progress-bar" />
                    )}
                    {uploadProgress.message && (
                      <p className="text-xs text-gray-500 mt-1" data-testid="upload-message">
                        {uploadProgress.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  data-testid="button-clear"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Upload Button */}
            {!uploadProgress && (
              <div className="mt-4 flex gap-2">
                <Button 
                  onClick={uploadFile}
                  className="flex-1"
                  data-testid="button-upload"
                >
                  Upload File
                </Button>
                <Button 
                  variant="outline" 
                  onClick={triggerFileInput}
                  data-testid="button-change-file"
                >
                  Change File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Status Alert */}
      {uploadProgress?.status === 'error' && uploadProgress.message && (
        <Alert variant="destructive" className="mt-4" data-testid="error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadProgress.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}