import React, { useState, useEffect } from 'react';
import { ChefHat, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../../store/actions/authActions';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/fooderp/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when unmounting
  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) dispatch(clearError());
  };

  // Always returns a plain displayable string — never an object
  const getErrorMessage = () => {
    if (!error) return null;
    if (typeof error === 'string') return error;
    if (typeof error === 'object') {
      return error.message || error.error || 'Something went wrong. Please try again.';
    }
    return 'Something went wrong. Please try again.';
  };

  const validateForm = () => {
    if (isLogin) {
      if (!formData.username || !formData.password) {
        dispatch({ type: 'LOGIN_FAILURE', payload: 'Please fill in all fields' });
        return false;
      }
      if (formData.username.length < 3) {
        dispatch({ type: 'LOGIN_FAILURE', payload: 'Username must be at least 3 characters' });
        return false;
      }
      if (formData.password.length < 6) {
        dispatch({ type: 'LOGIN_FAILURE', payload: 'Password must be at least 6 characters' });
        return false;
      }
    } else {
      if (!formData.fullName || !formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        dispatch({ type: 'REGISTER_FAILURE', payload: 'Please fill in all fields' });
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        dispatch({ type: 'REGISTER_FAILURE', payload: 'Please enter a valid email address' });
        return false;
      }
      if (formData.password.length < 6) {
        dispatch({ type: 'REGISTER_FAILURE', payload: 'Password must be at least 6 characters' });
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        dispatch({ type: 'REGISTER_FAILURE', payload: 'Passwords do not match' });
        return false;
      }
      if (formData.username.length < 3) {
        dispatch({ type: 'REGISTER_FAILURE', payload: 'Username must be at least 3 characters' });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isLogin) {
      // Pass as object — authActions handles both object and (user, pass) styles
      const success = await dispatch(login({
        username: formData.username,
        password: formData.password,
      }));
      if (success) navigate('/fooderp/dashboard');

    } else {
      const success = await dispatch(register({
        username: formData.username,
        email:    formData.email,
        password: formData.password,
        fullName: formData.fullName,
      }));
      if (success) {
        const loginSuccess = await dispatch(login({
          username: formData.username,
          password: formData.password,
        }));
        if (loginSuccess) navigate('/fooderp/dashboard');
      }
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    dispatch(clearError());
    setFormData({ username: '', email: '', password: '', confirmPassword: '', fullName: '' });
  };

  const errorMessage = getErrorMessage();

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/brand/klyro-symbol.svg" alt="Klyro Logo" className="logo-icon-svg" style={{ width: 44, height: 44 }} />
            <h1 className="logo-text" style={{ color: '#101828', fontWeight: 800, letterSpacing: '0.5px' }}>Klyro</h1>
          </div>
          <p className="login-subtitle">
            {isLogin ? 'Welcome to Klyro ERP. Sign in to your business workspace' : 'Create your Klyro business account'}
          </p>
        </div>

        {errorMessage && (
          <div className="login-error">
            <AlertCircle size={18} />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                <UserIcon className="input-icon" />
                <span>Full Name</span>
              </label>
              <input
                type="text" id="fullName" name="fullName"
                value={formData.fullName} onChange={handleChange}
                className="form-input" placeholder="Enter your full name"
                disabled={loading} required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              <UserIcon className="input-icon" />
              <span>{isLogin ? 'Username' : 'Choose Username'}</span>
            </label>
            <input
              type="text" id="username" name="username"
              value={formData.username} onChange={handleChange}
              className="form-input"
              placeholder={isLogin ? 'Enter your username' : 'Choose a username (min. 3 characters)'}
              disabled={loading} required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail className="input-icon" />
                <span>Email Address</span>
              </label>
              <input
                type="email" id="email" name="email"
                value={formData.email} onChange={handleChange}
                className="form-input" placeholder="Enter your email"
                disabled={loading} required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <Lock className="input-icon" />
              <span>Password</span>
            </label>
            <input
              type="password" id="password" name="password"
              value={formData.password} onChange={handleChange}
              className="form-input"
              placeholder={isLogin ? 'Enter your password' : 'Create a password (min. 6 characters)'}
              disabled={loading} required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <Lock className="input-icon" />
                <span>Confirm Password</span>
              </label>
              <input
                type="password" id="confirmPassword" name="confirmPassword"
                value={formData.confirmPassword} onChange={handleChange}
                className="form-input" placeholder="Confirm your password"
                disabled={loading} required
              />
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
              </>
            ) : (
              <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button" className="toggle-button"
              onClick={toggleMode} disabled={loading}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;