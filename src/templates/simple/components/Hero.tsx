import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="pt-20">
      <div className="hero min-h-[calc(100vh-5rem)] bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold">Simple Template</h1>
            <p className="py-6 opacity-80">
              A clean starting point built with Tailwind + DaisyUI.
            </p>
            <div className="flex justify-center gap-3">
              <button className="btn btn-primary">Get Started</button>
              <button className="btn btn-outline">Learn More</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;


