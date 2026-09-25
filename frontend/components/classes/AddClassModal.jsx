import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { XIcon } from "lucide-react";

import { classSchema } from "../../src/validations/userValidation";

export default function AddClassModal({ isOpen, onClose, onAddClass }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(classSchema),
  });

  if (!isOpen) return null;

  const onSubmit = async (data) => {
    // Pass the valid data back to the parent component
    await onAddClass(data.className);
    reset(); // Clear the input field
    onClose(); // Close the modal
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000]/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-sm bg-[#111418] border border-white/20 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* CLOSE BUTTON */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* MODAL HEADER */}
        <div className="mb-6">
          <h2 className="text-white font-roboto text-2xl font-bold">
            New Class
          </h2>
          <p className="text-white/60 text-sm mt-1">
            Enter the name of the class.
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/90 font-medium">
              Class Name
            </label>
            <input
              type="text"
              placeholder="e.g. Operating Systems"
              {...register("className")}
              className={`w-full px-4 py-3 rounded-xl bg-white/10 border transition-all placeholder:text-white/50 text-white focus:outline-none
                ${
                  errors.className
                    ? "border-red-500/50 focus:bg-red-500/10 focus:border-red-500/70"
                    : "border-white/20 focus:bg-white/20 focus:border-white/40"
                }`}
            />
            {errors.className && (
              <span className="text-xs text-red-300 mt-1">
                {errors.className.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-[#BAD3E3]/20 border border-[#BAD3E3]/40 text-[#BAD3E3] hover:bg-[#BAD3E3]/30 font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
          >
            CREATE CLASS
          </button>
        </form>
      </div>
    </div>
  );
}
