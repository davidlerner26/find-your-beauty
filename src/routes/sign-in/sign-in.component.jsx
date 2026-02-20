import './sign-in.styles.scss';
import { Button } from '@mui/material';
import { signInWithGoogle } from '../../utils/firebase/firebase.utils';

export const SignIn = () => {
  return (
    <section className="sign-in">
      <Button variant="contained" onClick={() => signInWithGoogle()}>
        Sign in with Google
      </Button>
    </section>
  );
};
