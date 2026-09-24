import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Stats } from "@/components/landing/Stats";

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
      </main>
    </>
  );
}
