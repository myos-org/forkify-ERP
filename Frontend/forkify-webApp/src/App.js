import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import { Loader } from 'lucide-react';

import AppRoutes from './components/routes/AppRoutes';
import { logout } from './store/actions/authActions';
import './styles/main.scss';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  // Listen for the custom event fired by the Axios 401 interceptor in services/api.js
  // This avoids a circular import (api.js cannot import the Redux store directly)
  useEffect(() => {
    const handleAutoLogout = () => dispatch(logout());
    window.addEventListener('auth:logout', handleAutoLogout);
    return () => window.removeEventListener('auth:logout', handleAutoLogout);
  }, [dispatch]);

  if (loading) {
    return (
      <div className="app-loading">
        <Helmet><title>Loading... | Klyro ERP</title></Helmet>
        <Loader />
        <p>Loading Klyro ERP...</p>
      </div>
    );
  }

  return (
    <AppRoutes
      isAuthenticated={isAuthenticated}
      currentUser={user}
      onLogout={() => dispatch(logout())}
    />
  );
}

export default App;