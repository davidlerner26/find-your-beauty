// A card that the client saved: only what is safe to show. The number is never here: it was typed in a form of
// Stripe, and Stripe keeps it.
export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

// The booking that the hold is for: the server works the amount out from the services and the time
export type HoldRequest = {
  professionalId: string;
  serviceIds: string[];
  startsAt: Date;
  cardId: string;
};

export type Hold =
  | { status: 'authorized'; paymentIntentId: string; total: number }
  // The card refused: `code` is the reason that Stripe gives (card_declined, insufficient_funds...)
  | { status: 'failed'; code: string };

// The form where a card is typed. With Stripe it is their form (the number never touches this app).
export type CardFormHandle = {
  // Shows the form inside the element
  mount(element: HTMLElement): void;
  // Saves what was typed. Null when it worked, otherwise what to tell the client.
  save(): Promise<string | null>;
};

// Payments of the test environment. A booking is paid in two steps: a hold on the card when it is made (the money is
// reserved, not taken), and the charge when the professional accepts it (done by the Cloud Functions).
export interface PaymentsApi {
  // Are there payments here? Not in production; not in the test environment until the Stripe key is filled in.
  readonly available: boolean;

  cards(): Promise<SavedCard[]>;
  removeCard(id: string): Promise<void>;

  // Asks Stripe what the card form needs, and gives the form
  cardForm(): Promise<CardFormHandle>;

  // Reserves the amount on the card. The 3D Secure step of the bank, if asked, is done inside.
  hold(request: HoldRequest): Promise<Hold>;

  // The client gave up after the hold (the time was taken meanwhile): the money is released
  release(paymentIntentId: string): Promise<void>;
}
