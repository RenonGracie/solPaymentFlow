import { useContext } from 'react';
import { TherapistContext } from '@/contexts/TherapistContext';

export const useTherapistContext = () => {
  const context = useContext(TherapistContext);

  if (!context) {
    throw new Error(
      'useTherapistContext must be used within TherapistProvider',
    );
  }

  return context;
};