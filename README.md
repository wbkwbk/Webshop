# Hundert

Hundert is a small Zürich workshop shop. A piece is made only after **100 of the same product** are reserved.

1. You create an account with a postal address we can ship to, and you can ask for a password reset.
2. You add pieces to a cart and **reserve** them. That is checkout step 1. Nothing is charged.
3. When a product reaches 100 reserved pieces, everyone in that batch is asked to **pay**. That is checkout step 2. The workshop then produces the paid pieces.
4. The workshop can, at any time, open a list of products and see how many pieces are **reserved**, **paid**, and **shipped**, then mark paid pieces as shipped.

Payments are simulated. The test card is `4242 4242 4242 4242`, with any future expiry and any three-digit CVC. Nothing is charged.

There is no mail server. Password resets and payment letters are kept in the demo post office at `/post`.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

The shop database is created at `data/shop.db` the first time the app runs. Delete that file to start again from the demo workshop.

```bash
npm test
npm run lint
```

## Demo accounts

| Who | Email | Password | What you see |
| --- | --- | --- | --- |
| Lea Keller | lea@hundert.shop | lea-hundert | A merino throw whose batch is full and waiting on her payment |
| Ada Meier | ada@hundert.shop | atelier-admin | The workshop list: reserved, paid, and shipped |

The heavy linen apron is at 97 of 100. Reserving 3 closes that batch and asks every buyer to pay.

Other seeded buyers use the password `batch-demo`.

## On your computer

This project was built in a new cloud workspace, not on the `D:` drive. Create a GitHub repository from this project with the Create repo control, then clone it into the folder you wanted:

```powershell
git clone <your-github-url> "D:\data\Tresorit\mruff\Projects\WebShop"
cd "D:\data\Tresorit\mruff\Projects\WebShop"
npm install
npm run dev
```
