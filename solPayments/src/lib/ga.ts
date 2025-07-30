export const getClientIdFromGaCookie = (): string | null => {
    const cookie = document?.cookie
      ?.split('; ')
      ?.find((row) => row?.startsWith('_ga='));
  
    if (!cookie) return null;
  
    const [, value] = cookie.split('=');
  
    if (!value) return null;
  
    const parts = value.split('.');
  
    return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : null;
  };