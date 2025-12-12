import type { ReactNode } from "react";
// import { useState } from "react";
// import Uppy from "@uppy/core";
// import AwsS3 from "@uppy/aws-s3";
// import { Dashboard } from "@uppy/react";
// import "../../styles/uppy-core.css";
// import "../../styles/uppy-dashboard.css";
// import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: any
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const { toast } = useToast();

  const handleUploadClick = () => {
    toast({
      title: "Uploads Disabled",
      description: "File uploads are temporarily disabled for maintenance. Please check back later.",
      variant: "destructive",
    });
  };

  return (
    <Button onClick={handleUploadClick} type="button" className={buttonClassName}>
      {children}
    </Button>
  );
}
