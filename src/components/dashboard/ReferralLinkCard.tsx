import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Copy, Share2 } from 'lucide-react';

interface ReferralLinkCardProps {
  title: string;
  description: string;
  referralLink: string;
  onCopyLink: () => void;
  copyButtonText: string;
  className?: string;
}

export default function ReferralLinkCard({ 
  title, 
  description, 
  referralLink, 
  onCopyLink, 
  copyButtonText,
  className = '' 
}: ReferralLinkCardProps) {
  return (
    <div className={`group relative transition-all duration-500 hover:-translate-y-1 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-honey/20 via-yellow-400/20 to-honey/20 rounded-3xl blur-lg group-hover:blur-xl"></div>
      <Card className="relative border-0 bg-gradient-to-br from-white/95 via-white/98 to-white/95 dark:from-gray-900/95 dark:via-gray-800/98 dark:to-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl transition-all duration-500 group-hover:shadow-3xl overflow-hidden">
        <CardContent className="p-8">
          {/* 头部图标和标题 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-honey/30 to-yellow-400/30 rounded-2xl blur-md group-hover:blur-lg transition-all duration-300"></div>
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-honey/20 to-yellow-400/20 backdrop-blur-sm">
                <Share2 className="h-8 w-8 text-honey transition-all duration-300 group-hover:scale-110" />
              </div>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-honey via-yellow-400 to-honey bg-clip-text text-transparent">
              {title}
            </h3>
          </div>
          
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {description}
          </p>
          
          {/* 推荐链接展示 */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-honey/10 to-yellow-400/10 rounded-2xl blur-sm"></div>
            <div className="relative bg-gradient-to-br from-gray-50/90 to-gray-100/90 dark:from-gray-800/90 dark:to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 border border-honey/20">
              <div className="text-sm font-mono break-all text-honey font-medium">
                {referralLink}
              </div>
            </div>
          </div>
          
          {/* Premium 复制按钮 */}
          <Button 
            onClick={onCopyLink} 
            className="w-full h-12 bg-gradient-to-r from-honey via-yellow-400 to-honey hover:from-honey/90 hover:via-yellow-400/90 hover:to-honey/90 text-black font-bold text-base rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-honey/30"
          >
            <Copy className="h-5 w-5 mr-3 transition-transform duration-200 group-hover:rotate-12" />
            {copyButtonText}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}