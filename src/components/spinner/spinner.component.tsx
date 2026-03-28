import { FC } from 'react';
import { SpinnerOverlay, SpinnerContainer } from './spinner.styles';

export const Spinner: FC = () => (
  <SpinnerOverlay>
    <SpinnerContainer />
  </SpinnerOverlay>
);
