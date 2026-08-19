import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../src/contexts/AuthContext";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#111418] flex items-center justify-center">
        {/* Replace with your app's actual spinner or skeleton loader */}
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
