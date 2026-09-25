import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../src/contexts/AuthContext";
import FunnyLoader from "./FunnyLoader";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#111418] flex items-center justify-center">
        <FunnyLoader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
