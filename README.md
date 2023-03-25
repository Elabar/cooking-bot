# Running the project

```
npm install
npm run dev
```

# Converting to data persistence with backend

The entire logic is written in the reducer function.

Actions that can be converted to **REST API**

- ADD_BOT
- ADD_ORDER
- WITHDRAW_BOT

In reality, the cooking bot should have a **callback** when the cooking is finished properly, so we do not need to convert `ADD_COOK_TIME`. The callback should trigger the backend to try to assign order to the bot again.

If implementing in a proper backend, we might need to use **socket** to retrieve the database changes for bot and order to update the UI accordingly.
