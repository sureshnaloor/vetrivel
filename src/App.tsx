import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
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
import { LocationProvider } from './contexts/LocationContext';
import { FriendsProvider } from './contexts/FriendsContext';
import { CommunitiesProvider } from './contexts/CommunitiesContext';
import { DivyaDesamProvider } from './contexts/DivyaDesamContext';
import { DashboardPinnedProvider } from './contexts/DashboardPinnedContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';




function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signout" element={<SignOut />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/child-safety" element={<ChildSafety />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={
              <LocationProvider>
                <FriendsProvider>
                  <CommunitiesProvider>
                    <DivyaDesamProvider>
                      <Dashboard />
                    </DivyaDesamProvider>
                  </CommunitiesProvider>
                </FriendsProvider>
              </LocationProvider>
            } />
            <Route path="/map" element={
              <LocationProvider>
                <ExploreMap />
              </LocationProvider>
            } />
            <Route path="/temples" element={<PlaceholderPage title="Temples" />} />
            <Route path="/events" element={<PlaceholderPage title="Events" />} />
            <Route path="/nests" element={
              <DivyaDesamProvider>
                <DivyaDesamsExplorer />
              </DivyaDesamProvider>
            } />
            <Route path="/dashboard/divyadesams" element={
              <DivyaDesamProvider>
                <MyDivyaDesams />
              </DivyaDesamProvider>
            } />
            <Route path="/dashboard/divyadesams/:id" element={
              <LocationProvider>
                <DashboardPinnedProvider>
                  <DivyaDesamProvider>
                    <DivyaDesamDetail />
                  </DivyaDesamProvider>
                </DashboardPinnedProvider>
              </LocationProvider>
            } />
            <Route path="/poojas" element={<PlaceholderPage title="Book Pooja" />} />
            <Route path="/add" element={<PlaceholderPage title="Add Temple" />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
