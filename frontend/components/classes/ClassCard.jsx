import { FolderIcon, ChevronRightIcon } from "lucide-react";

export default function ClassCard({ classItem, onClick }) {
  return (
    <button
      onClick={() => onClick(classItem.id)}
      className="text-left w-full p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 hover:border-white/40 hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-[#BAD3E3]/50 active:scale-[0.98]"
    >
      <div className="flex flex-col gap-4">
        {/* TOP SECTION - Folder Icon + Class Name */}
        <div className="flex items-start gap-3">
          {/* Folder Icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-white/15 border border-white/30 hover:bg-[#BAD3E3]/20 transition-colors">
            <FolderIcon className="w-7 h-7 text-white hover:text-[#BAD3E3] transition-colors" />
          </div>

          {/* Class Name */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-roboto text-base sm:text-lg font-bold leading-tight line-clamp-2">
              {classItem.name}
            </h3>
          </div>
        </div>

        {/* BOTTOM SECTION - Stats and Action Button */}
        <div className="flex items-end justify-between gap-4 pt-4 border-t border-white/10">
          {/* Left - Info Text */}
          <div className="flex flex-col gap-3">
            {/* Number of Subjects */}
            <p className="text-white/80 font-roboto text-sm">
              <span className="font-bold text-white">{classItem.subjects}</span>
              <span className="text-white/60"> Subjects</span>
            </p>

            {/* Number of Students */}
            <p className="text-white/80 font-roboto text-sm">
              <span className="font-bold text-white">{classItem.students}</span>
              <span className="text-white/60"> Students</span>
            </p>
          </div>

          {/* Right - Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(classItem.id);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#BAD3E3]/20 border border-[#064e7b] hover:bg-[#58839e] hover:border-[#BAD3E3]/60 text-[#01578d] font-roboto text-xs sm:text-sm font-semibold transition-all hover:translate-x-0.5 active:scale-95 flex-shrink-0"
          >
            See all
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </button>
  );
}
