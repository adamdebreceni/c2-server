import { SendRequest } from "../utils/request"

export class AlertServiceImpl implements AlertService {
  constructor(private api: string) {}

  async fetchAfter(id: string, time: Date): Promise<AlertLike[]> {
    return SendRequest("POST", this.api, {agent: id, time: time.toISOString()});
  }

  async deleteBefore(id: string, time: Date): Promise<void> {
    return SendRequest("DELETE", this.api, {agent: id, time: time.toISOString()});
  }
}