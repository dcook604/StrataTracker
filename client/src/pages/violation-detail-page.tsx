import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ViolationDetail } from "@/components/violation-detail";
import { useAuth } from "@/hooks/use-auth";
import { ChevronLeft } from "lucide-react";

export default function ViolationDetailPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
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
