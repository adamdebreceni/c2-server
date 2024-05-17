export function SerializeFlow(id: string, flow: FlowObject): string {
  let result = license + "\n";
  result += "Flow Controller:\n";
  result += "  name: MiNiFi Flow\n";
  result += "  id: " + id + "\n";
  if (flow.processors.length === 0) {
    result += "Processors: []\n";
  } else {
    result += "Processors:\n";
    for (const proc of flow.processors) {
      result += "  - name: " + proc.name + "\n";
      result += "    id: " + proc.id + "\n";
      result += "    class: " + proc.type + "\n";
      result += "    max concurrent tasks: " + proc.scheduling.concurrentTasks + "\n";
      result += "    scheduling strategy: " + proc.scheduling.strategy + "\n";
      result += "    scheduling period: " + proc.scheduling.runSchedule + "\n";
      result += "    penalization period: " + proc.penalty + "\n";
      result += "    yield period: " + proc.yield + "\n";
      result += "    run duration nanos: " + proc.scheduling.runDuration + "\n";
      result += "    auto-terminated relationships list:\n";
      for (const rel in proc.autoterminatedRelationships) {
        if (proc.autoterminatedRelationships[rel]) {
          result += "      - " + rel + "\n";
        }
      }
      result += "    Properties:\n";
      for (const propName in proc.properties) {
        if (proc.properties[propName] === null) continue;
        result += "      \"" + propName + "\": " + proc.properties[propName] + "\n";
      }
    }
  }
  if (flow.connections.length === 0) {
    result += "Connections: []\n";
  } else {
    result += "Connections:\n";
    for (const conn of flow.connections) {
      const src = flow.processors.find(proc => conn.source.id === proc.id)!;
      const dst = flow.processors.find(proc => conn.destination.id === proc.id)!;
      const rels = Object.keys(conn.sourceRelationships).filter(rel => conn.sourceRelationships[rel]);
      result += "  - name: " + (conn.name ?? `${src.name}/${rels.join(",")}/${dst.name}`) + "\n";
      result += "    id: " + conn.id + "\n";
      result += "    source name: " + src.name + "\n";
      result += "    source id: " + src.id + "\n";
      result += "    source relationship names:\n";
      for (const rel of rels) {
        result += "      - " + rel + "\n";
      }
      result += "    destination name: " + dst.name + "\n";
      result += "    destination id: " + dst.id + "\n";
      result += "    max work queue size: " + conn.backpressureThreshold.count + "\n";
      result += "    max work queue data size: " + conn.backpressureThreshold.size + "\n";
      result += "    flowfile expiration: " + conn.flowFileExpiration + "\n";
      if (conn.swapThreshold) {
        result += "    swap threshold: " + conn.swapThreshold + "\n";
      }
    }
  }
  if (flow.services.length === 0) {
    result += "Controller Services: []\n";
  } else {
    result += "Controller Services:\n";
    for (const serv of flow.services) {
      result += "  - name: " + serv.name + "\n";
      result += "    id: " + serv.id + "\n";
      result += "    class: " + serv.type + "\n";
      result += "    Properties:\n";
      for (const propName in serv.properties) {
        if (serv.properties[propName] === null) continue;
        result += "      \"" + propName + "\": " + serv.properties[propName] + "\n";
      }
    }
  }
  result += "Remote Processing Groups: []\n";
  return result;
}

const license = `
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the \"License\"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an \"AS IS\" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
`;

const indent = "  ";