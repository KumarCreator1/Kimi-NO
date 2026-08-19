import { useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "../contexts/AuthContext";
import { loginSchema } from "../validations/userValidation";

import StatusBanner from "../../components/registerUser/StatusBanner";

export default function Login() {
  const [apiError, setApiError] = useState("");

  // Bring in setUser from our AuthContext
  const { setUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data) => {
    setApiError("");

    try {
      // 1. Hit the real backend endpoint
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/user/login`,
        {
          email: data.email,
          password: data.password,
        },
      );

      // 2. Update global auth state with the returned user data
      // Because we use <PublicRoute>, updating this state will immediately
      // and automatically redirect the user to the /class page.
      const loggedInUser = response.data?.data?.user;
      setUser(loggedInUser);
    } catch (err) {
      console.error("Login error:", err);
      setApiError(
        err.response?.data?.message ||
          "Failed to sign in. Please check your credentials.",
      );
    }
  };

  return (
    <div className="w-full h-full flex flex-col ">
      {/* NAVBAR */}
      <div className="flex justify-center items-center pt-6 px-4 flex-shrink-0">
        <p className="text-white font-manrope text-2xl font-bold tracking-[0.1em]">
          KIMI NO
        </p>
      </div>

      {/* CENTER CONTENT */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0">
        <div className="w-full max-w-sm p-8 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 flex flex-col gap-6 text-white">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-1">Welcome</h1>
            <p className="text-white/80 text-sm">Sign in to continue</p>
          </div>

          <StatusBanner type="error" message={apiError} />

          <form
            className="flex flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* EMAIL FIELD */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/90 font-medium">Email</label>
              <input
                type="email"
                {...register("email")}
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border transition-all placeholder:text-white/50 text-white focus:outline-none
                  ${
                    errors.email
                      ? "border-red-500/50 focus:bg-red-500/10 focus:border-red-500/70"
                      : "border-white/20 focus:bg-white/20 focus:border-white/40"
                  }`}
                placeholder="mitsuha@itokori.com"
              />
              {errors.email && (
                <span className="text-xs text-red-300 mt-1">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* PASSWORD FIELD */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/90 font-medium">
                Password
              </label>
              <input
                type="password"
                {...register("password")}
                className={`w-full px-4 py-3 rounded-xl bg-white/10 border transition-all placeholder:text-white/50 text-white focus:outline-none
                  ${
                    errors.password
                      ? "border-red-500/50 focus:bg-red-500/10 focus:border-red-500/70"
                      : "border-white/20 focus:bg-white/20 focus:border-white/40"
                  }`}
                placeholder="••••••••"
              />
              {errors.password && (
                <span className="text-xs text-red-300 mt-1">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`relative mt-2 w-full h-[52px] rounded-xl border border-white/30 backdrop-blur-md font-semibold transition-all shadow-lg flex justify-center items-center overflow-hidden group
                ${isSubmitting ? "opacity-80 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
            >
              <img
                src="/output.gif"
                alt="button animation"
                className="absolute inset-0 w-full h-full object-cover -z-10 opacity-70 group-hover:opacity-100 transition-opacity"
              />

              {isSubmitting ? (
                <svg
                  className="animate-spin h-6 w-6 text-white relative z-10"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <span className="relative z-10 text-white font-extrabold text-xl">
                  Sign In
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
