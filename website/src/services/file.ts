import { SendRequest } from "../utils/request"

export class FileServiceImpl implements FileService {
  constructor(private api: string) {}

  async fetch(file: string): Promise<void> {
    window.location.assign(this.api + "/" + file);
  }
}