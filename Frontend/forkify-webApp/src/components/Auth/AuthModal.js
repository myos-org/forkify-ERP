import React, { useState } from 'react';
import { X } from 'lucide-react';
import Login from './Login';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);

  if (!isOpen) return null;

  const handleLogin = (userData) => {
    onLogin(userData);
    onClose();
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-content">
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
          
          <div className="modal-header">
            <h2 className="modal-title">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="modal-subtitle">
              {isLogin ? 'Sign in to continue to Klyro' : 'Join our business management platform'}
            </p>
          </div>

          <div className="modal-body">
            <Login 
              isLogin={isLogin}
              onLogin={handleLogin}
              toggleMode={toggleMode}
            />
          </div>

          <div className="modal-footer">
            <p className="terms-text">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;