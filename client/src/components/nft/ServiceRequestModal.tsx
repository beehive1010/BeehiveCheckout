import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

// Form validation schema
const serviceRequestSchema = z.object({
  requestTitle: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be less than 100 characters"),
  requestDescription: z.string()
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description must be less than 1000 characters"),
  contactInfo: z.string()
    .min(1, "Contact information is required"),
  additionalInfo: z.string().optional(),
  urgency: z.enum(["low", "medium", "high"]).default("medium"),
});

type ServiceRequestForm = z.infer<typeof serviceRequestSchema>;

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: {
    id: string;
    title: string;
    serviceName: string;
    serviceType: string;
  };
  walletAddress?: string;
  onSubmit: (data: ServiceRequestForm) => Promise<void>;
}

export function ServiceRequestModal({ 
  isOpen, 
  onClose, 
  nft, 
  walletAddress, 
  onSubmit 
}: ServiceRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ServiceRequestForm>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      requestTitle: "",
      requestDescription: "",
      contactInfo: "",
      additionalInfo: "",
      urgency: "medium",
    },
  });

  const handleSubmit = async (data: ServiceRequestForm) => {
    if (!walletAddress) return;

    setIsSubmitting(true);
    try {
      // Combine form data with NFT info and metadata
      const requestData = {
        ...data,
        nftId: nft.id,
        serviceName: nft.serviceName,
        serviceType: nft.serviceType,
        walletAddress,
        applicationData: {
          ...data,
          submittedAt: new Date().toISOString(),
          nftTitle: nft.title,
        },
      };

      await onSubmit(requestData);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to submit service request:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-secondary border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Request Service: {nft.serviceName}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-blue-400"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Service Info Card */}
        <Card className="bg-blue-500/10 border-blue-400/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Service:</span>
                <p className="font-medium text-blue-400">{nft.serviceName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium text-blue-400">{nft.serviceType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Request Title */}
            <FormField
              control={form.control}
              name="requestTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Request Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Brief description of what you need..."
                      className="bg-background border-border focus:border-blue-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Request Description */}
            <FormField
              control={form.control}
              name="requestDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Detailed Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Please provide detailed information about your service request, including specific requirements, timeline, and any relevant context..."
                      rows={6}
                      className="bg-background border-border focus:border-blue-400 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Information */}
            <FormField
              control={form.control}
              name="contactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Contact Information *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Email, Telegram, Discord, or preferred contact method..."
                      className="bg-background border-border focus:border-blue-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Urgency Level */}
            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Urgency Level</FormLabel>
                  <FormControl>
                    <select 
                      {...field}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:border-blue-400 focus:outline-none"
                    >
                      <option value="low">Low - No rush</option>
                      <option value="medium">Medium - Normal priority</option>
                      <option value="high">High - Urgent</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Information */}
            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Additional Information</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional context, files, or special requirements..."
                      rows={3}
                      className="bg-background border-border focus:border-blue-400 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Wallet Address Display */}
            <div className="p-4 bg-background rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-1">Your Wallet Address:</div>
              <div className="font-mono text-sm text-blue-400 break-all">
                {walletAddress}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-border hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Submit Request
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Information Notice */}
        <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded-lg border border-border">
          <strong>Note:</strong> Your service request will be reviewed by our team. You will be notified of status updates and can track the progress in your My Collection section.
        </div>
      </DialogContent>
    </Dialog>
  );
}