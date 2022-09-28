# p2p-call

> Complete fucking garbage

## How to run

1. Install dependencies

`npm i`

`cd front && npm i`

2. Generate an SSL certificate

`openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes`

3. Build front-end

`npm run build:web`

4. Start

`node .`