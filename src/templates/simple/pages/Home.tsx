"use client";
import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Footer from '../components/Footer';

const SimpleHomePage: React.FC = () => {
  return (
    <main className="bg-base-100 text-base-content min-h-screen">
      <Header />
      <Hero />
      <section className="container mx-auto px-4 py-12 grid gap-6 md:grid-cols-2">
        <div className="card bg-base-200 shadow">
          <div className="card-body">
            <h2 className="card-title">Clean</h2>
            <p>Minimal defaults with DaisyUI components.</p>
          </div>
        </div>
        <div className="card bg-base-200 shadow">
          <div className="card-body">
            <h2 className="card-title">Composable</h2>
            <p>Tailwind utilities for precise control when needed.</p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default SimpleHomePage;


