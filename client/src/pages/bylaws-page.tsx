import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, BookOpen, Edit, Plus, Eye } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface Bylaw {
  id: number;
  uuid: string;
  sectionNumber: string;
  title: string;
  content: string;
  partNumber?: string;
  partTitle?: string;
  sectionOrder: number;
  isActive: boolean;
  effectiveDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface BylawCategory {
  id: number;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

export default function BylawsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBylaw, setSelectedBylaw] = useState<Bylaw | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    sectionNumber: ''
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch bylaws
  const { data: bylaws = [], isLoading } = useQuery({
    queryKey: ['bylaws', searchTerm, selectedPart, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedPart !== 'all') params.append('part', selectedPart);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const response = await fetch(`/api/bylaws?${params}`);
      if (!response.ok) throw new Error('Failed to fetch bylaws');
      return response.json();
    }
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['bylaw-categories'],
    queryFn: async () => {
      const response = await fetch('/api/bylaws/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Import bylaws mutation
  const importMutation = useMutation({
    mutationFn: async (file?: File) => {
      const formData = new FormData();
      if (file) {
        formData.append('bylawsFile', file);
      }
      
      const response = await fetch('/api/bylaws/import', {
        method: 'POST',
        body: file ? formData : undefined,
        headers: file ? undefined : { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to import bylaws');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bylaws imported successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['bylaws'] });
      setIsImportDialogOpen(false);
      setSelectedFile(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import bylaws",
        variant: "destructive",
      });
    }
  });

  // Update bylaw mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; content: string; sectionNumber: string }) => {
      const response = await fetch(`/api/bylaws/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          sectionNumber: data.sectionNumber
        })
      });
      if (!response.ok) throw new Error('Failed to update bylaw');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bylaw updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['bylaws'] });
      setIsEditDialogOpen(false);
      setSelectedBylaw(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bylaw",
        variant: "destructive",
      });
    }
  });

  const handleViewBylaw = (bylaw: Bylaw) => {
    setSelectedBylaw(bylaw);
    setIsViewDialogOpen(true);
  };

  const handleEditBylaw = (bylaw: Bylaw) => {
    setSelectedBylaw(bylaw);
    setEditForm({
      title: bylaw.title,
      content: bylaw.content,
      sectionNumber: bylaw.sectionNumber
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedBylaw) return;
    updateMutation.mutate({
      id: selectedBylaw.id,
      ...editForm
    });
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  const handleFileImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    } else {
      // Import default Spectrum IV bylaws
      importMutation.mutate(undefined);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/xml' || file.type === 'application/xml' || file.name.endsWith('.xml')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an XML file",
          variant: "destructive",
        });
      }
    }
  };

  // Get unique parts for filter - properly typed
  const uniqueParts: Array<{ number: string; title: string }> = [];
  const seenParts = new Set<string>();
  
  for (const bylaw of bylaws as Bylaw[]) {
    if (bylaw.partNumber && !seenParts.has(bylaw.partNumber)) {
      seenParts.add(bylaw.partNumber);
      uniqueParts.push({
        number: bylaw.partNumber,
        title: bylaw.partTitle || bylaw.partNumber
      });
    }
  }

  const canEdit = user?.isAdmin || user?.isCouncilMember;

  return (
    <Layout title="Bylaws">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Strata Bylaws</h1>
          </div>
          {canEdit && (
            <div className="flex space-x-2">
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Import Bylaws
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <Input
              placeholder="Search bylaws..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedPart} onValueChange={setSelectedPart}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by part" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parts</SelectItem>
              {uniqueParts.map((part) => (
                <SelectItem key={part.number} value={part.number}>
                  {part.number} - {part.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category: BylawCategory) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bylaws List */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="text-center py-8">Loading bylaws...</div>
          ) : bylaws.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              No bylaws found. {canEdit && "Click 'Import Spectrum IV Bylaws' to get started."}
            </div>
          ) : (
            bylaws.map((bylaw: Bylaw) => (
              <Card key={bylaw.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {bylaw.sectionNumber}
                        </Badge>
                        {bylaw.partNumber && (
                          <Badge variant="secondary" className="text-xs">
                            {bylaw.partNumber}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{bylaw.title}</CardTitle>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewBylaw(bylaw)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditBylaw(bylaw)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600 line-clamp-3">
                    {bylaw.content.substring(0, 200)}...
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Badge variant="outline">{selectedBylaw?.sectionNumber}</Badge>
                <span>{selectedBylaw?.title}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm">
                  {selectedBylaw?.content}
                </div>
              </div>
              {selectedBylaw?.effectiveDate && (
                <div className="text-xs text-neutral-500">
                  Effective Date: {new Date(selectedBylaw.effectiveDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Bylaw</DialogTitle>
              <DialogDescription>
                Make changes to the bylaw content. Changes will be tracked in revision history.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sectionNumber">Section Number</Label>
                <Input
                  id="sectionNumber"
                  value={editForm.sectionNumber}
                  onChange={(e) => setEditForm(prev => ({ ...prev, sectionNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={editForm.content}
                  onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Import Bylaws</DialogTitle>
              <DialogDescription>
                Upload an XML file containing bylaws data, or import the default Spectrum IV bylaws.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bylawsFile">Select XML File (Optional)</Label>
                <Input
                  id="bylawsFile"
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">XML Format Requirements:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Use <code>&lt;section&gt;</code> tags for each bylaw</p>
                  <p>• Include <code>&lt;number&gt;</code>, <code>&lt;title&gt;</code>, and <code>&lt;content&gt;</code></p>
                  <p>• Optional: <code>&lt;part&gt;</code> and <code>&lt;partTitle&gt;</code> for organization</p>
                  <p>• See <code>sample-bylaws.xml</code> in the project for examples</p>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setIsImportDialogOpen(false);
                  setSelectedFile(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleFileImport} disabled={importMutation.isPending}>
                  {importMutation.isPending ? 'Importing...' : 
                   selectedFile ? 'Import from File' : 'Import Default Bylaws'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
} 