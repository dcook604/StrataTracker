import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileImage, X, Upload } from "lucide-react";

interface FileUploadProps {
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export function FileUpload({
  onChange,
  maxFiles = 5,
  maxSizeMB = 5,
  acceptedTypes = ["image/jpeg", "image/png", "application/pdf"],
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    // Check if adding these files would exceed the maximum
    if (files.length + fileList.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload a maximum of ${maxFiles} files`,
        variant: "destructive",
      });
      return;
    }

    Array.from(fileList).forEach((file) => {
      // Check file size
      if (file.size > maxSizeBytes) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the maximum size of ${maxSizeMB}MB`,
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an accepted file type`,
          variant: "destructive",
        });
        return;
      }

      newFiles.push(file);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            // Add preview and trigger re-render
            setPreviews((prev) => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // For non-image files (like PDFs), add a placeholder
        newPreviews.push("pdf");
      }
    });

    // Update state and call onChange callback
    setFiles((prev) => [...prev, ...newFiles]);
    onChange([...files, ...newFiles]);

    // Reset the input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setFiles(newFiles);
    setPreviews(newPreviews);
    onChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div
        className="cursor-pointer p-4 border-2 border-dashed border-neutral-300 hover:border-primary rounded-lg flex flex-col items-center justify-center text-neutral-500 hover:text-primary transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-6 w-6 mb-2" />
        <p className="text-sm text-center">Drag and drop files here, or click to browse</p>
        <p className="mt-1 text-xs text-center">
          Supported formats: JPG, PNG, PDF (max {maxSizeMB}MB each)
        </p>
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileChange}
        />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <Card key={index} className="relative overflow-hidden">
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 z-10"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              {file.type.startsWith("image/") ? (
                <div className="aspect-square relative">
                  <img
                    src={previews[index]}
                    alt={`Preview ${index}`}
                    className="absolute inset-0 w-full h-full object-cover rounded-md"
                  />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-neutral-100">
                  <FileImage className="h-12 w-12 text-neutral-400" />
                  <span className="absolute bottom-2 text-xs truncate max-w-[90%]">
                    {file.name}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
