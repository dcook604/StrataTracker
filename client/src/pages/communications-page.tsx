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
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Form schemas
const campaignSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["newsletter", "announcement", "update", "emergency"]),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  recipientType: z.enum(["all", "owners", "tenants", "units", "individual"]),
  unitIds: z.array(z.number()).optional(),
  personIds: z.array(z.number()).optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
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

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form instances
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

  // Queries
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/communications/campaigns'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/communications/campaigns");
      return res.json();
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ['/api/communications/templates'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/communications/templates");
      return res.json();
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ['/api/communications/units'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/communications/units");
      return res.json();
    },
  });

  // Mutations
  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const res = await apiRequest("POST", "/api/communications/campaigns", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communications/campaigns'] });
      setIsCreateCampaignOpen(false);
      campaignForm.reset();
      toast({ title: "Success", description: "Campaign created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create campaign", variant: "destructive" });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await apiRequest("POST", "/api/communications/templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communications/templates'] });
      setIsCreateTemplateOpen(false);
      templateForm.reset();
      toast({ title: "Success", description: "Template created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create template", variant: "destructive" });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const res = await apiRequest("POST", `/api/communications/campaigns/${campaignId}/send`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communications/campaigns'] });
      toast({ title: "Success", description: "Campaign sending started" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send campaign", variant: "destructive" });
    },
  });

  const onCreateCampaign = (data: CampaignFormData) => {
    createCampaignMutation.mutate(data);
  };

  const onCreateTemplate = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'sending':
        return <Badge variant="default"><Send className="w-3 h-3 mr-1" />Sending</Badge>;
      case 'sent':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colorMap = {
      newsletter: "bg-blue-100 text-blue-800",
      announcement: "bg-yellow-100 text-yellow-800",
      update: "bg-green-100 text-green-800",
      emergency: "bg-red-100 text-red-800",
    };
    return (
      <Badge variant="outline" className={colorMap[type as keyof typeof colorMap] || ""}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <Layout title="Communications">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Communications</h1>
            <p className="text-neutral-600">Manage newsletters, announcements, and updates to residents</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <TemplateDialog 
                form={templateForm} 
                onSubmit={onCreateTemplate} 
                isLoading={createTemplateMutation.isPending}
              />
            </Dialog>
            <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <CampaignDialog 
                form={campaignForm} 
                onSubmit={onCreateCampaign} 
                isLoading={createCampaignMutation.isPending}
                units={units}
                templates={templates}
              />
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <CampaignsTab 
              campaigns={campaigns} 
              isLoading={campaignsLoading}
              onSendCampaign={(id) => sendCampaignMutation.mutate(id)}
              isSending={sendCampaignMutation.isPending}
              getStatusBadge={getStatusBadge}
              getTypeBadge={getTypeBadge}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <TemplatesTab 
              templates={templates} 
              isLoading={templatesLoading}
              getTypeBadge={getTypeBadge}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Campaign Dialog Component
function CampaignDialog({ 
  form, 
  onSubmit, 
  isLoading, 
  units, 
  templates 
}: { 
  form: any; 
  onSubmit: (data: CampaignFormData) => void; 
  isLoading: boolean;
  units: any[];
  templates: Template[];
}) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Campaign</DialogTitle>
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
                    <Input placeholder="Monthly Newsletter" {...field} />
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
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
  isLoading 
}: { 
  form: any; 
  onSubmit: (data: TemplateFormData) => void; 
  isLoading: boolean;
}) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Template</DialogTitle>
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
  getTypeBadge
}: {
  campaigns: Campaign[];
  isLoading: boolean;
  onSendCampaign: (id: number) => void;
  isSending: boolean;
  getStatusBadge: (status: string) => JSX.Element;
  getTypeBadge: (type: string) => JSX.Element;
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
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
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
  getTypeBadge
}: {
  templates: Template[];
  isLoading: boolean;
  getTypeBadge: (type: string) => JSX.Element;
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
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
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