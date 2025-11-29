import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../infrastructure/components/Icon';
import { Button } from '../infrastructure/components/Button';
import { FormInput } from '../infrastructure/components/FormInput';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('admin@kelly.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <Icon name="home" className={styles.loginIcon} />
          <h1>Kelly Rental Manager</h1>
          <p>Sign in to manage your properties</p>
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
              type="email"
              id="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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
              placeholder="••••••••"
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
          <p>Demo: admin@kelly.com / password</p>
        </div>
      </div>
    </div>
  );
}
