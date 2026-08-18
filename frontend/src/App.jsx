import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Landing from '../src/pages/LandingPage';
import Login from '../src/pages/LoginPage';
import RegisterUser from '../src/pages/RegisterPage';
import ClassList from '../src/pages/ClassList';

// Guards
import ProtectedRoute from '../components/shared/ProtectedRoute';
import PublicRoute from '../components/shared/PublicRoute';

/**
 * AppLayout preserves your exact "Phone Frame" UI and background.
 * The <Outlet /> is where the router injects the current page.
 */
function AppLayout() {
  return (
    <div className="w-full h-screen bg-[#082c4f] flex justify-center items-center sm:p-6 overflow-hidden">
      
      {/* Phone Frame Container */}
      <div className="relative w-full h-full max-w-[430px] sm:h-[850px] sm:max-h-[90vh] bg-[#3fa5dd] sm:rounded-[2.5rem] sm:border-[8px] border-gray-900 shadow-2xl flex flex-col">
        
        {/* FIXED BACKGROUND */}
        <img
          src="/untitled.png"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
          alt="App background"
        />

        {/* CONTENT AREA - Router injects the active page here */}
        <div className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
        
      </div>

    </div>
  );
}

// Router Configuration
const router = createBrowserRouter([
  {
    // The Layout wraps ALL routes
    element: <AppLayout />, 
    children: [
      {
        path: "/",
        element: <Landing />,
      },
      {
        // PublicRoute kicks logged-in users away from Login/Register
        element: <PublicRoute />,
        children: [
          { path: "/login", element: <Login /> },
          { path: "/register", element: <RegisterUser /> },
        ]
      },
      {
        // ProtectedRoute prevents logged-out users from seeing classes
        element: <ProtectedRoute />,
        children: [
          { path: "/class", element: <ClassList /> },
        ]
      }
    ]
  }
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}