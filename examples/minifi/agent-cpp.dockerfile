FROM apache/nifi-minifi-cpp:latest

RUN echo "nifi.c2.enable=true" >> /opt/minifi/minifi-current/conf/minifi.properties && \
    echo "nifi.c2.rest.path.base=http://c2:13405/api" >> /opt/minifi/minifi-current/conf/minifi.properties && \
    echo "nifi.c2.flow.base.url=http://c2:13405/api/flows" >> /opt/minifi/minifi-current/conf/minifi.properties && \
    echo "nifi.c2.rest.url=http://c2:13405/api/heartbeat" >> /opt/minifi/minifi-current/conf/minifi.properties && \
    echo "nifi.c2.rest.url.ack=http://c2:13405/api/acknowledge" >> /opt/minifi/minifi-current/conf/minifi.properties && \
    echo "nifi.c2.agent.class=my_class_cpp" >> /opt/minifi/minifi-current/conf/minifi.properties && \
    echo "nifi.c2.agent.identifier=my_id_cpp" >> /opt/minifi/minifi-current/conf/minifi.properties \
