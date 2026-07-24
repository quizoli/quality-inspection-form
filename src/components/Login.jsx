import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Loader2, Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success is handled by onAuthStateChanged in App.jsx
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon-container">
            <Lock size={32} color="var(--primary)" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DICT E-Learning</h1>
          <p className="text-secondary font-medium mt-1">Quality Inspection App</p>
        </div>
        
        <div className="login-body">
          <form onSubmit={handleLogin}>
            {error && (
              <div className="login-error">
                <AlertCircle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm text-danger font-medium">{error}</p>
              </div>
            )}
            
            <div className="login-input-group">
              <label>Email Address</label>
              <div className="login-input-wrapper">
                <div className="login-input-icon">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="inspector@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="login-input-group">
              <label>Password</label>
              <div className="login-input-wrapper">
                <div className="login-input-icon">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" style={{ marginRight: '8px' }} color="white" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
        <div className="login-footer">
          <p className="text-xs text-secondary font-medium">Authorized Personnel Only</p>
        </div>
      </div>
    </div>
  );
}
