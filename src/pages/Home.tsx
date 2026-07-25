import React from "react";
import Hero from "../components/Hero";
import Lessons from "../components/Lessons";
import About from "../components/About";
import Credentials from "../components/Credentials";
import StudioCalendar from "../components/studio/StudioCalendar";
// import Testimonials from "../components/Testimonials";
import Contact from "../components/Contact";

const Home: React.FC = () => {
  return (
    <>
      <Hero />
      <About />
      <Lessons />
      <StudioCalendar />
      <Credentials />
      {/* <Testimonials /> */}
      <Contact />
    </>
  );
};

export default Home;
