import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the full path + query string (e.g., ?invite=TOKEN) so sign-in can redirect back
    const returnTo = location.pathname + location.search;
    return <Navigate to={`/signin?from=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <Outlet />;
}
