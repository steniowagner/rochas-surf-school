import { SignInWithGoogleResponse } from "../../hooks/use-sign-in-with-google.hook";

export type NameProvider = "google" | "apple";

export type ProviderNameProps = {
  /** The provider of the token: it chooses the route that receives the name and how its errors read. */
  provider: NameProvider;
  /** The provider's ID token the backend already refused for lack of a valid name; sent again with the name. */
  idToken: string;
  /** The provider's name, filled in for the person to fix. */
  initialName?: string;
  onSignedIn?: (response: SignInWithGoogleResponse) => void;
};

export type UseProviderNameProps = ProviderNameProps;
