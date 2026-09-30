import { useActionState } from 'react';
import { ApiError } from '../../api/client';
import { useMessages } from '../../i18n/useLocale';
import { getText } from '../../ui/formData';
import { SubmitButton } from '../../ui/SubmitButton';
import { TextField } from '../../ui/TextField';
import styles from './AuthForm.module.scss';
import { useAuth } from './useAuth';

type LoginState = {
  username: string;
  errors: { username?: string; password?: string; form?: string };
};

const initialState: LoginState = { username: '', errors: {} };

export function LoginForm() {
  const { login } = useAuth();
  const t = useMessages().auth;

  async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
    const username = getText(formData, 'username').trim();
    const password = getText(formData, 'password');
    const errors: LoginState['errors'] = {};
    if (!username) errors.username = t.usernameRequired;
    if (!password) errors.password = t.passwordRequired;
    if (Object.keys(errors).length > 0) return { username, errors };

    try {
      await login({ username, password });
      return initialState;
    } catch (error) {
      if (!(error instanceof ApiError)) return { username, errors: { form: t.loginFailed } };
      // On this request, a 401 is the answer itself: wrong credentials, not an expired session.
      const message = error.status === 401 ? t.invalidCredentials : error.message;
      return { username, errors: { form: message } };
    }
  }

  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    // noValidate: our own messages, linked to the fields, instead of the browser bubbles.
    <form action={formAction} noValidate className={styles.form}>
      <TextField
        label={t.username}
        name="username"
        autoComplete="username"
        required
        // React resets the form after the action: refill what the user typed.
        defaultValue={state.username}
        error={state.errors.username}
      />
      <TextField
        label={t.password}
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
      <SubmitButton>{t.submitLogin}</SubmitButton>
    </form>
  );
}
