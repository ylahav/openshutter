import React, { useEffect, useState } from 'react';

interface Photo { storage: { url: string } }

const Hero: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch('/api/photos/gallery-leading?limit=3');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setPhotos(data.data);
        }
      } catch {}
      finally { setLoading(false); }
    };
    fetchPhotos();
  }, []);

  if (!loading && photos.length === 0) {
    return null;
  }

  const bg = photos[0]?.storage?.url ? `url(${decodeURIComponent(photos[0].storage.url)})` : undefined;

  return (
    <section className="pt-20">
      <div className="hero min-h-[calc(100vh-5rem)]" style={bg ? { backgroundImage: bg } : {}}>
        <div className="hero-overlay bg-black/40" />
        <div className="hero-content text-center text-neutral-content">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold">Simple Template</h1>
            <p className="py-6 opacity-90">A clean starting point built with Tailwind + DaisyUI.</p>
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


