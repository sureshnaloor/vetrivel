import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import SignIn from './pages/SignIn';
import SignOut from './pages/SignOut';
import PrivacyPolicy from './pages/privacy-policy';
import TermsConditions from './pages/terms-conditions';
import ChildSafety from './pages/child-safety';
import PlaceholderPage from './pages/PlaceholderPage';
import ExploreMap from './pages/ExploreMap';
import DivyaDesamsExplorer from './pages/DivyaDesamsExplorer';
import MyDivyaDesams from './pages/MyDivyaDesams';
import DivyaDesamDetail from './pages/DivyaDesamDetail';
import BookPoojas from './pages/BookPoojas';
import TempleBookPage from './pages/TempleBookPage';
import TempleAdminDashboard from './pages/TempleAdminDashboard';
import TempleAdminEditor from './pages/TempleAdminEditor';
import { LocationProvider } from './contexts/LocationContext';
import ProtectedRoute from './components/ProtectedRoute';
import TempleAdminRoute from './components/TempleAdminRoute';
import AppShellLayout from './layouts/AppShellLayout';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signout" element={<SignOut />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/child-safety" element={<ChildSafety />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShellLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/nests" element={<DivyaDesamsExplorer />} />
              <Route path="/dashboard/divyadesams" element={<MyDivyaDesams />} />
              <Route path="/dashboard/divyadesams/:id" element={<DivyaDesamDetail />} />
              <Route path="/poojas" element={<BookPoojas />} />
              <Route path="/poojas/:placeId" element={<TempleBookPage />} />
              <Route element={<TempleAdminRoute />}>
                <Route path="/temple-admin" element={<TempleAdminDashboard />} />
                <Route path="/temple-admin/:placeId" element={<TempleAdminEditor />} />
              </Route>
            </Route>
            <Route path="/map" element={
              <LocationProvider>
                <ExploreMap />
              </LocationProvider>
            } />
            <Route path="/temples" element={<PlaceholderPage title="Temples" />} />
            <Route path="/events" element={<PlaceholderPage title="Events" />} />
            <Route path="/add" element={<PlaceholderPage title="Add Temple" />} />
          </Route>
        </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
