import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ViolationDetail } from "@/components/violation-detail";
import { useAuth } from "@/hooks/use-auth";
import { ChevronLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function ViolationDetailPage() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const params = useParams();
  const id = params.id;

  const {
    isLoading: violationLoading,
  } = useQuery({
    queryKey: ["violation", id],
    queryFn: () => apiRequest("GET", `/api/violations/${id}`),
    enabled: !!id,
  });

  if (isLoading || violationLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>You must be logged in to view this page.</div>;
  }
  
  // Extract the violation ID from the URL
  const violationId = location.split("/").pop();
  
  const BackButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate("/violations")}
    >
      <ChevronLeft className="h-5 w-5" />
    </Button>
  );
  
  return (
    <Layout title="Violation Details" leftContent={BackButton}>
      <div className="max-w-6xl mx-auto">
        {violationId && <ViolationDetail id={violationId} />}
      </div>
    </Layout>
  );
}
