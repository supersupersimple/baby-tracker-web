"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { calculateBabyAge, getBabyAvatar, getBabyAvatarBg } from "@/lib/date-utils";

/**
 * Enhanced Baby Selector for Header
 * More prominent display with avatar and age information
 */
export function EnhancedBabySelector({ babies, selectedBaby, onBabyChange, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!babies || babies.length === 0) {
    return (
      <div className={`flex items-center justify-center px-4 py-2 bg-gray-100 rounded-lg ${className}`}>
        <span className="text-sm text-gray-500">No babies found</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selected Baby Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-3 
          bg-gradient-to-r from-blue-50 to-purple-50 
          border border-blue-200 rounded-lg sm:rounded-xl
          hover:from-blue-100 hover:to-purple-100
          hover:border-blue-300
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          ${isOpen ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        `}
      >
        {selectedBaby ? (
          <>
            {/* Baby Avatar */}
            <div className={`
              w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center 
              text-lg sm:text-2xl
              ${getBabyAvatarBg(selectedBaby.babyName)}
              border-2 border-white shadow-sm
            `}>
              {getBabyAvatar(selectedBaby.gender)}
            </div>
            
            {/* Baby Info */}
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate max-w-[120px] sm:max-w-none">
                  {selectedBaby.babyName}
                </h3>
                <span className={`
                  text-xs px-1 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0
                  ${selectedBaby.isOwner 
                    ? 'bg-green-100 text-green-700' 
                    : selectedBaby.role === 'EDITOR'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {selectedBaby.isOwner ? 'Owner' : selectedBaby.role}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {calculateBabyAge(selectedBaby.birthday)}
              </p>
            </div>
            
            {/* Dropdown Arrow */}
            <ChevronDown className={`
              w-5 h-5 text-gray-400 transition-transform duration-200
              ${isOpen ? 'rotate-180' : ''}
            `} />
          </>
        ) : (
          <>
            {/* No Baby Selected */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-lg sm:text-xl">👶</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-medium text-sm sm:text-base text-gray-600 truncate">Select a baby</h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Choose from your babies</p>
            </div>
            <ChevronDown className={`
              w-5 h-5 text-gray-400 transition-transform duration-200
              ${isOpen ? 'rotate-180' : ''}
            `} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {/* Baby List Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h4 className="font-medium text-gray-900 text-sm">Your Babies</h4>
              </div>
              
              {/* Baby Options */}
              <div className="py-2">
                {babies.map((baby) => (
                  <button
                    key={baby.id}
                    onClick={() => {
                      onBabyChange(baby);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left
                      hover:bg-gray-50 transition-colors duration-150
                      ${selectedBaby?.id === baby.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
                    `}
                  >
                    {/* Baby Avatar */}
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-lg
                      ${getBabyAvatarBg(baby.babyName)}
                      border border-gray-200
                    `}>
                      {getBabyAvatar(baby.gender)}
                    </div>
                    
                    {/* Baby Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`
                          font-medium truncate
                          ${selectedBaby?.id === baby.id ? 'text-blue-900' : 'text-gray-900'}
                        `}>
                          {baby.babyName}
                        </h4>
                        <span className={`
                          text-xs px-2 py-0.5 rounded-full font-medium
                          ${baby.isOwner 
                            ? 'bg-green-100 text-green-700' 
                            : baby.role === 'EDITOR'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                          }
                        `}>
                          {baby.isOwner ? 'Owner' : baby.role}
                        </span>
                      </div>
                      <p className={`
                        text-sm truncate
                        ${selectedBaby?.id === baby.id ? 'text-blue-700' : 'text-gray-600'}
                      `}>
                        {calculateBabyAge(baby.birthday)}
                      </p>
                    </div>
                    
                    {/* Selected Indicator */}
                    {selectedBaby?.id === baby.id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Quick Actions Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-600 text-center">
                  Use the menu to create new babies or manage sharing
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}