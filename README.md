# AI Chat UI

AI Chat UI is a local chat app for a model served through an OpenAI-compatible API.
The server streams answers to the browser with Server-Sent Events.

## What the project does

- Serves a chat interface on `http://localhost:3001`.
- Forwards chat messages to the model through a small Express proxy.
- Streams the model response token-by-token to the client.
- Saves the conversation in `localStorage` and supports light/dark themes.

## Set up the local Unsloth model

1. Install Unsloth on your machine and start the model server.
2. Note the base URL of the server, for example
   `https://your-endpoint.trycloudflare.com/v1`.
3. Note the model name shown by the server, for example
   `unsloth/Qwen3.6-35B-A3B-MTP-GGUF`.

## Set up the `.env`

1. Copy `.env.example` to `.env`.
2. Fill in each variable:

   | Variable   | Value |
   |------------|-------|
   | `API_KEY`  | The key for your model server. |
   | `API_URL`  | The base URL of your model server. |
   | `MODEL`    | The model name shown by the server. |
   | `PORT`     | The port the app listens on, `3001`. |
   | `SECRET`   | A secret string for the `/chat` endpoint. |
   | `THINK_TAG`| The tag the model uses for its thinking block, `< think>`. |

Do not commit `.env`. It is already ignored by `.gitignore`.

## Run the app

1. Install the dependencies:

   ```
   npm install
   ```

2. Start the server:

   ```
   npm start
   ```

3. Open `http://localhost:3001` in a browser.

## Use the UI

- Type a message and press Enter to send it.
- Press Shift+Enter for a newline.
- The Stop button stops a running answer.
- The New Chat and Clear buttons clear the conversation.
- The 🌙 button switches between light and dark themes.
- Click a chip to fill the input with a starter question.
- Click Copy on an answer or a code block to copy its text.
