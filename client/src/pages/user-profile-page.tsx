import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";

export default function UserProfilePage() {
  const { user } = useAuth();

  return (
    <Layout title="User Profile">
      <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-4">User Profile</h2>
        <div>
          <div className="mb-2"><strong>Name:</strong> {user?.fullName}</div>
          <div className="mb-2"><strong>Email:</strong> {user?.email}</div>
          {/* Add more user info or edit form as needed */}
        </div>
      </div>
    </Layout>
  );
} 