export const BATCH_SIZE = 100;
export const MAX_LINE_QTY = 100;
export const SESSION_DAYS = 14;
export const RESET_MINUTES = 60;

export const DEMO_ACCOUNTS = {
  admin: {
    email: "ada@hundert.shop",
    password: "atelier-admin",
    name: "Ada Meier",
    blurb: "Workshop floor — reserved, paid, and shipped",
  },
  buyer: {
    email: "lea@hundert.shop",
    password: "lea-hundert",
    name: "Lea Keller",
    blurb: "A merino throw is waiting on her payment",
  },
} as const;
