import { useActionState } from 'react';
import { ApiError } from '../../api/client';
import { getText } from '../../ui/formData';
import { SubmitButton } from '../../ui/SubmitButton';
import { TextField } from '../../ui/TextField';
import styles from './AuthForm.module.css';
import { useAuth } from './useAuth';

type LoginState = {
  username: string;
  errors: { username?: string; password?: string; form?: string };
};

const initialState: LoginState = { username: '', errors: {} };

export function LoginForm() {
  const { login } = useAuth();

  async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
    const username = getText(formData, 'username').trim();
    const password = getText(formData, 'password');
    const errors: LoginState['errors'] = {};
    if (!username) errors.username = "Le nom d'utilisateur est requis";
    if (!password) errors.password = 'Le mot de passe est requis';
    if (Object.keys(errors).length > 0) return { username, errors };

    try {
      await login({ username, password });
      return initialState;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Connexion impossible.';
      return { username, errors: { form: message } };
    }
  }

  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    // noValidate: our own messages, linked to the fields, instead of the browser bubbles.
    <form action={formAction} noValidate className={styles.form}>
      <TextField
        label="Nom d'utilisateur"
        name="username"
        autoComplete="username"
        required
        // React resets the form after the action: refill what the user typed.
        defaultValue={state.username}
        error={state.errors.username}
      />
      <TextField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.errors.password}
      />
      {state.errors.form && (
        <p role="alert" className={styles.formError}>
          {state.errors.form}
        </p>
      )}
      <SubmitButton>Se connecter</SubmitButton>
    </form>
  );
}
