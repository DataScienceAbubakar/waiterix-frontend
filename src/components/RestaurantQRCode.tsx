import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Link as LinkIcon } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";

interface RestaurantQRCodeProps {
  restaurantId: string;
  restaurantName: string;
}

export function RestaurantQRCode({ restaurantId, restaurantName }: RestaurantQRCodeProps) {
  const { toast } = useToast();
  const menuUrl = `${window.location.origin}/menu/${restaurantId}`;

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${restaurantName}-qr-code.png`;
      link.href = url;
      link.click();
      toast({
        title: "QR Code Downloaded",
        description: "Your QR code has been saved successfully.",
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    toast({
      title: "Link Copied",
      description: "Menu link copied to clipboard.",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${restaurantName} Menu`,
          text: `Check out our menu!`,
          url: menuUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Your Menu QR Code</h3>
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 rounded-lg">
          <QRCodeCanvas
            id="qr-code"
            value={menuUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Scan to view menu
          </p>
          <p className="text-xs text-muted-foreground break-all max-w-xs">
            {menuUrl}
          </p>
        </div>

        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleDownloadQR}
            data-testid="button-download-qr"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleCopyLink}
            data-testid="button-copy-link"
          >
            <LinkIcon className="h-4 w-4" />
            Copy Link
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleShare}
            data-testid="button-share"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </Card>
  );
}
