import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Giao diện hai cột cho tablet và màn hình lớn
 * - Cột bên trái: Menu điều hướng
 * - Cột bên phải: Nội dung
 */
interface TabletLayoutProps {
  menu: React.ReactNode;
  content: React.ReactNode;
}

export function TabletLayout({ menu, content }: TabletLayoutProps) {
  const isMobile = useIsMobile();
  const [menuVisible, setMenuVisible] = useState(!isMobile);
  
  // Layout cho thiết bị di động - Menu có thể đóng/mở
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {/* Thanh công cụ di động */}
        <div className="h-14 border-b flex items-center px-4 justify-between bg-background">
          <button 
            onClick={() => setMenuVisible(!menuVisible)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <MenuIcon />
          </button>
          <h1 className="text-lg font-semibold">HoeEdu Solution</h1>
          <div className="w-8"></div>
        </div>
        
        {/* Menu trượt từ bên trái */}
        {menuVisible && (
          <div className="fixed inset-0 z-40 flex">
            <div 
              className="fixed inset-0 bg-black/50" 
              onClick={() => setMenuVisible(false)}
            ></div>
            <div className="relative w-64 max-w-[80%] bg-background h-full shadow-xl z-50 overflow-y-auto">
              <div className="h-14 border-b flex items-center px-4">
                <h2 className="font-semibold">Menu</h2>
              </div>
              {menu}
            </div>
          </div>
        )}
        
        {/* Nội dung chính */}
        <div className="flex-grow overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }
  
  // Layout cho tablet và màn hình lớn - Menu cố định ở bên trái
  return (
    <div className="h-full flex">
      {/* Menu cố định bên trái */}
      <div className="w-64 border-r bg-background h-full overflow-y-auto">
        {menu}
      </div>
      
      {/* Nội dung chính */}
      <div className="flex-grow overflow-y-auto">
        {content}
      </div>
    </div>
  );
}

// Biểu tượng menu đơn giản
function MenuIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}