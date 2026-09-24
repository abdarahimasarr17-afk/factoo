import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Stats } from "@/components/landing/Stats";
import { Trust } from "@/components/landing/Trust";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <Pricing />
        <Trust />
        <Faq />
      </main>
    </>
  );
}
