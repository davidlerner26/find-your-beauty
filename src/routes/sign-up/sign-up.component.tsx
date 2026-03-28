import { Button, FormControl, InputLabel, OutlinedInput } from '@mui/material';
import { useForm } from 'react-hook-form';
import { createAccount } from '../../utils/firebase/firebase.utils';

const SignUp = () => {
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
        <FormControl>
          <InputLabel htmlFor="name">Name</InputLabel>
          <OutlinedInput
            name="name"
            placeholder="Name"
            {...register('name', { required: 'Name is required' })}
            id="name"
            label="Amount"
          />
        </FormControl>
        <p>{errors?.name?.message}</p>

        <FormControl>
          <InputLabel htmlFor="email">Email</InputLabel>
          <OutlinedInput
            type="email"
            name="email"
            placeholder="Email"
            {...register('email', { required: 'Email is required' })}
            id="email"
            label="Amount"
          />
        </FormControl>
        <p>{errors?.email?.message}</p>

        <Button variant="contained" type="submit">
          Create an account
        </Button>
      </form>
    </section>
  );
};

export default SignUp;
