import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../src/contexts/AuthContext";
import FunnyLoader from "./FunnyLoader";

export default function PublicRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#111418] flex items-center justify-center">
        <FunnyLoader />
      </div>
    );
  }

  if (user) {
    // If they have a session, bounce them to their classes
    return <Navigate to="/class" replace />;
  }

  return <Outlet />;
}
