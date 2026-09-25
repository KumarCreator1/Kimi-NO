import { NavLink } from "react-router-dom";
import { HomeIcon, SearchIcon, FolderIcon } from "lucide-react";

export default function BottomNav() {
  // Shared styling logic for active vs inactive tabs
  const getNavClass = ({ isActive }) =>
    `flex items-center justify-center w-12 h-12 rounded-xl border transition-all shadow-md ${
      isActive
        ? "bg-white/15 border-white/30 text-white"
        : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/15"
    }`;

  return (
    <div className="h-20 flex justify-around items-center px-6 py-3 bg-[#111418]/80 backdrop-blur-xl border-t border-white/10 flex-shrink-0 z-50">
      <NavLink to="/class" className={getNavClass}>
        <HomeIcon className="w-6 h-6" />
      </NavLink>

      <NavLink to="/search" className={getNavClass}>
        <SearchIcon className="w-6 h-6" />
      </NavLink>

      <NavLink to="/files" className={getNavClass}>
        <FolderIcon className="w-6 h-6" />
      </NavLink>
    </div>
  );
}
