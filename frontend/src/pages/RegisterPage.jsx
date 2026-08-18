import { useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "../../src/validations/userValidation";

import InputField from "../../components/registerUser/InputFields";
import StatusBanner from "../../components/registerUser/StatusBanner";

export default function RegisterUser({ onSuccess }) {
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data) => {
    setApiError("");
    setSuccess(false);

    const baseUrl = import.meta.env.VITE_BACKEND_URL;

    try {
      // 1. Register the user
      await axios.post(`${baseUrl}/api/v1/user/register`, {
        firstName: data.firstName,
        lastName: data.lastName || "",
        email: data.email,
        password: data.password,
      });

      // 2. Immediately log the user in
      // (Assuming a standard login endpoint that sets a cookie or returns a session)
      await axios.post(`${baseUrl}/api/v1/user/login`, {
        email: data.email,
        password: data.password,
      });

      setSuccess(true);
      reset();

      // Execute the onSuccess callback (e.g., redirect to Home/ClassList)
      if (onSuccess) {
        // A slight delay provides a better UX so they can read the success message
        setTimeout(onSuccess, 1000);
      }
    } catch (err) {
      console.error("Registration/Login error:", err);
      setApiError(
        err.response?.data?.message ||
          "Failed to complete registration. Please try again.",
      );
    }
  };

  const passwordHint = (
    <div className="text-xs text-white/60 bg-white/5 p-3 rounded-lg mt-1">
      <p className="font-semibold mb-2">Password must contain:</p>
      <ul className="space-y-1 text-white/50">
        <li>• At least 8 characters</li>
        <li>• One uppercase letter (A-Z)</li>
        <li>• One lowercase letter (a-z)</li>
        <li>• One number (0-9)</li>
      </ul>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-[#111418] to-[#111418]">
      {/* NAVBAR */}
      <div className="flex justify-center items-center pt-6 px-4 flex-shrink-0">
        <p className="text-white font-manrope text-2xl font-bold tracking-[0.1em]">
          KIMI NO
        </p>
      </div>

      {/* CENTER CONTENT */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0 overflow-y-auto">
        <div className="w-full max-w-sm p-8 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 flex flex-col gap-6 text-white flex-shrink-0">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Join the search</h1>
            <p className="text-white/80 text-sm">
              Create an account to find your thread.
            </p>
          </div>

          {success && (
            <StatusBanner
              type="success"
              message="Registration successful! Logging you in..."
            />
          )}

          {apiError && <StatusBanner type="error" message={apiError} />}

          <form
            className="flex flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            <InputField
              label="First Name"
              placeholder="Mitsuha"
              registration={register("firstName")}
              error={errors.firstName}
            />

            <InputField
              label="Last Name (Optional)"
              placeholder="Miyamizu"
              registration={register("lastName")}
              error={errors.lastName}
            />

            <InputField
              label="Email"
              type="email"
              placeholder="mitsuha@itokori.com"
              registration={register("email")}
              error={errors.email}
            />

            <InputField
              label="Password"
              type="password"
              placeholder="••••••••"
              registration={register("password")}
              error={errors.password}
              hint={passwordHint}
            />

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting || success}
              className={`relative mt-2 w-full h-[52px] rounded-xl border border-white/30 backdrop-blur-md font-semibold transition-all shadow-lg flex justify-center items-center overflow-hidden group
                ${isSubmitting || success ? "opacity-80 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}`}
            >
              <img
                src="/output.gif"
                alt="button animation"
                className="absolute inset-0 w-full h-full object-cover -z-10 opacity-70 group-hover:opacity-100"
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
                <span className="relative z-10 text-white font-extrabold text-lg">
                  REGISTER
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
