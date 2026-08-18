export default function InputField({ label, type = "text", placeholder, registration, error, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-white/90 font-medium">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        {...registration}
        className={`w-full px-4 py-3 rounded-xl bg-white/10 border transition-all placeholder:text-white/50 text-white focus:outline-none
          ${error 
            ? 'border-red-500/50 focus:bg-red-500/10 focus:border-red-500/70' 
            : 'border-white/20 focus:bg-white/20 focus:border-white/40'
          }`}
      />
      {error && (
        <span className="text-xs text-red-300 mt-1">
          {error.message}
        </span>
      )}
      {hint && hint}
    </div>
  );
}