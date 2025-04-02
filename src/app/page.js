"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { TruckIcon } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, loading, router])
  
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 py-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TruckIcon className="w-8 h-8" style={{ color: "#084152" }} />
            <h1 className="text-2xl font-bold" style={{ color: "#084152" }}>TruckTrack</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline" style={{ borderColor: "#084152", color: "#084152" }}>
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button style={{ backgroundColor: "#084152" }}>
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <section className="py-20">
          <div className="container mx-auto text-center px-4">
            <h2 className="text-4xl font-bold mb-6" style={{ color: "#084152" }}>
              Track Your Deliveries with Ease
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-600">
              Manage your fleet, optimize routes, and keep logs of all your deliveries in one place with TruckTrack.
            </p>
            <Link href="/register">
              <Button size="lg" className="px-8" style={{ backgroundColor: "#F94961" }}>
                Get Started
              </Button>
            </Link>
          </div>
        </section>
        
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h3 className="text-3xl font-bold mb-12 text-center" style={{ color: "#084152" }}>
              Key Features
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
               
                <h4 className="text-xl font-semibold mb-2">Trip Management</h4>
                <p className="text-gray-600">Keep track of all your deliveries and routes in one central dashboard.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
            
                <h4 className="text-xl font-semibold mb-2">Location Tracking</h4>
                <p className="text-gray-600">Monitor vehicle locations and optimize delivery routes in real-time.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
               
                <h4 className="text-xl font-semibold mb-2">Daily Logs</h4>
                <p className="text-gray-600">Maintain detailed driver logs and delivery records for compliance.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-8 bg-gray-800 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <TruckIcon className="w-6 h-6" />
              <span className="text-lg font-semibold">TruckTrack</span>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="hover:underline">About</Link>
              <Link href="/features" className="hover:underline">Features</Link>
              <Link href="/pricing" className="hover:underline">Pricing</Link>
              <Link href="/contact" className="hover:underline">Contact</Link>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-400">
            <p>© 2025 TruckTrack. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}