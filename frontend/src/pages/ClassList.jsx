import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon, UserIcon } from "lucide-react";

import ClassCard from "../../components/classes/ClassCard";
import BottomNav from "../../components/shared/BottomNav";
import AddClassModal from "../../components/classes/AddClassModal";

export default function ClassList() {
  const navigate = useNavigate();

  // 1. Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data utilizing UUIDs
  const [classes, setClasses] = useState([
    { id: "uuid-1", name: "Computer Science 101", subjects: 5, students: 32 },
    { id: "uuid-2", name: "Data Structures", subjects: 8, students: 28 },
    { id: "uuid-3", name: "Web Development", subjects: 6, students: 35 },
  ]);

  const handleNavigateToClass = (classId) => {
    navigate(`/class/${classId}`);
  };

  // 2. Logic to handle the new class creation
  const handleAddNewClass = (newClassName) => {
    // Generate a mock ID for the UI. You will replace this with the real backend response later.
    const newClass = {
      id: `uuid-${Date.now()}`,
      name: newClassName,
      subjects: 0, // Starts empty
      students: 1, // At least the creator is a student
    };

    // Prepend the new class so it shows up at the top of the list
    setClasses([newClass, ...classes]);
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* TOP NAVBAR */}
      <div className="flex justify-between items-center pt-6 px-6 pb-4 flex-shrink-0">
        <p className="text-white font-manrope text-2xl font-bold tracking-[0.1em]">
          KIMI NO
        </p>
        <button
          className="flex justify-center items-center w-10 h-10 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 transition-colors focus:outline-none"
          aria-label="Profile Settings"
        >
          <UserIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 min-h-0">
        {/* HEADER AREA WITH ADD BUTTON */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-white font-roboto text-3xl font-bold">
              Your Classes
            </h1>
            <p className="text-[#055688] text-sm font-bold mt-1">
              Manage and explore your classes
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#fff]/40 border border-[#BAD3E3]/40 hover:bg-[#BAD3E3]/30 active:scale-[0.95] transition-all shadow-lg"
          >
            <PlusIcon className="w-4 h-4 text-[#000000]" />
            <span className="text-[#0a517d] font-hankenGrotesk text-xs font-bold tracking-wider">
              ADD
            </span>
          </button>
        </div>

        {/* LIST AREA */}
        <div className="space-y-4 pb-4">
          {classes.length === 0 ? (
            <div className="text-center p-8 rounded-2xl border border-white/10 bg-white/5">
              <p className="text-white/50 text-sm">No classes found.</p>
            </div>
          ) : (
            classes.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                onClick={handleNavigateToClass}
              />
            ))
          )}
        </div>
      </div>

      {/* EXTRACTED BOTTOM NAVBAR */}
      <BottomNav />

      {/* MODAL MOUNTED HERE */}
      <AddClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddClass={handleAddNewClass}
      />
    </div>
  );
}
