# Free Fire Quiz Panel (demo)

This demo implements a simple Free Fire-themed quiz panel with:
- Registration (Username, UID, Password) requiring an entry key.
- Login and redirect to a 15-question quiz (10 easy, 5 hard).
- 2-minute timer; timeout bans the user (UID) and prevents re-login.
- If user minimizes/loses tab visibility during quiz, they are banned.
- Correct answers highlight in green; wrong answers show the correct one and decrement score.
- Perfect scorers are eligible for redeem codes; only first 4 winners get codes `FF-REDEEM####`.
- Live winners counter is shown on pages.
- Mobile responsive UI and a Request Key button that opens an email draft to admin.

Run locally:
```
npm install
npm start
```
Open http://localhost:3000

This is a demo — do not use in production without adding proper security (password hashing, authentication tokens, input validation, rate limiting, etc.).
# Free Fire Quiz Panel (demo)

This is a small demo app implementing a Free Fire themed quiz panel with registration, login, a 2-minute timer, automatic ban on minimize or timeout, 15 questions (10 easy, 5 hard), and a winners/redeem flow.

Run locally:

```bash
npm install
npm start
```

Open http://localhost:3000

Notes:
- Entry key for players is generated and printed when the server starts (also stored in `data.json` as `entryKey`). The server accepts keys that match the pattern `FFg####` where `####` is a number between `1000` and `3000` (for example `FFg1567`). Provide the entry key to participants to register.
- Banned UIDs are saved in `data.json` and cannot log in.
- Only first 4 perfect scorers receive a redeem code in the form `FF-REDEEM####` (1000-3000).

This is a demo and not secure for production. Passwords are stored in plaintext and there is no authentication token beyond UID.
# Quize