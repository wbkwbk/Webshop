# donmartins

donmartins sells one piece: the **AFM Saucer MOD**. Please register to pre-order. Production starts once 100 reservations are in. No payment is required upfront. Accounts, carts, reservations, postal addresses, payments, and shipping live in a SQLite database at `data/shop.db`.

1. You create an account with a postal address we can ship to, and you can ask for a password reset.
2. You add any quantity to a cart and **reserve** it. That is checkout step 1. Nothing is charged. The shop starts at **0 reserved**, and the quantity is not limited.
3. Everyone can see how many are already reserved. Production starts once at least **100** are reserved. Everyone who reserved is then asked to **pay**. Later reservations can be paid straight away. That is checkout step 2.
4. Only the superuser has the **Ordered items** menu. It lists every user’s reserved, paid, and shipped pieces, and it can be sorted and grouped by user, order state (Reserve, Pay, Ship), and order date. Every other account sees only their own orders.

Payments are simulated. The test card is `4242 4242 4242 4242`, with any future expiry and any three-digit CVC. Nothing is charged.

There is no mail server. Password resets and payment letters are kept in the demo post office at `/post`.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

The shop database is created at `data/shop.db` the first time the app runs. An older catalog is replaced by the AFM Saucer MOD on the next start, and existing accounts are kept. Delete that file to start again from zero reserved. A new account receives the confirmation “Account Created for AMF Saucer Shop” in Notices and in the post office at `/post`.

```bash
npm test
npm run lint
```

## Demo accounts

| Who | Sign in | Password | What you see |
| --- | --- | --- | --- |
| Superuser | superuser | superuser | Ordered items: every reserved, paid, and shipped piece |
| Lea Keller | lea@hundert.shop | lea-hundert | Only her own orders. Nothing is reserved yet |

## On your computer

This project was built in a new cloud workspace, not on the `D:` drive. Create a GitHub repository from this project with the Create repo control, then clone it into the folder you wanted:

```powershell
git clone <your-github-url> "D:\data\Tresorit\mruff\Projects\WebShop"
cd "D:\data\Tresorit\mruff\Projects\WebShop"
npm install
npm run dev
```
