declare module 'google-auth-library' {
  interface VerifyIdTokenOptions {
    idToken: string;
    audience?: string | string[];
  }

  interface LoginTicketPayload {
    [key: string]: unknown;
    email?: string;
    sub?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  }

  class LoginTicket {
    getPayload(): LoginTicketPayload | undefined;
  }

  export class OAuth2Client {
    constructor(clientId?: string, clientSecret?: string, redirectUri?: string);
    verifyIdToken(options: VerifyIdTokenOptions): Promise<LoginTicket>;
  }
}
