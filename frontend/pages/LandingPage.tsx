import {
  Hero,
  PullQuote,
  HowItWorks,
  Extension,
  TryIt,
  WhoItsFor,
  Developer,
  Closing,
  Footer,
} from "../components/landing";
import Navbar from "../components/Navbar";

export default function LandingPage() {
  return (
    <div className="wf-landing" style={{ width: "100%" }}>
      <Navbar />
      <Hero />
      <PullQuote />
      <HowItWorks />
      <Extension />
      <TryIt />
      <WhoItsFor />
      <Developer />
      <Closing />
      <Footer />
    </div>
  );
}
