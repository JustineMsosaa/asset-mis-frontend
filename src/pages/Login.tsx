import React, { useState } from 'react';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonPage,
} from '@ionic/react';
import { eyeOffOutline, eyeOutline, cubeOutline } from 'ionicons/icons';
import '../styles/Login.css';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('Authentication will be connected to the API. Waiting for bwana Masache to finish.');
  };

  return (
    <IonPage>
      <IonContent fullscreen className="login-content">
        <div className="login-wrapper">
          <div className="login-panel">
            <div className="login-brand">
              <div className="login-brand-icon">
                <IonIcon icon={cubeOutline} />
              </div>
              <span>Asset MIS</span>
            </div>

            <div className="login-heading">
              <h1>Welcome back</h1>
              <p>Sign in to access your asset management information system.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <IonInput
                  label="User name"
                  labelPlacement="floating"
                  fill="outline"
                  type="text"
                  name="text"
                  autocomplete="username"
                  required
                />
              </div>

              <div className="login-field">
                <IonInput
                  label="Password"
                  labelPlacement="floating"
                  fill="outline"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autocomplete="current-password"
                  required
                />
                <IonButton
                  fill="clear"
                  className="login-password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <IonIcon
                    slot="icon-only"
                    icon={showPassword ? eyeOffOutline : eyeOutline}
                  />
                </IonButton>
              </div>

              <div className="login-options">
                <IonCheckbox labelPlacement="end">Remember me</IonCheckbox>
                <span className="login-forgot">Forgot password?</span>
              </div>

              <IonButton
                expand="block"
                type="submit"
                className="login-submit"
              >
                Sign in
              </IonButton>

              {message && <p className="login-message">{message}</p>}
            </form>

            <div className="login-footer">
              <p>Asset management made simple.</p>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
