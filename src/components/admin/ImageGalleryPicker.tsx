import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import { MediaManagerModal } from "@/components/media/MediaManagerModal";

interface ImageGalleryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  bucket?: string;
}

export function ImageGalleryPicker({
  open,
  onOpenChange,
  onSelect,
  bucket = "academy-files",
}: ImageGalleryPickerProps) {
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);

  const handleMediaSelect = (url: string) => {
    onSelect(url);
    onOpenChange(false);
  };

  // Instead of the old gallery, directly open the MediaManager
  return (
    <MediaManagerModal
      open={open}
      onOpenChange={onOpenChange}
      onSelect={handleMediaSelect}
      accept="image"
    />
  );
}
