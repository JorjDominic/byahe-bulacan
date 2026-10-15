import { render, screen } from '@testing-library/react';
import App from './App';
import { AppProvider } from './context/AppContext';
import { verifyPremiumPayment, waitForPremiumAccess } from './services/paymentService';
import { getUserItineraries } from './services/spotService';

let mockAuthenticate = false;

beforeEach(() => {
  getUserItineraries.mockResolvedValue({});
  verifyPremiumPayment.mockResolvedValue(false);
  waitForPremiumAccess.mockResolvedValue(false);
});

jest.mock('./hooks/useAuth', () => ({
  useAuth: () => {
    const { login } = require('./context/AppContext').useApp();
    return ({
    initAuthListener: (onReady) => {
      if (mockAuthenticate) login('user', 'Traveler', 'user_1', '', false);
      onReady();
      return () => {};
    },
    signOutUser: jest.fn(async () => {}),
  }); },
}));

jest.mock('./services/spotService', () => ({
  getUserItineraries: jest.fn(async () => ({})),
  getAllSpots: jest.fn(async () => []),
}));

jest.mock('./services/paymentService', () => ({
  verifyPremiumPayment: jest.fn(async () => false),
  waitForPremiumAccess: jest.fn(async () => false),
}));

jest.mock('./components/Nav', () => () => <div>Navigation</div>);
jest.mock('./components/Toast', () => () => null);
jest.mock('./components/FlashLoader', () => () => <div>Loading</div>);
jest.mock('./pages/LandingPage', () => () => <main>Explore Bulacan</main>);
jest.mock('./pages/LoginPage', () => () => null);
jest.mock('./pages/DashboardPage', () => () => {
  const { isPremium } = require('./context/AppContext').useApp();
  return <main>{isPremium ? 'Premium enabled' : 'Free account'}</main>;
});
jest.mock('./pages/BrowsePage', () => () => null);
jest.mock('./pages/SpotDetailPage', () => () => null);
jest.mock('./pages/ItineraryPage', () => () => null);
jest.mock('./pages/FeedPage', () => () => null);
jest.mock('./pages/AdminPage', () => () => null);
jest.mock('./pages/PremiumPage', () => () => null);

test('renders the application inside its provider', async () => {
  render(<AppProvider><App /></AppProvider>);
  expect(await screen.findByText(/Explore Bulacan/i)).toBeInTheDocument();
});

afterEach(() => { mockAuthenticate = false; window.history.replaceState({}, '', '/'); jest.clearAllMocks(); });

test('a server-verified paid return activates Premium without waiting for webhook', async () => {
  mockAuthenticate = true;
  window.history.replaceState({}, '', '/?payment=success&order=order_1');
  verifyPremiumPayment.mockResolvedValueOnce(true);
  render(<AppProvider><App /></AppProvider>);
  expect(await screen.findByText('Premium enabled')).toBeInTheDocument();
  expect(verifyPremiumPayment).toHaveBeenCalledWith('order_1');
  expect(waitForPremiumAccess).not.toHaveBeenCalled();
});

test('success URL alone cannot enable Premium for an unpaid order', async () => {
  mockAuthenticate = true;
  window.history.replaceState({}, '', '/?payment=success&order=order_1');
  verifyPremiumPayment.mockResolvedValueOnce(false);
  waitForPremiumAccess.mockResolvedValueOnce(false);
  render(<AppProvider><App /></AppProvider>);
  expect(await screen.findByText('Free account')).toBeInTheDocument();
  expect(screen.queryByText('Premium enabled')).not.toBeInTheDocument();
});
