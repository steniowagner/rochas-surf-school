import { SignInWithGoogleResponse } from "../../hooks/use-sign-in-with-google.hook";

export type GoogleNameProps = {
  /** The Google ID token the backend already refused for lack of a valid name; sent again with the name. */
  idToken: string;
  /** Google's name, filled in for the person to fix. */
  initialName?: string;
  onSignedIn?: (response: SignInWithGoogleResponse) => void;
};

export type UseGoogleNameProps = GoogleNameProps;
