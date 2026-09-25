// src/pages/LandingPage.jsx

import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/class");
    } else {
      navigate("/register");
    }
  };

  const handleLogin = () => {
    if (user) {
      navigate("/class");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* NAVBAR */}
      <div className="flex justify-center items-center pt-6 px-4 flex-shrink-0">
        <p className="text-white font-manrope text-2xl font-bold tracking-[0.1em]">
          KIMI NO
        </p>
      </div>

      {/* MIDDLE SPACER - Grows to fill space */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        {/* Anime background area */}
      </div>

      {/* TEXT & ACTION SECTION - Pinned to bottom */}
      <div className="px-6 pb-8 pt-2 flex flex-col gap-6 flex-shrink-0">
        {/* TEXT SECTION */}
        <div>
          <p className="text-[#BAD3E3] font-roboto text-5xl font-medium leading-tight">
            Search your Mitsuha
          </p>
        </div>

        {/* BUTTON SECTION */}
        <div className="flex flex-col gap-3 w-full">
          {/* GET STARTED BUTTON */}
          <button
            type="button"
            onClick={handleGetStarted}
            disabled={isLoading}
            className="w-full py-3.5 px-12 rounded-full border border-white/30 bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-[0.98] transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="text-white font-hankenGrotesk text-xs font-bold tracking-[0.15em]">
              {user ? "GO TO CLASSES" : "GET STARTED"}
            </p>
          </button>

          {/* LOGIN BUTTON - Visible only when no active session */}
          {!isLoading && !user && (
            <button
              type="button"
              onClick={handleLogin}
              className="w-full py-3.5 px-12 rounded-full border border-[#BAD3E3]/40 bg-[#BAD3E3]/20 hover:bg-[#BAD3E3]/30 backdrop-blur-md active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              <p className="text-[#BAD3E3] font-hankenGrotesk text-xs font-bold tracking-[0.15em]">
                LOG IN
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
