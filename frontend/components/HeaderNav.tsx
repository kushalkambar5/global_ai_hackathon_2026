"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import SpecularButton from "@/components/SpecularButton";
import { useSession, signOut } from "next-auth/react";
import { ProfileModal } from "@/components/ProfileModal";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  role?: "PATIENT";
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export function HeaderNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      if (typeof window !== "undefined") {
        const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
        setTheme(currentTheme);
      }
    };
    checkTheme();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveSection(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnterSection = (sectionId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setActiveSection(sectionId);
  };

  const handleMouseLeaveSection = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveSection(null);
    }, 150);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const navSections: NavSection[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" }
      ],
    },
    {
      id: "health-analysis",
      title: "Health & Diagnostics",
      items: [
        { href: "/detect-disease", label: "Detect Disease", icon: "biotech" },
        { href: "/visualize-body", label: "Visualize Body", icon: "accessibility_new" },
        { href: "/health-metrics", label: "Health Metrics", icon: "monitoring" },
        { href: "/medical-history", label: "Medical History", icon: "history" },
      ],
    },
    {
      id: "hippo-ai",
      title: "Hippo AI",
      items: [
        { href: "/chat-with-hippo", label: "Chat with Hippo", icon: "smart_toy" }
      ],
    },
    {
      id: "clinical-care",
      title: "Clinical Care",
      items: [
        { href: "/manage-doctors", label: "Manage Doctors", icon: "medical_services", role: "PATIENT" },
        { href: "/tasks-diet", label: "Tasks & Diet", icon: "restaurant", role: "PATIENT" },
        { href: "/conversations", label: "Conversations", icon: "forum", role: "PATIENT" },
        { href: "/chat", label: "Clinical Chat", icon: "chat" },
      ],
    },
  ];

  const publicLinks = [
    { href: "#core-services", label: "Core Services" },
    { href: "#interactive-showcase", label: "Live AI Demos" },
    { href: "#diagnostic-suite", label: "Diagnostic AI" },
    { href: "#doctor-portal", label: "Doctor Verification" },
    { href: "#reviews", label: "Reviews" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#F6F4EF]/90 dark:bg-[#141311]/90 backdrop-blur-md border-b border-[#E6E1D3]/60 dark:border-zinc-800/80 transition-all">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 lg:gap-4">
        {/* Brand Logo */}
        <Link href={status === "authenticated" ? "/dashboard" : "/"} className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#FAF6E8] dark:bg-zinc-800 p-0.5 shadow-xs border border-[#E8E2CF] dark:border-zinc-700 group-hover:scale-105 transition-transform">
            <Image
              src="/logo.png"
              alt="Hippo Health Logo"
              fill
              sizes="32px"
              className="object-contain p-0.5"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl font-bold tracking-tight text-[#1C1B18] dark:text-zinc-100 leading-none">
              Hippo<span className="text-[#8C6B1F] dark:text-[#D4AF37]">Health</span>
            </span>
            <span className="text-[9px] font-sans font-semibold tracking-wider text-[#787363] dark:text-zinc-400 uppercase mt-0.5">
              Precision Clinical AI
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav ref={navRef} className="hidden md:flex items-center gap-1 xl:gap-2 py-1 relative">
          {status === "authenticated"
            ? navSections.map((section) => {
                const visibleItems = section.items.filter(
                  (item) => !item.role || session?.user?.role === item.role
                );
                if (visibleItems.length === 0) return null;

                const isSectionActive = visibleItems.some(
                  (item) => pathname === item.href
                );
                const isDropdownOpen = activeSection === section.id;

                if (visibleItems.length === 1) {
                  const singleItem = visibleItems[0];
                  return (
                    <Link
                      key={section.id}
                      href={singleItem.href}
                      className={`whitespace-nowrap px-3 py-1.5 text-xs xl:text-[13px] rounded-lg transition-all font-sans font-medium flex items-center gap-1.5 ${
                        isSectionActive
                          ? "font-semibold bg-[#8C6B1F]/12 dark:bg-[#D4AF37]/20 text-[#8C6B1F] dark:text-[#F0D580] shadow-xs border border-[#8C6B1F]/20 dark:border-[#D4AF37]/30"
                          : "text-[#4D493E] dark:text-zinc-300 hover:text-[#1C1B18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <MaterialIcon name={singleItem.icon} className="text-base" />
                      <span>{section.title}</span>
                    </Link>
                  );
                }

                return (
                  <div
                    key={section.id}
                    className="relative"
                    onMouseEnter={() => handleMouseEnterSection(section.id)}
                    onMouseLeave={handleMouseLeaveSection}
                  >
                    <button
                      onClick={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        setActiveSection(isDropdownOpen ? null : section.id);
                      }}
                      className={`whitespace-nowrap px-3 py-1.5 text-xs xl:text-[13px] rounded-lg transition-all font-sans font-medium flex items-center gap-1.5 cursor-pointer ${
                        isSectionActive || isDropdownOpen
                          ? "font-semibold bg-[#8C6B1F]/12 dark:bg-[#D4AF37]/20 text-[#8C6B1F] dark:text-[#F0D580] shadow-xs border border-[#8C6B1F]/20 dark:border-[#D4AF37]/30"
                          : "text-[#4D493E] dark:text-zinc-300 hover:text-[#1C1B18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <span>{section.title}</span>
                      <MaterialIcon
                        name="keyboard_arrow_down"
                        className={`text-sm transition-transform duration-200 ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 pt-1.5 w-52 z-50 animate-fade-in font-sans">
                        <div className="rounded-xl border border-[#E6E1D3] dark:border-zinc-800 bg-[#FAF9F5] dark:bg-zinc-900 p-1.5 shadow-xl">
                          {visibleItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setActiveSection(null)}
                                className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors ${
                                  isActive
                                    ? "font-bold text-[#8C6B1F] dark:text-[#F0D580] bg-[#8C6B1F]/10 dark:bg-[#D4AF37]/20"
                                    : "font-medium text-[#4D493E] dark:text-zinc-300 hover:text-[#1C1B18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                                }`}
                              >
                                <MaterialIcon
                                  name={item.icon}
                                  className="text-base shrink-0"
                                />
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            : publicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap px-2.5 py-1.5 text-xs xl:text-[13px] font-medium text-[#4D493E] dark:text-zinc-300 hover:text-[#1C1B18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all font-sans"
                >
                  {link.label}
                </Link>
              ))}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0 relative">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            className="w-9 h-9 rounded-full border border-[#DCD5C5] dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center hover:bg-[#FAF6E8] dark:hover:bg-zinc-700 text-[#787363] dark:text-zinc-300 transition-all cursor-pointer relative"
          >
            {theme === "light" ? (
              <MaterialIcon name="dark_mode" className="text-lg" />
            ) : (
              <MaterialIcon name="light_mode" className="text-lg" />
            )}
          </button>

          {status === "authenticated" && session?.user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User Account"
                className="w-9 h-9 rounded-full border border-[#DCD5C5] dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-center justify-center text-[#1C1B18] dark:text-zinc-200 hover:bg-[#FAF6E8] dark:hover:bg-zinc-700 transition-colors shadow-xs cursor-pointer overflow-hidden relative"
              >
                {session.user.image || (session.user as any).picture ? (
                  <Image
                    src={session.user.image || (session.user as any).picture}
                    alt={session.user.name || "User Avatar"}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <MaterialIcon name="person" className="text-lg" />
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#E6E1D3] dark:border-zinc-700 bg-[#FAF9F5] dark:bg-zinc-900 p-2.5 shadow-lg z-50 animate-fade-in font-sans">
                  <div className="px-3 py-2 border-b border-[#E8E2D4] dark:border-zinc-800 mb-1.5">
                    <p className="text-sm font-semibold text-[#1C1B18] dark:text-zinc-100 truncate">
                      {session.user.name || "User"}
                    </p>
                    <p className="text-xs text-[#787363] dark:text-zinc-400 truncate">
                      {session.user.email}
                    </p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#8C6B1F] dark:text-[#D4AF37] bg-[#FAF6E8] dark:bg-zinc-800 border border-[#E8E2CF] dark:border-zinc-700 rounded-md uppercase">
                      {session.user.role || "PATIENT"}
                    </span>
                  </div>

                  {!session.user.onboardingComplete && (
                    <Link
                      href="/onboarding"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#8C6B1F] dark:text-[#D4AF37] hover:bg-[#FAF6E8] dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <MaterialIcon name="error" className="text-sm" />
                      <span>Complete Onboarding</span>
                    </Link>
                  )}

                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#8C6B1F] dark:text-[#D4AF37] hover:bg-[#FAF6E8] dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <MaterialIcon name="dashboard" className="text-sm" />
                    <span>My Dashboard</span>
                  </Link>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#8C6B1F] dark:text-[#D4AF37] hover:bg-[#FAF6E8] dark:hover:bg-zinc-800 rounded-lg transition-colors border-b border-[#E8E2D4]/50 dark:border-zinc-800 mb-1 cursor-pointer text-left"
                  >
                    <MaterialIcon name="photo_camera" className="text-sm" />
                    <span>Change Profile Photo</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#B34515] dark:text-red-400 hover:bg-[#FAF0E6] dark:hover:bg-red-950/40 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <MaterialIcon name="logout" className="text-sm" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold text-[#4D493E] dark:text-zinc-300 hover:text-[#1C1B18] dark:hover:text-white transition-colors font-sans"
              >
                Sign In
              </Link>
              <SpecularButton
                href="/signup"
                size="custom"
                radius={9999}
                tint="#1C1B18"
                tintOpacity={1}
                textColor="#ffffff"
                lineColor="#ffffff"
                baseColor="#525252"
                intensity={1.2}
                shineSize={12}
                shineFade={35}
                thickness={1.5}
                speed={0.4}
                followMouse={true}
                proximity={250}
                className="px-4 py-2 text-xs font-semibold tracking-wide uppercase group font-sans"
              >
                <span>Get Started</span>
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <MaterialIcon name="arrow_outward" className="text-xs text-white" />
                </span>
              </SpecularButton>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            className="p-2 rounded-lg text-[#787363] dark:text-zinc-300 relative cursor-pointer"
          >
            {theme === "light" ? (
              <MaterialIcon name="dark_mode" className="text-xl" />
            ) : (
              <MaterialIcon name="light_mode" className="text-xl" />
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#1C1B18] dark:text-zinc-100 hover:bg-[#EBE6D8] dark:hover:bg-zinc-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <MaterialIcon name="close" className="text-xl" />
            ) : (
              <MaterialIcon name="menu" className="text-xl" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#F6F4EF] dark:bg-zinc-900 border-b border-[#E6E1D3] dark:border-zinc-800 px-6 py-6 space-y-4">
          <nav className="flex flex-col gap-4 text-sm font-medium text-[#1C1B18] dark:text-zinc-200">
            {status === "authenticated"
              ? navSections.map((section) => {
                  const visibleItems = section.items.filter(
                    (item) => !item.role || session?.user?.role === item.role
                  );
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={section.id} className="space-y-1">
                      <div className="text-[10px] font-bold tracking-wider text-[#8C6B1F] dark:text-[#D4AF37] uppercase px-2 py-0.5">
                        {section.title}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {visibleItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                              pathname === item.href
                                ? "font-bold text-[#8C6B1F] dark:text-[#D4AF37] bg-[#8C6B1F]/10 dark:bg-[#D4AF37]/15"
                                : "font-medium text-[#1C1B18] dark:text-zinc-200 hover:text-[#8C6B1F] hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <MaterialIcon name={item.icon} className="text-base" />
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })
              : publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-1.5 border-b border-[#E8E2D4] dark:border-zinc-800 text-[#1C1B18] dark:text-zinc-200"
                  >
                    {link.label}
                  </Link>
                ))}
          </nav>
          <div className="pt-4 border-t border-[#E8E2D4] dark:border-zinc-800 flex flex-col gap-3 font-sans">
            {status === "authenticated" && session?.user ? (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden bg-[#FAF6E8] dark:bg-zinc-800 border border-[#E6E1D3] dark:border-zinc-700 shrink-0">
                    {session.user.image || (session.user as any).picture ? (
                      <Image
                        src={session.user.image || (session.user as any).picture}
                        alt="Avatar"
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <MaterialIcon name="person" className="text-lg text-[#1C1B18] dark:text-zinc-200" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1C1B18] dark:text-zinc-100 truncate">
                      {session.user.name || "User"}
                    </p>
                    <p className="text-xs text-[#787363] dark:text-zinc-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>

                {!session.user.onboardingComplete && (
                  <Link
                    href="/onboarding"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 text-xs font-semibold text-[#8C6B1F] dark:text-[#D4AF37] flex items-center gap-2"
                  >
                    <MaterialIcon name="error" className="text-base" />
                    <span>Complete Onboarding</span>
                  </Link>
                )}

                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-xs font-semibold text-[#8C6B1F] dark:text-[#D4AF37] flex items-center gap-2 border-b border-[#E8E2D4]/50 dark:border-zinc-800"
                >
                  <MaterialIcon name="dashboard" className="text-base" />
                  <span>My Dashboard</span>
                </Link>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full py-2 text-xs font-semibold text-[#B34515] dark:text-red-400 flex items-center gap-2 text-left cursor-pointer"
                >
                  <MaterialIcon name="logout" className="text-base" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-semibold text-[#1C1B18] dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-[#DCD5C5] dark:border-zinc-700 rounded-xl hover:bg-[#FAF6E8] dark:hover:bg-zinc-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-semibold text-white bg-[#1C1B18] dark:bg-zinc-100 dark:text-zinc-900 rounded-xl hover:bg-[#2E2C26] dark:hover:bg-white transition-colors"
                >
                  Sign Up / Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cloudflare R2 Profile Upload Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  );
}
