import { render, screen } from '@testing-library/react';
import App from './App';
import { AppProvider } from './context/AppContext';

jest.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    initAuthListener: (onReady) => {
      onReady();
      return () => {};
    },
    signOutUser: jest.fn(async () => {}),
  }),
}));

jest.mock('./services/spotService', () => ({
  getUserItineraries: jest.fn(async () => ({})),
  getAllSpots: jest.fn(async () => []),
}));

jest.mock('./services/paymentService', () => ({
  waitForPremiumAccess: jest.fn(async () => false),
}));

jest.mock('./components/Nav', () => () => <div>Navigation</div>);
jest.mock('./components/Toast', () => () => null);
jest.mock('./components/FlashLoader', () => () => <div>Loading</div>);
jest.mock('./pages/LandingPage', () => () => <main>Explore Bulacan</main>);
jest.mock('./pages/LoginPage', () => () => null);
jest.mock('./pages/DashboardPage', () => () => null);
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
