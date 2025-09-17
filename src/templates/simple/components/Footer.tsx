import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="footer footer-center bg-base-200 text-base-content p-6 mt-12">
      <aside>
        <p>© {new Date().getFullYear()} OpenShutter. All rights reserved.</p>
      </aside>
    </footer>
  );
};

export default Footer;


