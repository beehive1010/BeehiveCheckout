import { createThirdwebClient } from "thirdweb";

const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!THIRDWEB_CLIENT_ID) {
  throw new Error('VITE_THIRDWEB_CLIENT_ID is required');
}

export const client = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
});