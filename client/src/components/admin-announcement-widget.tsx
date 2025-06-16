import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { 
  Megaphone, 
  Plus, 
  Edit, 
  ChevronUp, 
  ChevronDown,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface AdminAnnouncement {
  id: number;
  title: string;
  content: any; // JSON content
  htmlContent: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

const announcementIcons = {
  default: Info,
  urgent: AlertCircle,
  success: CheckCircle,
  maintenance: Clock,
};

const getAnnouncementType = (title: string, content: string): keyof typeof announcementIcons => {
  const text = (title + ' ' + content).toLowerCase();
  if (text.includes('urgent') || text.includes('critical') || text.includes('important')) return 'urgent';
  if (text.includes('maintenance') || text.includes('update') || text.includes('scheduled')) return 'maintenance';
  if (text.includes('success') || text.includes('completed') || text.includes('resolved')) return 'success';
  return 'default';
};

export function AdminAnnouncementWidget() {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { 
    data: announcements, 
    isLoading, 
    error 
  } = useQuery<AdminAnnouncement[]>({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const response = await fetch('/api/admin-announcements');
      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }
      return response.json();
    },
  });

  const isAdmin = user?.isAdmin;

  if (error) {
    console.error('Error fetching announcements:', error);
    return null; // Fail silently for announcements
  }

  if (isLoading) {
    return (
      <Card className="w-full mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-6" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!announcements || announcements.length === 0) {
    // Only show "no announcements" to admins
    if (!isAdmin) return null;
    
    return (
      <Card className="w-full mb-6 border-dashed border-2 border-neutral-300">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Megaphone className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">No Announcements</h3>
            <p className="text-neutral-500 mb-4">Create your first announcement to communicate with all users.</p>
            <Link href="/settings/announcements">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-6 shadow-sm border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-semibold text-neutral-800">
              Announcements
            </CardTitle>
            {announcements.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {announcements.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/settings/announcements">
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          <ScrollArea className="max-h-80">
            <div className="space-y-4">
              {announcements.map((announcement) => {
                const type = getAnnouncementType(announcement.title, announcement.htmlContent);
                const Icon = announcementIcons[type];
                
                return (
                  <div
                    key={announcement.id}
                    className={cn(
                      "p-4 rounded-lg border-l-4 bg-neutral-50",
                      type === 'urgent' && "border-l-red-500 bg-red-50",
                      type === 'success' && "border-l-green-500 bg-green-50",
                      type === 'maintenance' && "border-l-orange-500 bg-orange-50",
                      type === 'default' && "border-l-blue-500 bg-blue-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn(
                        "h-5 w-5 mt-0.5 flex-shrink-0",
                        type === 'urgent' && "text-red-600",
                        type === 'success' && "text-green-600",
                        type === 'maintenance' && "text-orange-600",
                        type === 'default' && "text-blue-600"
                      )} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-neutral-900 mb-2">
                          {announcement.title}
                        </h4>
                        <div 
                          className="prose prose-sm max-w-none text-neutral-700"
                          dangerouslySetInnerHTML={{ __html: announcement.htmlContent }}
                        />
                        <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
                          <span>
                            Updated {format(new Date(announcement.updatedAt), 'MMM d, yyyy')}
                          </span>
                          {announcement.priority > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Priority: {announcement.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
} 