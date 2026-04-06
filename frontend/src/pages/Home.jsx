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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(127,29,29,0.22),_transparent_26%),linear-gradient(180deg,#090203_0%,#140304_52%,#090203_100%)]">
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
