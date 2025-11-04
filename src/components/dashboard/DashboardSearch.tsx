"use client";
import React from "react";

interface DashBoardSearchProps {
  searchTerm: string;
  setsearchTerm: React.Dispatch<React.SetStateAction<string>>;
}

export default function DashBoardSearch({
  searchTerm,
  setsearchTerm,
}: DashBoardSearchProps) {
  return (
    <div className="w-full mb-4">
      <div className="flex items-center bg-white border border-gray-300 rounded-xl px-4 py-2 shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5 mr-3 text-gray-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.65 5.65a7.5 7.5 0 0010.6 10.6z"
          />
        </svg>

        <input
          type="text"
          value={searchTerm} 
          onChange={(e) => setsearchTerm(e.target.value)}
          placeholder="Search…"
          className="w-full outline-none text-gray-700"
        />
      </div>
    </div>
  );
}
