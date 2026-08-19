export default function StatusBanner({ type, message }) {
  if (!message) return null;

  const isSuccess = type === "success";

  return (
    <div
      className={`px-4 py-3 rounded-xl border ${
        isSuccess
          ? "bg-green-500/20 border-green-500/40 text-green-100"
          : "bg-red-500/20 border-red-500/40 text-red-100"
      }`}
    >
      <p className="text-sm text-center font-medium">{message}</p>
    </div>
  );
}
