import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { useToast } from '../../../hooks/use-toast';
import { supabase } from '../../../lib/supabaseClient';
import { Loader2, Save, X, Image as ImageIcon } from 'lucide-react';

export type NFTType = 'advertisement' | 'merchant' | 'service';

export interface NFTFormData {
  id?: string;
  type: NFTType;
  title: string;
  description: string;
  category: string;
  price_bcc: number;
  price_usdt: number;
  image_url: string | null;
  is_active: boolean;

  // Advertisement specific
  click_url?: string | null;
  impressions_target?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  advertiser_wallet?: string | null;

  // Merchant specific
  supply_total?: number | null;
  supply_available?: number | null;
  creator_wallet?: string | null;

  // Service specific
  service_type?: string | null;
  service_duration_days?: number | null;

  // Translations
  translations?: {
    [language: string]: {
      title?: string;
      description?: string;
      category?: string;
    };
  };

  metadata?: any;
}

interface NFTFormProps {
  nft?: NFTFormData | null;
  onSave: (nft: NFTFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const NFT_CATEGORIES = [
  'DeFi',
  'NFT',
  'Gaming',
  'Education',
  'Infrastructure',
  'Marketing',
  'Development',
  'Consulting',
  'Design',
  'Other'
];

const SERVICE_TYPES = [
  'Advertising Campaign',
  'Development Service',
  'Marketing Service',
  'Consulting Service',
  'Design Service',
  'Custom Service'
];

export default function NFTForm({ nft, onSave, onCancel, isLoading = false }: NFTFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<NFTFormData>({
    type: 'advertisement',
    title: '',
    description: '',
    category: 'DeFi',
    price_bcc: 0,
    price_usdt: 0,
    image_url: null,
    is_active: true,
    translations: {
      en: { title: '', description: '', category: '' },
      zh: { title: '', description: '', category: '' }
    },
    metadata: {}
  });

  const [saving, setSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState<'en' | 'zh'>('en');

  // Load existing NFT data
  useEffect(() => {
    if (nft) {
      setFormData(nft);
    }
  }, [nft]);

  const handleChange = (field: keyof NFTFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTranslationChange = (lang: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [lang]: {
          ...(prev.translations?.[lang] || {}),
          [field]: value
        }
      }
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive'
      });
      return false;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Description is required',
        variant: 'destructive'
      });
      return false;
    }

    if (formData.price_bcc <= 0 && formData.price_usdt <= 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one price must be greater than 0',
        variant: 'destructive'
      });
      return false;
    }

    // Type-specific validation
    if (formData.type === 'advertisement') {
      if (!formData.click_url) {
        toast({
          title: 'Validation Error',
          description: 'Click URL is required for advertisement NFTs',
          variant: 'destructive'
        });
        return false;
      }
    }

    if (formData.type === 'merchant') {
      if (!formData.supply_total || formData.supply_total <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Supply total must be greater than 0 for merchant NFTs',
          variant: 'destructive'
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      toast({
        title: 'Success',
        description: `NFT ${nft ? 'updated' : 'created'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${nft ? 'update' : 'create'} NFT`,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{nft ? 'Edit NFT' : 'Create New NFT'}</CardTitle>
          <CardDescription>
            {nft ? 'Update NFT details and translations' : 'Fill in the details to create a new NFT'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* NFT Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="nft-type">NFT Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange('type', value as NFTType)}
              disabled={!!nft}
            >
              <SelectTrigger id="nft-type">
                <SelectValue placeholder="Select NFT type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advertisement">Advertisement NFT</SelectItem>
                <SelectItem value="merchant">Merchant NFT</SelectItem>
                <SelectItem value="service">Service NFT</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.type === 'advertisement' && 'For advertising campaigns with impression tracking'}
              {formData.type === 'merchant' && 'For limited supply digital products or services'}
              {formData.type === 'service' && 'For service offerings with activation codes'}
            </p>
          </div>

          {/* Multi-language Tabs */}
          <Tabs value={currentLang} onValueChange={(v) => setCurrentLang(v as 'en' | 'zh')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="zh">中文</TabsTrigger>
            </TabsList>

            <TabsContent value="en" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title-en">Title (English)</Label>
                <Input
                  id="title-en"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="NFT title in English"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description-en">Description (English)</Label>
                <Textarea
                  id="description-en"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Detailed description in English"
                  rows={4}
                  required
                />
              </div>
            </TabsContent>

            <TabsContent value="zh" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title-zh">标题（中文）</Label>
                <Input
                  id="title-zh"
                  value={formData.translations?.zh?.title || ''}
                  onChange={(e) => handleTranslationChange('zh', 'title', e.target.value)}
                  placeholder="NFT中文标题"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description-zh">描述（中文）</Label>
                <Textarea
                  id="description-zh"
                  value={formData.translations?.zh?.description || ''}
                  onChange={(e) => handleTranslationChange('zh', 'description', e.target.value)}
                  placeholder="详细描述（中文）"
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {NFT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="image-url">Image URL</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="image-url"
                  value={formData.image_url || ''}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              {formData.image_url && (
                <div className="flex-shrink-0">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-12 h-12 rounded object-cover border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-nft.png';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price-bcc">Price (BCC)</Label>
              <Input
                id="price-bcc"
                type="number"
                min="0"
                step="1"
                value={formData.price_bcc}
                onChange={(e) => handleChange('price_bcc', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price-usdt">Price (USDT)</Label>
              <Input
                id="price-usdt"
                type="number"
                min="0"
                step="0.01"
                value={formData.price_usdt}
                onChange={(e) => handleChange('price_usdt', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Type-specific fields */}
          {formData.type === 'advertisement' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="click-url">Click URL</Label>
                <Input
                  id="click-url"
                  value={formData.click_url || ''}
                  onChange={(e) => handleChange('click_url', e.target.value)}
                  placeholder="https://advertiser-website.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="impressions-target">Target Impressions</Label>
                  <Input
                    id="impressions-target"
                    type="number"
                    min="0"
                    value={formData.impressions_target || ''}
                    onChange={(e) => handleChange('impressions_target', parseInt(e.target.value) || null)}
                    placeholder="10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advertiser-wallet">Advertiser Wallet</Label>
                  <Input
                    id="advertiser-wallet"
                    value={formData.advertiser_wallet || ''}
                    onChange={(e) => handleChange('advertiser_wallet', e.target.value)}
                    placeholder="0x..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starts-at">Start Date</Label>
                  <Input
                    id="starts-at"
                    type="datetime-local"
                    value={formData.starts_at ? new Date(formData.starts_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleChange('starts_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ends-at">End Date</Label>
                  <Input
                    id="ends-at"
                    type="datetime-local"
                    value={formData.ends_at ? new Date(formData.ends_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleChange('ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  />
                </div>
              </div>
            </>
          )}

          {formData.type === 'merchant' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supply-total">Total Supply</Label>
                  <Input
                    id="supply-total"
                    type="number"
                    min="1"
                    value={formData.supply_total || ''}
                    onChange={(e) => handleChange('supply_total', parseInt(e.target.value) || null)}
                    placeholder="100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supply-available">Available Supply</Label>
                  <Input
                    id="supply-available"
                    type="number"
                    min="0"
                    value={formData.supply_available || formData.supply_total || ''}
                    onChange={(e) => handleChange('supply_available', parseInt(e.target.value) || null)}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="creator-wallet">Creator Wallet</Label>
                <Input
                  id="creator-wallet"
                  value={formData.creator_wallet || ''}
                  onChange={(e) => handleChange('creator_wallet', e.target.value)}
                  placeholder="0x..."
                />
              </div>
            </>
          )}

          {formData.type === 'service' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="service-type">Service Type</Label>
                <Select
                  value={formData.service_type || ''}
                  onValueChange={(value) => handleChange('service_type', value)}
                >
                  <SelectTrigger id="service-type">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-duration">Service Duration (Days)</Label>
                <Input
                  id="service-duration"
                  type="number"
                  min="1"
                  value={formData.service_duration_days || ''}
                  onChange={(e) => handleChange('service_duration_days', parseInt(e.target.value) || null)}
                  placeholder="30"
                />
              </div>
            </>
          )}

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
            <Label htmlFor="is-active" className="cursor-pointer">
              Active in marketplace
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving || isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={saving || isLoading}
              className="bg-honey text-secondary hover:bg-honey/90"
            >
              {(saving || isLoading) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {nft ? 'Update' : 'Create'} NFT
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
