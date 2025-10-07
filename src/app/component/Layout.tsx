"use client"
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState,useEffect } from "react";



export default function PagesLayout({children, footer}: Readonly<{children: React.ReactNode, footer:React.ReactNode;}>) {
    const pathName = usePathname();
    const [ isSideBarOpen, setIsSideBarOpen] = useState<boolean>(true);

    useEffect(() => {
        const sessionState = sessionStorage.getItem("OpenedSideBar")
        if (sessionState){
            if(sessionState === "open"){
                setIsSideBarOpen(true)
            }else{
                setIsSideBarOpen(false)
            }
        }else{
            sessionStorage.setItem("OpenedSideBar", "open");
            setIsSideBarOpen(true);
        }
    },[])
  
    const handleToggler = () => {
        setIsSideBarOpen((prev) => {
        const newState = !prev;
        sessionStorage.setItem("OpenedSideBar", newState ? "open" : "close");
        return newState;
        });
    };

  return (
    <div className={`app ${isSideBarOpen? "sidebar-expanded" : "sidebar-collapse"}`}>

        <header className="app__header" role="banner">
            <button className="text-[#2D3748] text-[1.5rem]" onClick={handleToggler}  aria-label="Toggle sidebar">
                    {isSideBarOpen? "☰" : "✕"}
            </button>
        </header>

        <aside className="app__sidebar relative" role="navigation">

            <div className="logo-toggler-cont flex items-center gap-x-[6px] p-[10px]">
                <Image src="/trip-mate-logo.png" alt="Image of a weather with clouds and a traveling bag resting on it represently the brand logo" width={85} height={90} priority/>
                <span className="text-[#fff] text-[1.8rem] description">TripMate</span>
            </div>

            {/*  Sidebar content here */}
            <nav className="p-[20px]">
                <ul>
                    <li><Link href="/" className={`flex items-center gap-x-[6px] mb-[10px] p-[5px] hover:text-[#4ECDC4] ${pathName === "/"? "bg-[#fff] text-[#2D3748]" : "text-[#fff]"}`}><span className="icon">🏠</span> <span className="description">Home</span></Link></li>
                    <li><Link href="/events" className={`flex items-center gap-x-[6px] p-[5px] hover:text-[#4ECDC4] ${pathName === "/events"? "bg-[#fff] text-[#2D3748]" : "text-[#fff]"}`}><span className="icon">📅</span> <span className="description">Events</span></Link></li>
                </ul>
            </nav>

            <div className="py-[10px] absolute bottom-0 left-0 right-0 text-[#fff] text-[12px] text-center" role="footer">
                <p>&copy; TripMate {new Date().getFullYear()}. All Rights Reserved</p>
            </div>

        </aside>

        <div className="sidebar-overlay" id="overlay"></div>

        <main className="app__main" role="main">
            {children}
        </main>
        
        <footer className="app__footer py-[10px]" role="contentinfo">
            {footer}
        </footer>
    </div>
  );
}
