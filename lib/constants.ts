export const BATCH_SIZE = 100;
export const MAX_LINE_QTY = 100;
export const SESSION_DAYS = 14;
export const RESET_MINUTES = 60;

export const DEMO_ACCOUNTS = {
  superuser: {
    login: "superuser",
    email: "superuser@hundert.shop",
    password: "superuser",
    name: "Superuser",
    blurb: "The only account that sees every reserved, paid, and shipped piece",
  },
  buyer: {
    email: "lea@hundert.shop",
    password: "lea-hundert",
    name: "Lea Keller",
    blurb: "A merino throw is waiting on her payment",
  },
} as const;
