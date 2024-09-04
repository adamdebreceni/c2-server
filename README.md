# Building and running
```
npm install
npm run build-server
npm run server

# In a separate terminal
npm run website
```

## For agent configuration
```
nifi.c2.enable=true
nifi.c2.flow.base.url=http://localhost:13405/api/flows
nifi.c2.rest.url=http://localhost:13405/api/heartbeat
nifi.c2.rest.url.ack=http://localhost:13405/api/acknowledge
nifi.c2.agent.class=<some class>
nifi.c2.agent.identifier=<some id>
```
