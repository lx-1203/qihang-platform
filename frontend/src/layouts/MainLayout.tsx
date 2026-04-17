import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FloatingService from '../components/FloatingService';
import DevFloatButton from '../components/DevFloatButton';
import PageTransition from '../components/ui/PageTransition';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <a href="#main-content" className="skip-to-content">跳转到主要内容</a>
      <Navbar />
      <main id="main-content" className="flex-grow">
        <PageTransition />
      </main>
      <Footer />
      <FloatingService />
      {import.meta.env.DEV && <DevFloatButton />}
    </div>
  );
}
