import { useState } from "react";
import { X, ExternalLink, Settings, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceRequestModal } from "./ServiceRequestModal";

interface NFTDetailModalProps {
  nft: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    serviceName: string;
    serviceType: string;
    websiteUrl?: string;
    priceBCC: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
  onRequestService: (nftId: string, requestData: any) => Promise<void>;
}

// Status badge component for service requests
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    new_application: { label: "新申请", color: "bg-blue-500/20 text-blue-400", icon: Clock },
    processing: { label: "处理中", color: "bg-yellow-500/20 text-yellow-400", icon: Settings },
    awaiting_feedback: { label: "等待反馈", color: "bg-purple-500/20 text-purple-400", icon: AlertCircle },
    completed: { label: "处理完毕", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new_application;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

export function NFTDetailModal({ nft, isOpen, onClose, walletAddress, onRequestService }: NFTDetailModalProps) {
  const [showServiceRequest, setShowServiceRequest] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]); // This would come from API

  if (!nft) return null;

  const handleServiceRequest = async (requestData: any) => {
    try {
      await onRequestService(nft.id, requestData);
      setShowServiceRequest(false);
      // Refresh service requests list
      // fetchServiceRequests(); // This would be implemented
    } catch (error) {
      console.error('Service request failed:', error);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-secondary border-border">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-honey">{nft.title}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground hover:text-honey"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - NFT Image and Basic Info */}
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-honey/10 to-honey/5">
                <img 
                  src={nft.imageUrl} 
                  alt={nft.title}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-honey/20 text-honey border-honey/30">
                    {nft.serviceName}
                  </Badge>
                </div>
              </div>

              <Card className="bg-secondary/50 border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-honey">Service Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Service Type:</span>
                    <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                      {nft.serviceType}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-bold text-honey">{nft.priceBCC} BCC</span>
                  </div>
                  {nft.websiteUrl && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Website:</span>
                      <a
                        href={nft.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Visit <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Description and Service Actions */}
            <div className="space-y-6">
              <Card className="bg-secondary/50 border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-honey">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {nft.description}
                  </p>
                </CardContent>
              </Card>

              {/* Service Request Action */}
              <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 border-blue-400/20">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-400 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Use This Service
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Submit a service request to use this NFT's functionality. Our team will process your request and provide the service.
                  </p>
                  
                  <Button
                    onClick={() => setShowServiceRequest(true)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                    disabled={!walletAddress}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Request Service
                  </Button>

                  {!walletAddress && (
                    <p className="text-amber-400 text-xs text-center">
                      Please connect your wallet to use services
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Existing Service Requests */}
              {serviceRequests.length > 0 && (
                <Card className="bg-secondary/50 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-purple-400">Your Service Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {serviceRequests.map((request, index) => (
                        <div 
                          key={request.id || index}
                          className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                        >
                          <div className="space-y-1">
                            <h4 className="font-medium text-foreground">{request.requestTitle}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusBadge status={request.status} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Request Modal */}
      <ServiceRequestModal
        isOpen={showServiceRequest}
        onClose={() => setShowServiceRequest(false)}
        nft={nft}
        walletAddress={walletAddress}
        onSubmit={handleServiceRequest}
      />
    </>
  );
}