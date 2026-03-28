import styled from 'styled-components';

export const Nav = styled.nav`
  padding: 0 2rem;
  width: 100vw;
  height: 4rem;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  &-logo {
    width: 3rem;
    height: 64px;
  }
  &-item {
    padding: 0 1rem;
  }
`;
