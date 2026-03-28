import { Button } from '@mui/material';
import { signInWithGoogle } from '../../utils/firebase/firebase.utils';
import { SignInWrapper } from './sign-in.styles';

const SignIn = () => {
  return (
    <SignInWrapper className="sign-in">
      <Button variant="contained" onClick={() => signInWithGoogle()}>
        Sign in with Google
      </Button>
    </SignInWrapper>
  );
};

export default SignIn;
