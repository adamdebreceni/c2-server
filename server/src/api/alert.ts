import {json, Router} from 'express';
import { MakeAsyncSafe } from '../utils/async';

export function CreateAlertRouter(services: Services) {
  const router = MakeAsyncSafe(Router());

  router.put("/", json(), async (req, res)=>{
    const agentId: AgentId = req.body["agentId"];
    const alerts: string[] = req.body["alerts"];
    console.log(`Alerts from '${agentId}': ${JSON.stringify(alerts)}`);
    const rendered_alerts: Alert[] = [];
    const date_re = /^\[([^\]]*)\]/;
    for (const message of alerts) {
      const m = message.match(date_re);
      if (!m) {
        console.error(`Failed to extract time from alert '${message}'`);
        continue;
      }
      rendered_alerts.push({agent: agentId, date: new Date(m[1]), message});
    }
    console.log(`Persisting ${rendered_alerts.length} alerts from ${agentId}`)
    await services.agentService.pushAlerts(rendered_alerts);
    res.sendStatus(201);
  });

  router.delete("/", json(), async (req, res)=>{
    const agentId = req.body["agent"];
    const time = new Date(req.body["time"]);
    await services.agentService.deleteAlertsBefore(agentId, time);
    res.sendStatus(200);
  });

  router.post("/", json(), async (req, res)=>{
    const agentId = req.body["agent"];
    const time = new Date(req.body["time"]);
    res.json(await services.agentService.getAlertsAfter(agentId, time));
  })

  return router;
}