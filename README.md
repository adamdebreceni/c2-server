# Introduction
This project provides a user-friendly solution to design and deploy flows for both MiNiFi Native and MiNiFi through the c2-protocol.
&nbsp;

&nbsp;

<kbd>
<img width="2051" alt="Screenshot 2025-01-07 at 16 20 11" src="https://github.com/user-attachments/assets/0427a9ba-dce2-4835-a6da-cfa5a1b75f7e" />
</kbd>
&nbsp;

&nbsp;

<kbd>
<img width="2054" alt="Screenshot 2025-01-07 at 16 22 12" src="https://github.com/user-attachments/assets/479ef3ea-f4fb-49a1-83a8-8f0cd1454e4c" />
</kbd>
&nbsp;

&nbsp;

<kbd>
<img width="2052" alt="Screenshot 2025-01-07 at 16 23 29" src="https://github.com/user-attachments/assets/f80b08e6-4ae3-43e8-ad29-2b8e31580938" />
</kbd>
&nbsp;

&nbsp;

# Building and running
```
npm install
npm run build-server
npm run server

# In a separate terminal
npm run website
```
Then you can visit `http://localhost:13405` to manage your agents, design and update flows.

## For agent configuration
```
nifi.c2.enable=true
nifi.c2.flow.base.url=http://localhost:13405/api/flows
nifi.c2.rest.url=http://localhost:13405/api/heartbeat
nifi.c2.rest.url.ack=http://localhost:13405/api/acknowledge
nifi.c2.agent.class=<some class>
nifi.c2.agent.identifier=<some id>
```
