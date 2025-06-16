import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Send, 
  Mail, 
  Users, 
  Calendar, 
  MoreHorizontal, 
  Eye,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  X
} from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

// Form schemas
const campaignSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["newsletter", "announcement", "update", "emergency"]),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  recipientType: z.enum(["all", "owners", "tenants", "units", "individual", "manual"]),
  unitIds: z.array(z.number()).optional(),
  personIds: z.array(z.number()).optional(),
  manualEmails: z.array(z.object({
    email: z.string().email("Invalid email address"),
    name: z.string().optional()
  })).optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["newsletter", "announcement", "update", "emergency"]),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;
type TemplateFormData = z.infer<typeof templateSchema>;

interface Campaign {
  id: number;
  uuid: string;
  title: string;
  type: string;
  status: string;
  subject: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  createdBy: {
    fullName: string;
    email: string;
  };
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  openCount?: number;
  clickCount?: number;
  uniqueOpens?: number;
  openRate?: string;
}

interface Template {
  id: number;
  uuid: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
}

interface Unit {
  id: number;
  unitNumber: string;
  floor?: number;
}

interface ManualEmail {
  email: string;
  name?: string;
}

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isEditCampaignOpen, setIsEditCampaignOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<number[]>([]);
  const [manualEmails, setManualEmails] = useState<ManualEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['communications', 'campaigns'],
    queryFn: async () => {
      const res = await apiRequest("GET", '/api/communications/campaigns');
      return res.json();
    }
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['communications', 'templates'],
    queryFn: async () => {
      const res = await apiRequest("GET", '/api/communications/templates');
      return res.json();
    }
  });

  const { data: units } = useQuery({
    queryKey: ['communications', 'units'],
    queryFn: async () => {
      const res = await apiRequest("GET", '/api/communications/units');
      return res.json();
    }
  });

  const { data: analytics } = useQuery({
    queryKey: ['communications', 'analytics', selectedCampaign?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/communications/campaigns/${selectedCampaign?.id}/analytics`);
      return res.json();
    },
    enabled: !!selectedCampaign?.id && isAnalyticsOpen
  });

  // Forms
  const campaignForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: "",
      type: "newsletter",
      subject: "",
      content: "",
      recipientType: "all",
      unitIds: [],
      personIds: [],
      manualEmails: [],
    },
  });

  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      type: "newsletter",
      subject: "",
      content: "",
    },
  });

  // Watch recipient type for conditional rendering
  const recipientType = campaignForm.watch("recipientType");

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData & { unitIds?: number[], manualEmails?: ManualEmail[] }) => {
      const res = await apiRequest('POST', '/api/communications/campaigns', {
        ...data,
        unitIds: selectedUnits,
        manualEmails: manualEmails
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'campaigns'] });
      setIsCreateCampaignOpen(false);
      campaignForm.reset();
      setSelectedUnits([]);
      setManualEmails([]);
      toast({ title: "Campaign created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: CampaignFormData }) => {
      const res = await apiRequest('PUT', `/api/communications/campaigns/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'campaigns'] });
      setIsEditCampaignOpen(false);
      setSelectedCampaign(null);
      toast({ title: "Campaign updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update campaign", variant: "destructive" });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/communications/campaigns/${id}/send`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'campaigns'] });
      toast({ title: "Campaign sending started" });
    },
    onError: () => {
      toast({ title: "Failed to send campaign", variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/communications/campaigns/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'campaigns'] });
      toast({ title: "Campaign deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete campaign", variant: "destructive" });
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await apiRequest('POST', '/api/communications/templates', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'templates'] });
      setIsCreateTemplateOpen(false);
      templateForm.reset();
      toast({ title: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: TemplateFormData }) => {
      const res = await apiRequest('PUT', `/api/communications/templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'templates'] });
      setIsEditTemplateOpen(false);
      setSelectedTemplate(null);
      toast({ title: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/communications/templates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'templates'] });
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  // Event handlers
  const onCreateCampaign = (data: CampaignFormData) => {
    createCampaignMutation.mutate({ ...data, unitIds: selectedUnits, manualEmails: manualEmails });
  };

  const onUpdateCampaign = (data: CampaignFormData) => {
    if (selectedCampaign) {
      updateCampaignMutation.mutate({ id: selectedCampaign.id, data });
    }
  };

  const onCreateTemplate = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const onUpdateTemplate = (data: TemplateFormData) => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data });
    }
  };

  const handleViewCampaignDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSelectedTemplate(null);
    setIsViewDetailsOpen(true);
  };

  const handleViewAnalytics = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsAnalyticsOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    campaignForm.reset({
      title: campaign.title,
      type: campaign.type as CampaignFormData['type'],
      subject: campaign.subject,
      content: '', // Content will be loaded from API
      recipientType: "all", // Default, can be enhanced
      unitIds: [],
      personIds: [],
      manualEmails: [],
    });
    setIsEditCampaignOpen(true);
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    if (confirm(`Are you sure you want to delete the campaign "${campaign.title}"? This action cannot be undone.`)) {
      deleteCampaignMutation.mutate(campaign.id);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    templateForm.reset({
      name: template.name,
      type: template.type as TemplateFormData['type'],
      subject: template.subject,
      content: template.content,
    });
    setIsEditTemplateOpen(true);
  };

  const handleDeleteTemplate = (template: Template) => {
    if (confirm(`Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const handleViewTemplateDetails = (template: Template) => {
    setSelectedTemplate(template);
    setSelectedCampaign(null);
    setIsViewDetailsOpen(true);
  };

  const handleUnitSelection = (unitId: number, checked: boolean) => {
    if (checked) {
      setSelectedUnits(prev => [...prev, unitId]);
    } else {
      setSelectedUnits(prev => prev.filter(id => id !== unitId));
    }
  };

  const addManualEmail = () => {
    if (newEmail && newEmail.includes('@')) {
      setManualEmails(prev => [...prev, { email: newEmail, name: newName || undefined }]);
      setNewEmail("");
      setNewName("");
    }
  };

  const removeManualEmail = (index: number) => {
    setManualEmails(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      sending: "default",
      sent: "default",
      failed: "destructive",
    } as const;

    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sending: "bg-blue-100 text-blue-800",
      sent: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"} className={colors[status as keyof typeof colors]}>
        {status === 'sent' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
        {status === 'sending' && <Clock className="w-3 h-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      newsletter: "bg-blue-100 text-blue-800",
      announcement: "bg-purple-100 text-purple-800",
      update: "bg-green-100 text-green-800",
      emergency: "bg-red-100 text-red-800",
    } as const;

    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors]}>
        <Mail className="w-3 h-3 mr-1" />
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <Layout title="Communications">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
            <p className="text-neutral-600">Manage email campaigns and templates for your strata community</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Email Campaigns</h2>
              </div>
            <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
              <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <CampaignDialog 
                form={campaignForm} 
                onSubmit={onCreateCampaign} 
                isLoading={createCampaignMutation.isPending}
                  units={units || []}
                  templates={templates || []}
                isEdit={false}
                  recipientType={recipientType}
                  selectedUnits={selectedUnits}
                  onUnitSelection={handleUnitSelection}
                  manualEmails={manualEmails}
                  onAddManualEmail={addManualEmail}
                  onRemoveManualEmail={removeManualEmail}
                  newEmail={newEmail}
                  setNewEmail={setNewEmail}
                  newName={newName}
                  setNewName={setNewName}
              />
            </Dialog>
        </div>

            <CampaignsTab 
              campaigns={campaigns || []}
              isLoading={campaignsLoading}
              onSendCampaign={(id) => sendCampaignMutation.mutate(id)}
              isSending={sendCampaignMutation.isPending}
              getStatusBadge={getStatusBadge}
              getTypeBadge={getTypeBadge}
              onViewDetails={handleViewCampaignDetails}
              onViewAnalytics={handleViewAnalytics}
              onEdit={handleEditCampaign}
              onDelete={handleDeleteCampaign}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Email Templates</h2>
              </div>
              <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <TemplateDialog 
                  form={templateForm}
                  onSubmit={onCreateTemplate}
                  isLoading={createTemplateMutation.isPending}
                  isEdit={false}
                />
              </Dialog>
            </div>

            <TemplatesTab 
              templates={templates || []}
              isLoading={templatesLoading}
              getTypeBadge={getTypeBadge}
              onViewDetails={handleViewTemplateDetails}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
            />
          </TabsContent>
        </Tabs>

        {/* Campaign/Template Details Dialog */}
        <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
          {selectedCampaign ? (
            <CampaignDetailsDialog campaign={selectedCampaign} />
          ) : selectedTemplate ? (
            <TemplateDetailsDialog template={selectedTemplate} />
          ) : null}
        </Dialog>

        {/* Analytics Dialog */}
        <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Campaign Analytics: {selectedCampaign?.title}
              </DialogTitle>
            </DialogHeader>
            
            {analytics && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{analytics.delivery?.totalRecipients || 0}</div>
                      <div className="text-sm text-neutral-600">Total Recipients</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{analytics.metrics?.deliveryRate || 0}%</div>
                      <div className="text-sm text-neutral-600">Delivery Rate</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{analytics.metrics?.openRate || 0}%</div>
                      <div className="text-sm text-neutral-600">Open Rate</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{analytics.metrics?.clickRate || 0}%</div>
                      <div className="text-sm text-neutral-600">Click Rate</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Engagement Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Delivery Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Successfully Delivered:</span>
                        <span className="font-medium text-green-600">{analytics.delivery?.sentCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed Delivery:</span>
                        <span className="font-medium text-red-600">{analytics.delivery?.failedCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending:</span>
                        <span className="font-medium text-yellow-600">{analytics.delivery?.pendingCount || 0}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Engagement Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Unique Opens:</span>
                        <span className="font-medium text-blue-600">{analytics.engagement?.uniqueOpens || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Opens:</span>
                        <span className="font-medium">{analytics.engagement?.totalOpens || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Clicks:</span>
                        <span className="font-medium text-purple-600">{analytics.engagement?.totalClicks || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Click-to-Open Rate:</span>
                        <span className="font-medium">{analytics.metrics?.clickToOpenRate || 0}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Campaign Dialog */}
        <Dialog open={isEditCampaignOpen} onOpenChange={setIsEditCampaignOpen}>
          <CampaignDialog 
            form={campaignForm} 
            onSubmit={onUpdateCampaign} 
            isLoading={updateCampaignMutation.isPending}
            units={units || []}
            templates={templates || []}
            isEdit={true}
            recipientType={recipientType}
            selectedUnits={selectedUnits}
            onUnitSelection={handleUnitSelection}
            manualEmails={manualEmails}
            onAddManualEmail={addManualEmail}
            onRemoveManualEmail={removeManualEmail}
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            newName={newName}
            setNewName={setNewName}
          />
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
          <TemplateDialog 
            form={templateForm} 
            onSubmit={onUpdateTemplate} 
            isLoading={updateTemplateMutation.isPending}
            isEdit={true}
          />
        </Dialog>
      </div>
    </Layout>
  );
}

// Campaign Dialog Component with Enhanced Features
function CampaignDialog({ 
  form, 
  onSubmit, 
  isLoading, 
  units, 
  templates,
  isEdit,
  recipientType,
  selectedUnits,
  onUnitSelection,
  manualEmails,
  onAddManualEmail,
  onRemoveManualEmail,
  newEmail,
  setNewEmail,
  newName,
  setNewName
}: { 
  form: any; 
  onSubmit: (data: CampaignFormData) => void; 
  isLoading: boolean;
  units: Unit[];
  templates: Template[];
  isEdit: boolean;
  recipientType: string;
  selectedUnits: number[];
  onUnitSelection: (unitId: number, checked: boolean) => void;
  manualEmails: ManualEmail[];
  onAddManualEmail: () => void;
  onRemoveManualEmail: (index: number) => void;
  newEmail: string;
  setNewEmail: (value: string) => void;
  newName: string;
  setNewName: (value: string) => void;
}) {
  return (
    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Monthly Newsletter - December 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Subject</FormLabel>
                <FormControl>
                  <Input placeholder="Important update from your Strata Council" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recipientType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipients</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All Residents</SelectItem>
                    <SelectItem value="owners">Owners Only</SelectItem>
                    <SelectItem value="tenants">Tenants Only</SelectItem>
                    <SelectItem value="units">Specific Units</SelectItem>
                    <SelectItem value="individual">Individual Recipients</SelectItem>
                    <SelectItem value="manual">Manual Email Addresses</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Unit Selection */}
          {recipientType === "units" && (
            <div className="space-y-2">
              <FormLabel>Select Units</FormLabel>
              <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {units.map((unit) => (
                    <div key={unit.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`unit-${unit.id}`}
                        checked={selectedUnits.includes(unit.id)}
                        onCheckedChange={(checked) => onUnitSelection(unit.id, checked as boolean)}
                      />
                      <label
                        htmlFor={`unit-${unit.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Unit {unit.unitNumber}
                        {unit.floor && ` (Floor ${unit.floor})`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-neutral-600">
                {selectedUnits.length} unit{selectedUnits.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          {/* Manual Email Entry */}
          {recipientType === "manual" && (
            <div className="space-y-2">
              <FormLabel>Manual Email Addresses</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="email@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    type="email"
                  />
                  <Input
                    placeholder="Name (optional)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Button type="button" onClick={onAddManualEmail} size="sm">
                    Add
                  </Button>
                </div>
                
                {manualEmails.length > 0 && (
                  <div className="border rounded-lg p-3 space-y-2">
                    {manualEmails.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-neutral-50 p-2 rounded">
                        <div>
                          <span className="font-medium">{email.email}</span>
                          {email.name && <span className="text-neutral-600 ml-2">({email.name})</span>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveManualEmail(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-sm text-neutral-600">
                  {manualEmails.length} email{manualEmails.length !== 1 ? 's' : ''} added
                </p>
              </div>
            </div>
          )}

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message Content</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter your message content here..." 
                    className="min-h-[200px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

// Template Dialog Component
function TemplateDialog({ 
  form, 
  onSubmit, 
  isLoading,
  isEdit
}: { 
  form: any; 
  onSubmit: (data: TemplateFormData) => void; 
  isLoading: boolean;
  isEdit: boolean;
}) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Template" : "Create New Template"}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Monthly Newsletter Template" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Subject</FormLabel>
                <FormControl>
                  <Input placeholder="Template subject line" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Template Content</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter your template content here..." 
                    className="min-h-[200px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

// Campaigns Tab Component
function CampaignsTab({ 
  campaigns, 
  isLoading, 
  onSendCampaign, 
  isSending,
  getStatusBadge,
  getTypeBadge,
  onViewDetails,
  onViewAnalytics,
  onEdit,
  onDelete
}: {
  campaigns: Campaign[];
  isLoading: boolean;
  onSendCampaign: (id: number) => void;
  isSending: boolean;
  getStatusBadge: (status: string) => JSX.Element;
  getTypeBadge: (type: string) => JSX.Element;
  onViewDetails: (campaign: Campaign) => void;
  onViewAnalytics: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Mail className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
          <p className="text-neutral-600 mb-4">Create your first communication campaign to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{campaign.title}</h3>
                  {getTypeBadge(campaign.type)}
                  {getStatusBadge(campaign.status)}
                </div>
                <p className="text-neutral-600 mb-3">{campaign.subject}</p>
                <div className="flex items-center gap-6 text-sm text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {campaign.totalRecipients} recipients
                  </span>
                  {campaign.sentAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Sent {format(new Date(campaign.sentAt), "MMM dd, yyyy")}
                    </span>
                  )}
                  <span>
                    Created {format(new Date(campaign.createdAt), "MMM dd, yyyy")}
                  </span>
                </div>
                {campaign.status === 'sent' && (
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="text-green-600">✓ {campaign.sentCount} sent</span>
                    {campaign.failedCount > 0 && (
                      <span className="text-red-600">✗ {campaign.failedCount} failed</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {campaign.status === 'draft' && (
                  <Button 
                    size="sm" 
                    onClick={() => onSendCampaign(campaign.id)}
                    disabled={isSending}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(campaign)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewAnalytics(campaign)}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onEdit(campaign)}
                      disabled={campaign.status !== 'draft'}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => onDelete(campaign)}
                      disabled={campaign.status !== 'draft'}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Templates Tab Component
function TemplatesTab({ 
  templates, 
  isLoading,
  getTypeBadge,
  onViewDetails,
  onEdit,
  onDelete
}: {
  templates: Template[];
  isLoading: boolean;
  getTypeBadge: (type: string) => JSX.Element;
  onViewDetails: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
          <p className="text-neutral-600 mb-4">Create templates to quickly compose campaigns.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  {getTypeBadge(template.type)}
                  {template.isDefault && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-neutral-600 mb-3">{template.subject}</p>
                <div className="text-sm text-neutral-500">
                  Created {format(new Date(template.createdAt), "MMM dd, yyyy")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Use Template
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(template)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(template)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => onDelete(template)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Campaign Details Dialog Component
function CampaignDetailsDialog({ campaign }: { campaign: Campaign | null }) {
  if (!campaign) return null;

  return (
    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Campaign Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        {/* Campaign Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Campaign Title</h3>
            <p className="text-lg font-medium">{campaign.title}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Type</h3>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              {campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)}
            </Badge>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Status</h3>
            {(() => {
              switch (campaign.status) {
                case 'draft':
                  return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
                case 'sending':
                  return <Badge variant="default"><Send className="w-3 h-3 mr-1" />Sending</Badge>;
                case 'sent':
                  return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
                case 'failed':
                  return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
                default:
                  return <Badge variant="outline">{campaign.status}</Badge>;
              }
            })()}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Recipients</h3>
            <p className="text-lg font-medium">{campaign.totalRecipients}</p>
          </div>
        </div>

        {/* Subject */}
        <div>
          <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Subject</h3>
          <p className="text-base">{campaign.subject}</p>
        </div>

        {/* Delivery Stats */}
        {campaign.status === 'sent' && (
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Delivery Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{campaign.sentCount}</div>
                <div className="text-sm text-green-600">Delivered</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{campaign.failedCount}</div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((campaign.sentCount / campaign.totalRecipients) * 100)}%
                </div>
                <div className="text-sm text-blue-600">Success Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Created</h3>
            <p className="text-sm">{format(new Date(campaign.createdAt), "MMM dd, yyyy 'at' h:mm a")}</p>
            {campaign.createdBy && (
              <p className="text-xs text-neutral-500">by {campaign.createdBy.fullName}</p>
            )}
          </div>
          {campaign.sentAt && (
            <div>
              <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Sent</h3>
              <p className="text-sm">{format(new Date(campaign.sentAt), "MMM dd, yyyy 'at' h:mm a")}</p>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

// Template Details Dialog Component
function TemplateDetailsDialog({ template }: { template: Template | null }) {
  if (!template) return null;

  return (
    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Template Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        {/* Template Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Template Name</h3>
            <p className="text-lg font-medium">{template.name}</p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Type</h3>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
            </Badge>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Default</h3>
            {template.isDefault ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Default
              </Badge>
            ) : (
              <Badge variant="outline">Not Default</Badge>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Subject</h3>
            <p className="text-base">{template.subject}</p>
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Template Content</h3>
          <p className="text-base">{template.content}</p>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-2">Created</h3>
            <p className="text-sm">{format(new Date(template.createdAt), "MMM dd, yyyy 'at' h:mm a")}</p>
          </div>
        </div>
      </div>
    </DialogContent>
  );
} 