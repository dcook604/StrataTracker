import { Layout } from "@/components/layout";
import { ViolationsList } from "@/components/violations-list";
import { useQueryParams } from "@/hooks/use-query-params";

export default function AllViolationsPage() {
  const { queryParams } = useQueryParams();
  const unitFilter = queryParams.get("unit") ? ` - Unit ${queryParams.get("unit")}` : "";
  
  return (
    <Layout title={`All Violations${unitFilter}`}>
      <ViolationsList />
    </Layout>
  );
}
