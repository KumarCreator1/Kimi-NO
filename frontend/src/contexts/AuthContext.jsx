import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // This endpoint should verify the HttpOnly cookie and return user details
        // withCredentials ensures the cookie is sent automatically
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/v1/user/me`, 
          { withCredentials: true }
        );
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easy access in your components
export const useAuth = () => useContext(AuthContext);