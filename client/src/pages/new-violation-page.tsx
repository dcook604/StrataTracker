import { Layout } from "@/components/layout";
import { ViolationForm } from "@/components/violation-form";

export default function NewViolationPage() {
  return (
    <Layout title="New Violation">
          <ViolationForm />
    </Layout>
  );
}
