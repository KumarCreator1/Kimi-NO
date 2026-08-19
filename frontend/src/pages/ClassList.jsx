import { useState } from "react";
import { FolderIcon, ChevronRightIcon } from "lucide-react";

export default function ClassList() {
  const [classes] = useState([
    { id: 1, name: "Computer Science 101", subjects: 5, students: 32 },
    { id: 2, name: "Data Structures", subjects: 8, students: 28 },
    { id: 3, name: "Web Development", subjects: 6, students: 35 },
    { id: 4, name: "Machine Learning", subjects: 7, students: 25 },
  ]);

  const handleSeeAllSubjects = (classId, className) => {
    console.log(`Navigate to: ${className} (ID: ${classId})`);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* NAVBAR */}
      <div className="flex justify-between items-center pt-6 px-6 pb-4 flex-shrink-0">
        <p className="text-white font-manrope text-2xl font-bold tracking-[0.1em]">
          KIMI NO
        </p>
        <button className="flex justify-center items-center w-10 h-10 rounded-full border border-white/30 bg-white/10">
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 min-h-0">
        <div className="mb-6">
          <h1 className="text-white font-roboto text-3xl font-bold">
            Your Classes
          </h1>
          <p className="text-white/80 text-sm mt-2">
            Manage and explore your classes
          </p>
        </div>

        <div className="space-y-4 pb-4">
          {classes.map((classItem) => (
            <div
              key={classItem.id}
              className="group relative w-full p-5 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 hover:border-white/40 transition-all"
            >
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex-1 flex gap-4">
                  <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 border border-white/30">
                    <FolderIcon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-roboto text-lg font-bold leading-tight mb-3">
                      {classItem.name}
                    </h3>

                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-white/75 font-hankenGrotesk text-xs font-semibold">
                          SUBJECTS
                        </p>
                        <span className="text-white font-roboto text-sm font-bold bg-white/10 px-2 py-1 rounded-md">
                          {classItem.subjects}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-white/75 font-hankenGrotesk text-xs font-semibold">
                          STUDENTS
                        </p>
                        <span className="text-white font-roboto text-sm font-bold bg-white/10 px-2 py-1 rounded-md">
                          {classItem.students}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleSeeAllSubjects(classItem.id, classItem.name)
                      }
                      className="text-blue-300 hover:text-blue-200 font-roboto text-xs font-semibold flex items-center gap-1"
                    >
                      See all subjects
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM NAVBAR - Fixed, doesn't scroll */}
      <div className="h-20 flex justify-around items-center px-6 py-3 bg-white/5 backdrop-blur-lg border-t border-white/10 flex-shrink-0">
        <button className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 border border-white/30 hover:bg-white/25 transition-all">
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>

        <button className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/20 hover:bg-white/15">
          <div className="w-6 h-6 rounded-md border-2 border-white/40"></div>
        </button>

        <button className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/20 hover:bg-white/15">
          <div className="w-6 h-6 rounded-md border-2 border-white/40"></div>
        </button>
      </div>
    </div>
  );
}
