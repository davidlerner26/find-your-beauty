import { Button } from '@mui/material';
import './sign-up.styles.scss';
import { useForm } from 'react-hook-form';
import { createAccount } from '../../utils/firebase.utils';

export const SignUp = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
    },
  });

  return (
    <section className="sign-up">
      <form onSubmit={handleSubmit((data) => createAccount(data))}>
        <input
          name="name"
          placeholder="Name"
          {...register('name', { required: 'Name is required' })}
        />
        <p>{errors?.name?.message}</p>

        <input
          type="email"
          name="email"
          placeholder="Email"
          {...register('email', { required: 'Email is required' })}
        />
        <p>{errors?.name?.message}</p>
        <Button variant="contained" type="submit">
          Create an account
        </Button>
      </form>
    </section>
  );
};
