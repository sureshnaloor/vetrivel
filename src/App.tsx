import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import SignIn from './pages/SignIn';
import SignOut from './pages/SignOut';
import PlaceholderPage from './pages/PlaceholderPage';
import ExploreMap from './pages/ExploreMap';
import { LocationProvider } from './contexts/LocationContext';
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
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={
              <LocationProvider>
                <Dashboard />
              </LocationProvider>
            } />
            <Route path="/map" element={
              <LocationProvider>
                <ExploreMap />
              </LocationProvider>
            } />
            <Route path="/temples" element={<PlaceholderPage title="Temples" />} />
            <Route path="/events" element={<PlaceholderPage title="Events" />} />
            <Route path="/nests" element={<PlaceholderPage title="Nests" />} />
            <Route path="/poojas" element={<PlaceholderPage title="Book Pooja" />} />
            <Route path="/add" element={<PlaceholderPage title="Add Temple" />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
