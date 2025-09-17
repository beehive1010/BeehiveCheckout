import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, User, Mail, Users, Crown, Gift, AlertCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { authService } from '../../lib/supabase-unified';
import { useI18n } from '../../contexts/I18nContext';

interface UpdatedRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  referrerWallet?: string;
  onRegistrationComplete: () => void;
}

interface RegistrationResult {
  success: boolean;
  action: 'created' | 'existing_user';
  user?: any;
  member?: any;
  activation_sequence?: number;
  message: string;
  error?: string;
}

export default function UpdatedRegistrationModal({
  isOpen,
  onClose,
  walletAddress,
  referrerWallet,
  onRegistrationComplete
}: UpdatedRegistrationModalProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referrerInfo, setReferrerInfo] = useState<any>(null);
  const [validatingReferrer, setValidatingReferrer] = useState(false);

  // 验证推荐人
  useEffect(() => {
    if (isOpen && referrerWallet) {
      validateReferrer();
    }
  }, [isOpen, referrerWallet]);

  // 检查用户是否已存在
  useEffect(() => {
    if (isOpen && walletAddress) {
      checkUserExists();
    }
  }, [isOpen, walletAddress]);

  const validateReferrer = async () => {
    if (!referrerWallet) return;
    
    setValidatingReferrer(true);
    try {
      // Use unified authService for referrer validation
      const { isValid, referrer, error } = await authService.validateReferrer(referrerWallet);
      
      if (isValid && referrer) {
        setReferrerInfo(referrer);
      } else {
        throw new Error(error?.message || 'Invalid referrer');
      }
    } catch (error: any) {
      console.error('推荐人验证失败:', error);
      toast({
        title: '推荐人验证失败',
        description: error.message || '推荐人不是有效的激活会员',
        variant: 'destructive',
      });
      // 可以选择关闭模态框或显示错误状态
    } finally {
      setValidatingReferrer(false);
    }
  };

  const checkUserExists = async () => {
    try {
      // Use unified authService to check user existence
      const { exists } = await authService.userExists(walletAddress);
      
      if (exists) {
        // 用户已存在，关闭模态框
        onClose();
        onRegistrationComplete();
        return;
      }
    } catch (error) {
      console.error('检查用户存在性错误:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少需要3个字符';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = '用户名只能包含字母、数字和下划线';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (!referrerWallet) {
      newErrors.referrer = '需要有效的推荐人';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use unified authService for registration
      const { data: result, error, isExisting } = await authService.registerUser(
        walletAddress,
        formData.username.trim(),
        formData.email.trim() || undefined,
        referrerWallet
      );

      if (error || !result) {
        throw new Error(error?.message || '注册失败');
      }

      // 注册成功
      toast({
        title: isExisting ? '欢迎回来!' : '注册成功!',
        description: isExisting ? '您已经是注册用户' : '新用户注册成功',
        duration: 4000,
      });

      // Note: activation_sequence is handled by the Edge Function internally
      if (!isExisting) {
        toast({
          title: '用户配置完成',
          description: '您的账户配置已设置完成',
          duration: 4000,
        });
      }

      // 清空表单并关闭模态框
      setFormData({ username: '', email: '' });
      onClose();
      onRegistrationComplete();

    } catch (error: any) {
      console.error('注册错误:', error);
      
      toast({
        title: '注册失败',
        description: error.message || '注册过程中出现错误',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除错误信息
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-honey">
            <User className="h-5 w-5" />
            加入BEEHIVE平台
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 钱包信息 */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">钱包地址</span>
                  <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                    {formatAddress(walletAddress)}
                  </Badge>
                </div>
                
                {referrerWallet && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">推荐人</span>
                      {validatingReferrer ? (
                        <Badge variant="outline" className="bg-gray-100">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          验证中...
                        </Badge>
                      ) : referrerInfo ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          <Users className="w-3 h-3 mr-1" />
                          {referrerInfo.username} (Level {referrerInfo.current_level})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          验证失败
                        </Badge>
                      )}
                    </div>
                    
                    {referrerInfo && (
                      <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded">
                        ✅ 推荐人验证成功: {referrerInfo.direct_referrals_count}个直推, {referrerInfo.matrix_members_count}个团队成员
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 注册表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名 *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="输入您的用户名"
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱 (可选)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="输入您的邮箱地址"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {errors.referrer && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.referrer}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-honey hover:bg-honey/90"
              disabled={isLoading || validatingReferrer || !referrerInfo}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  注册中...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  注册账户
                </>
              )}
            </Button>
          </form>

          {/* 注册流程说明 */}
          <div className="p-4 bg-honey/10 rounded-lg border border-honey/20">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-honey mt-0.5" />
              <div>
                <p className="text-sm font-medium text-honey">
                  注册后续步骤
                </p>
                <ul className="text-xs text-honey/80 mt-1 space-y-1">
                  <li>• 注册完成后获得激活序列号</li>
                  <li>• 购买Level 1 NFT激活会员身份</li>
                  <li>• 开始获得Matrix奖励和推荐奖励</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 新功能说明 */}
          {referrerInfo && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Matrix系统优势
                  </p>
                  <ul className="text-xs text-blue-600/80 mt-1 space-y-1">
                    <li>• 3x3滑落矩阵自动安置</li>
                    <li>• 每个membership激活触发奖励</li>
                    <li>• 19层NFT等级渐进式解锁</li>
                    <li>• 倒计时奖励管理系统</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}