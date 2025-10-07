import Link from "next/link"
export default function LandingPage() {
    return(
        <div className="text-center text-gray-500 mt-10 bg[#F7FAFC] h-[90svh] flex flex-col items-center justify-center">
            <p className="text-[40px]">Welcome to TripMate!</p>
            <Link href="/chat" className="rounded-[10px] bg-[#2D3748] text-[#fff] px-[15px] py-[10px] hover:bg-[#2a5c8b]">Start Your Trip Planning</Link>
        </div>
    )
}