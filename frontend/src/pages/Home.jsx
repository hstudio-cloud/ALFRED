import React from 'react';
import HeroSection from '../components/HeroSection';
import ScenariosSection from '../components/ScenariosSection';
import PlatformsSection from '../components/PlatformsSection';
import TimelineSection from '../components/TimelineSection';
import ComparisonSection from '../components/ComparisonSection';
import ProductTourSection from '../components/ProductTourSection';
import HowItWorksSection from '../components/HowItWorksSection';
import ResultsSection from '../components/ResultsSection';
import IntelligenceSection from '../components/IntelligenceSection';
import CompetitorSection from '../components/CompetitorSection';
import PricingSection from '../components/PricingSection';
import FinalCTASection from '../components/FinalCTASection';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <HeroSection />
      <ScenariosSection />
      <PlatformsSection />
      <TimelineSection />
      <ComparisonSection />
      <ProductTourSection />
      <HowItWorksSection />
      <ResultsSection />
      <IntelligenceSection />
      <CompetitorSection />
      <PricingSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default Home;
