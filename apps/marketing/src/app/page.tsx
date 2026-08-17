import React from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { LogosBar } from "@/components/LogosBar";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { ConnectedPlatform } from "@/components/ConnectedPlatform";
import { HowItWorksAndAvailability } from "@/components/HowItWorksAndAvailability";
import { StatsBar } from "@/components/StatsBar";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { PricingSection } from "@/components/PricingSection";
import { FAQAndCTABanner } from "@/components/FAQAndCTABanner";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      <Navbar />
      <Hero />
      <LogosBar />
      <FeaturesGrid />
      <ConnectedPlatform />
      <HowItWorksAndAvailability />
      <StatsBar />
      <TestimonialsSection />
      <PricingSection />
      <FAQAndCTABanner />
      <Footer />
    </main>
  );
}
