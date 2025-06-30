import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});


type LoginFormValues = z.infer<typeof loginSchema>;

// Helper function to set no-cache meta tags
const setNoCacheMeta = () => {
  if (typeof document === 'undefined') return;
  
  // Remove existing cache control meta tags
  const existingTags = document.querySelectorAll('meta[http-equiv]');
  existingTags.forEach(tag => {
    const httpEquiv = tag.getAttribute('http-equiv');
    if (httpEquiv === 'Cache-Control' || httpEquiv === 'Pragma' || httpEquiv === 'Expires') {
      tag.remove();
    }
  });
  
  // Add comprehensive no-cache meta tags
  const metaTags = [
    { httpEquiv: 'Cache-Control', content: 'no-store, no-cache, must-revalidate, private, max-age=0' },
    { httpEquiv: 'Pragma', content: 'no-cache' },
    { httpEquiv: 'Expires', content: '0' },
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' }
  ];
  
  metaTags.forEach(({ httpEquiv, name, content }) => {
    const meta = document.createElement('meta');
    if (httpEquiv) meta.setAttribute('http-equiv', httpEquiv);
    if (name) meta.setAttribute('name', name);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  });
  
  console.log('[AuthPage] No-cache meta tags set');
};

// Helper function to remove no-cache meta tags when leaving auth page
const removeNoCacheMeta = () => {
  if (typeof document === 'undefined') return;
  
  const cacheMetaTags = document.querySelectorAll('meta[http-equiv="Cache-Control"], meta[http-equiv="Pragma"], meta[http-equiv="Expires"], meta[name="robots"][content*="noindex"]');
  cacheMetaTags.forEach(tag => tag.remove());
  
  console.log('[AuthPage] No-cache meta tags removed');
};

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
    // Set no-cache meta tags when auth page loads
    setNoCacheMeta();
    
    // Cleanup function to remove meta tags when component unmounts
    return () => {
      removeNoCacheMeta();
    };
  }, []);

  // Enhanced modal state management for production
  useEffect(() => {
    if (!isClient) return; // Only run on client side
    
    const urlParams = new URLSearchParams(window.location.search);
    const hasExpiredParam = urlParams.get('expired') === '1';
    
    console.log('[AuthPage] URL check:', { hasExpiredParam, currentModal: showExpiredModal });
    
    if (hasExpiredParam && !showExpiredModal) {
      console.log('[AuthPage] Session expired detected, showing modal');
      setShowExpiredModal(true);
      // Clean URL immediately to prevent issues
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('expired');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
    } else if (!hasExpiredParam && showExpiredModal) {
      console.log('[AuthPage] No expired parameter, hiding modal');
      setShowExpiredModal(false);
    }
  }, [isClient, showExpiredModal]);

  // Handle successful authentication
  useEffect(() => {
    if (!isClient) return; // Only run on client side
    
    console.log('[AuthPage] User state changed:', { 
      user: user ? `${user.email} (${user.profile?.role})` : null,
      isLoading: loginMutation.isPending 
    });
    
    if (user) {
      console.log('[AuthPage] User authenticated, navigating to dashboard...');
      navigate("/");
    }
  }, [user, navigate, isClient]);

  // Handle URL parameters (logout success/error)
  useEffect(() => {
    if (!isClient) return; // Only run on client side
    
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle logout success
    if (urlParams.get('logout') === 'success') {
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out. Please sign in again to continue.",
        duration: 4000,
      });
      // Clean the URL
      window.history.replaceState({}, '', '/auth');
    }
    
    // Handle logout error
    if (urlParams.get('logout') === 'error') {
      toast({
        title: "Logout completed with issues",
        description: "You have been logged out, but there may have been connection issues. Please sign in again.",
        variant: "destructive",
        duration: 5000,
      });
      // Clean the URL
      window.history.replaceState({}, '', '/auth');
    }
  }, [toast, isClient]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });


  // Handle login submission
  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      console.log('[AuthPage] Starting login process...');
      setIsLoading(true);
      setError(null);
      
      const result = await loginMutation.mutateAsync({
        email: values.email,
        password: values.password,
      });
      
      console.log('[AuthPage] Login mutation successful:', { 
        userId: result.user?.id,
        email: result.user?.email 
      });
      
    } catch (err) {
      console.error('[AuthPage] Login failed:', err);
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpiredModalClose = () => {
    console.log('[AuthPage] Closing expired modal');
    setShowExpiredModal(false);
    // Ensure URL is completely clean
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/auth');
    }
  };

  // Show loading state during hydration to prevent FOUC
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // If user is already set, show loading until navigation completes
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <Card className="w-full max-w-md">
          {/* Logo Placement */}
          <div className="pt-8 pb-4">
            <img 
              src="/spectrum4-small.jpeg" 
              alt="Spectrum 4 Logo" 
              className="h-56 w-auto mx-auto"
            />
          </div>
          <CardHeader className="space-y-1 text-center pt-0">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter your email" 
                        disabled={isLoading}
                        {...field} 
                      />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your password" 
                        disabled={isLoading}
                        {...field} 
                      />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>Only administrators can add new users to the system.</p>
                <p>Contact your administrator if you need access.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Only render modal on client side to prevent hydration mismatch */}
      {isClient && (
        <AlertDialog open={showExpiredModal} onOpenChange={setShowExpiredModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Session Expired</AlertDialogTitle>
              <AlertDialogDescription>
                Your session has expired. Please log in again to continue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleExpiredModalClose}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
