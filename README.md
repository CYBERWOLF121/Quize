# Free Fire Quiz Panel (demo)

This repository contains a small demo app implementing a Free Fire-themed quiz panel with:

- Registration (Username, UID, Password) requiring an entry key.
- Login and redirect to a 15-question quiz (10 easy, 5 hard).
- 2-minute timer; timeout bans the user (UID) and prevents re-login.
- If a user minimizes/loses tab visibility during the quiz, they are banned.
- Correct answers highlight in green; wrong answers show the correct answer and decrement score.
- First 4 perfect scorers receive a redeem code in the format `FF-REDEEM####` (1000–3000).
- Live winners counter displayed on pages.
- Mobile responsive UI and a "Request Key" button that opens an email draft to the admin.

Run locally:

```bash
npm install
npm start
```

Open http://localhost:3000

Notes:

- The server generates an entry key on start and stores it in `data.json` as `entryKey`. The server also accepts keys matching the pattern `FFg####` (e.g. `FFg1567`).
- Banned UIDs are saved in `data.json` and cannot log in.
- Only the first four perfect scorers receive a redeem code.

Security: This is a demo. Passwords are stored in plaintext and there is no proper authentication token. Do not use this code in production without adding password hashing, input validation, rate limiting, and secure session handling.

License: (none)

Contact: Update the "Request Key" email address in `public/index.html` to your admin contact.
