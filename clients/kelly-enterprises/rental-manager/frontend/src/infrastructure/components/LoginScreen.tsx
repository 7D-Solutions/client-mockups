// Login screen component for infrastructure auth
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Icon } from './Icon';
import { Button } from './Button';
import { FormInput } from './FormInput';
import styles from './LoginScreen.module.css';

export function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ identifier, password });
      // Always navigate to main page after successful login
      navigate('/gauges/list', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid credentials';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <Icon name="tachometer-alt" className={styles.loginIcon} />
          <h1>Fireproof Gauge System</h1>
          <p>Sign in to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {error && (
            <div className={styles.loginError}>
              <Icon name="exclamation-triangle" />
              {error}
            </div>
          )}
          
          <div className={styles.formGroup}>
            <FormInput
              type="text"
              id="identifier"
              label="Email or Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your email or username"
              required
              autoFocus
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          <div className={styles.formGroup}>
            <FormInput
              type="password"
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          
          <Button 
            type="submit" 
            className={styles.loginBtn} 
            disabled={isLoading}
            loading={isLoading}
            icon={!isLoading && <Icon name="sign-in-alt" />}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        
        <div className={styles.loginFooter}>
          <p>Fireproof Gauges</p>
        </div>
      </div>
    </div>
  );
}