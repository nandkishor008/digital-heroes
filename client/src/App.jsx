import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { PublicLayout, AppLayout, AdminLayout, RequireAuth } from './components/Layout';

import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import Charities from './pages/Charities';
import CharityDetail from './pages/CharityDetail';
import DrawPublic from './pages/DrawPublic';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

import Dashboard from './pages/Dashboard';
import MyScores from './pages/MyScores';
import MyDraws from './pages/MyDraws';
import MyWinnings from './pages/MyWinnings';
import MyCharity from './pages/MyCharity';
import Subscription from './pages/Subscription';
import Profile from './pages/Profile';

import AdminOverview from './pages/admin/Overview';
import AdminUsers from './pages/admin/Users';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminDraws from './pages/admin/Draws';
import AdminCharities from './pages/admin/Charities';
import AdminWinners from './pages/admin/Winners';
import AdminAnalytics from './pages/admin/Analytics';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/charities" element={<Charities />} />
          <Route path="/charities/:slug" element={<CharityDetail />} />
          <Route path="/draw" element={<DrawPublic />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scores" element={<MyScores />} />
            <Route path="/my-draws" element={<MyDraws />} />
            <Route path="/winnings" element={<MyWinnings />} />
            <Route path="/my-charity" element={<MyCharity />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route element={<RequireAuth admin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/draws" element={<AdminDraws />} />
            <Route path="/admin/charities" element={<AdminCharities />} />
            <Route path="/admin/winners" element={<AdminWinners />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
          </Route>
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
