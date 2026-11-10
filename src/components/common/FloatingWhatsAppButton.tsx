import React, { useState } from 'react';

export const FloatingWhatsAppButton: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  const phoneNumber = '923417208670';
  const defaultMessage = 'Assalam o Alaikum PakServices Support, mujhe website par help chahiye.';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div className="fixed z-50 bottom-20 right-4 sm:bottom-6 sm:right-6 flex items-center gap-3 select-none print:hidden pointer-events-auto">
      
      {/* Tooltip Pill (Desktop & Tablet) */}
      <div 
        className={`hidden sm:flex flex-col items-end transition-all duration-300 pointer-events-none ${
          isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3'
        }`}
      >
        <div className="bg-[#0b1329] text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-2xl flex items-center gap-2 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
          <span>WhatsApp Support</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono pr-1 mt-0.5 font-medium">
          0341-7208670 • Online 24/7
        </span>
      </div>

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Contact PakServices WhatsApp Support"
        title="WhatsApp Support"
        className="relative group w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#1ea952] to-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/35 hover:shadow-xl hover:shadow-[#25D366]/50 hover:scale-108 active:scale-95 transition-all duration-300 ease-out cursor-pointer"
      >
        {/* Subtle Ambient Pulse Ring */}
        <span 
          className="absolute inset-0 rounded-full bg-[#25D366] opacity-35 animate-ping pointer-events-none -z-10" 
          style={{ animationDuration: '2.5s' }}
        />

        {/* 24/7 Online Green Status Dot */}
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#090f20] rounded-full shadow-xs" />

        {/* Official WhatsApp SVG Icon */}
        <svg 
          viewBox="0 0 24 24" 
          className="w-7 h-7 sm:w-8 sm:h-8 fill-white drop-shadow-sm transition-transform duration-300 group-hover:rotate-6"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.301-.15-1.782-.879-2.058-.979-.276-.101-.476-.15-.677.15-.201.301-.777.979-.953 1.18-.175.201-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.896-.799-1.501-1.786-1.677-2.087-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.201-.301.301-.502.101-.201.05-.376-.025-.526-.075-.15-.677-1.631-.928-2.233-.245-.586-.494-.506-.677-.515-.175-.008-.376-.01-.577-.01-.201 0-.527.075-.803.376s-1.054 1.029-1.054 2.509 1.079 2.91 1.23 3.111c.15.201 2.123 3.242 5.143 4.547.718.311 1.279.496 1.716.635.722.23 1.379.197 1.9.12.58-.088 1.782-.728 2.033-1.431.251-.703.251-1.305.176-1.431-.076-.126-.276-.201-.577-.351zM12.04 2C6.527 2 2.05 6.477 2.05 11.99c0 1.83.496 3.541 1.36 5.019L2 22.04l5.174-1.356a9.92 9.92 0 004.866 1.258c5.513 0 9.99-4.477 9.99-9.99C22.03 6.477 17.553 2 12.04 2zm0 18.177c-1.579 0-3.07-.425-4.363-1.168l-.313-.18-3.238.849.864-3.157-.197-.323A7.994 7.994 0 014.04 11.99c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8.177-8 8.177z" />
        </svg>
      </a>

    </div>
  );
};
