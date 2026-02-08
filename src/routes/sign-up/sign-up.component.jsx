import './sign-up.styles.scss';

export const SignUp = () => {
  const onCreateAccount = () => {};
  return (
    <>
      <h2>Create an account</h2>
      <form onSubmit={onCreateAccount}>
        {/* <input name='name' value={} /> */}
        <button type="submit">Create</button>
      </form>
    </>
  );
};
