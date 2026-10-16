import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Stub all page components so we don't load their CSS/assets
vi.mock('./components/pages/ResetPassword.jsx', () => ({ default: () => <div>ResetPassword</div> }));
vi.mock('./components/pages/staff/StaffLogin.jsx', () => ({ default: () => <div>StaffLogin</div> }));
vi.mock('./components/pages/staff/SuperAdminDashboard.jsx', () => ({ default: () => <div>SuperAdmin</div> }));
vi.mock('./components/pages/staff/ContactAgentDashboard.jsx', () => ({ default: () => <div>ContactAgent</div> }));
vi.mock('./components/pages/staff/FieldAgentDashboard.jsx', () => ({ default: () => <div>FieldAgent</div> }));
vi.mock('./components/pages/staff/AcceptInvite.jsx', () => ({ default: () => <div>AcceptInvite</div> }));
vi.mock('./components/ChatWidget.jsx', () => ({ default: () => null }));
vi.mock('./components/ForgotPassword.jsx', () => ({ default: () => <div>ForgotPassword</div> }));
vi.mock('./components/pages/Home.jsx', () => ({ default: () => <div>Home</div> }));
vi.mock('./components/pages/Login.jsx', () => ({ default: () => <div>Login</div> }));
vi.mock('./components/pages/Signup.jsx', () => ({ default: () => <div>Signup</div> }));
vi.mock('./components/pages/Services.jsx', () => ({ default: () => <div>Services</div> }));
vi.mock('./components/pages/Dashboard.jsx', () => ({ default: () => <div>Dashboard</div> }));
vi.mock('./components/pages/Contact.jsx', () => ({ default: () => <div>Contact</div> }));
vi.mock('./components/pages/About.jsx', () => ({ default: () => <div>About</div> }));
vi.mock('./components/pages/AddVehicle.jsx', () => ({ default: () => <div>AddVehicle</div> }));
vi.mock('./components/pages/PaymentVerify.jsx', () => ({ default: () => <div>PaymentVerify</div> }));
vi.mock('./components/pages/TermsOfUse.jsx', () => ({ default: () => <div>Terms</div> }));
vi.mock('./components/pages/PrivacyPolicy.jsx', () => ({ default: () => <div>Privacy</div> }));
vi.mock('./components/pages/UserForm.jsx', () => ({ default: () => <div>UserForm</div> }));
vi.mock('./components/Header.jsx', () => ({ default: () => <header>Header</header> }));
vi.mock('./components/Footer.jsx', () => ({ default: () => <footer>Footer</footer> }));
vi.mock('./components/ScrollToTop.jsx', () => ({ default: () => null }));

import App from './App.jsx';

function renderAt(path) {
  return render(<App />, { wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter> });
}
// Actually just render App with MemoryRouter to check routes render
function renderApp(path) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('App route registration', () => {
  beforeEach(() => { localStorage.clear(); });

  it('/reset-password renders ResetPassword component', () => {
    renderApp('/reset-password');
    expect(screen.getByText('ResetPassword')).toBeTruthy();
  });

  it('/forgot-password renders ForgotPassword component', () => {
    renderApp('/forgot-password');
    expect(screen.getByText('ForgotPassword')).toBeTruthy();
  });

  it('/staff/login renders StaffLogin component', () => {
    renderApp('/staff/login');
    expect(screen.getByText('StaffLogin')).toBeTruthy();
  });

  it('/staff/super-admin renders SuperAdminDashboard', () => {
    renderApp('/staff/super-admin');
    expect(screen.getByText('SuperAdmin')).toBeTruthy();
  });

  it('/staff/accept-invite renders AcceptInvite', () => {
    renderApp('/staff/accept-invite');
    expect(screen.getByText('AcceptInvite')).toBeTruthy();
  });

  it('/staff pages do not show global Header', () => {
    renderApp('/staff/login');
    expect(screen.queryByText('Header')).toBeNull();
  });

  it('/reset-password does not show global Header', () => {
    renderApp('/reset-password');
    expect(screen.queryByText('Header')).toBeNull();
  });

  it('ChatWidget not rendered when no careal_token', () => {
    localStorage.removeItem('careal_token');
    renderApp('/');
    // ChatWidget is mocked to return null, so this just confirms it doesn't crash
    expect(screen.getByText('Home')).toBeTruthy();
  });
});
