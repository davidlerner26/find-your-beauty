import { Button } from '@mui/material';
import './sign-up.styles.scss';
import { signInWithGoogle } from '../../utils/firebase.utils';

export const SignUp = () => {
  const bla = () => {
    signInWithGoogle();
  };
  return (
    <section className="sign-up">
      <Button variant="contained" onClick={bla}>
        Sign up with Google
      </Button>
    </section>
  );
};
