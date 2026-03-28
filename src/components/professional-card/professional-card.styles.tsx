import styled from 'styled-components';

export const ProfessionalCardWrapper = styled.div`
  margin: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  max-height: 40vh;
`;

export const ProfessionalCardImage = styled.div`
  width: 30%;
  height: 100%;
  max-height: 40vh;
  img {
    max-height: 40vh;
    border-radius: 12px 0 0 12px;
  }
`;

export const ProfessionalCardContent = styled.div`
  width: 70%;
  h3 {
    font-weight: 700;
    margin-bottom: 0.5rem;
  }
  button {
    width: 50%;
  }
`;

export const Stars = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

export const ProfessionalServicesWraper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

export const ProfessionalService = styled.div`
  width: calc(50% - 1rem);
  border: 1px solid;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: center;
  background-color: #9c27b0;
  color: white;
  height: 35px;
  font-size: 14px;
`;
