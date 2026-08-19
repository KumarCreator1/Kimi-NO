export default function Landing() {
  return (
    <div className="w-full h-full flex flex-col ">
      {/* NAVBAR */}
      <div className="flex justify-center items-center pt-6 px-4">
        <p className="text-white font-manrope text-2xl font-bold tracking-[0.1em]">
          KIMI NO
        </p>
      </div>

      {/* MIDDLE SPACER - Grows to fill space */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        {/* Anime background area */}
      </div>

      {/* TEXT SECTION */}
      <div className="px-6 py-6">
        <p className="text-[#BAD3E3] font-roboto text-5xl font-medium leading-tight">
          Search your Mitsuha
        </p>
      </div>

      {/* BUTTON SECTION - Pinned to bottom */}
      <div className="px-6 pb-8 pt-2">
        <button className="w-full py-3 px-12 rounded-full border border-[rgba(255,255,255,0.30)] bg-transparent backdrop-blur-sm hover:bg-white/5 transition-colors">
          <p className="text-white font-hankenGrotesk text-xs font-semibold tracking-[0.1em]">
            GET STARTED
          </p>
        </button>
      </div>
    </div>
  );
}
