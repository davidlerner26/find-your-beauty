import styled from 'styled-components';

export const HomeWrapper = styled.section`
  color: white;
  position: relative;
  z-index: 1;
  width: 100vw;
  height: calc(100vh - 4rem);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url(../../src/assets/img/beauty_salon_bg.jpeg) no-repeat center
    center;
  &:before {
    content: '';
    position: absolute;
    inset: -1px;
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(12px);
    z-index: -1;
  }
`;

export const HomeContent = styled.div`
  padding: 2rem;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
`;

export const HomeSubTitle = styled.h3`
  padding: 1rem 0 2rem;
`;

export const HomeCards = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;
