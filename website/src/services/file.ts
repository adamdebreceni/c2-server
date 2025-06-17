import { SendRequest } from "../utils/request"

export class FileServiceImpl implements FileService {
  constructor(private api: string) {}

  async fetch(file: string): Promise<void> {
    window.location.assign(this.api + "/" + file);
  }

  upload(file: File): {result: Promise<string>, abort: ()=>void, onProgress: (cb: (progress: number)=>void) => void} {
    const data = new FormData();
    data.append('file', file);
    const req = new XMLHttpRequest();
    req.open('POST', '/api/file');
    let progress_cb: ((progess: number)=>void)|null = null;
    req.upload.addEventListener('progress', e => {
      if (progress_cb && e.lengthComputable) {
        progress_cb(e.loaded / e.total);
      }
    });
    const result = new Promise<string>((resolve, reject) => {
      req.addEventListener("load", ()=>{
        let response = req.responseText
        if (req.getResponseHeader("Content-Type")?.match(/application\/json/)) {
          try {
            response = JSON.parse(req.responseText);
          } catch (e) {
            reject("Reponse is not a valid JSON");
            return;
          }
        }
        if (req.status !== 200 && req.status !== 201) {
          reject(response);
        } else {
          resolve(response[0] as string);
        }
      });
      req.addEventListener("abort", () => {
        reject("Upload aborted");
      });
      req.addEventListener("error", (e) => {
        reject(`Error while uploading file: ${e.type}`);
      })
    });
    req.send(data);
    const onProgress = (cb: (progress: number)=>void) => {
      progress_cb = cb;
    };
    return {result, abort: ()=>req.abort(), onProgress};
    // return fetch(`/api/file`, {method: "POST", body: data}).then((resp)=>{
    //   console.log(`File upload response:`, resp);
    //   return resp.json(); 
    // }).then(ids => {
    //   return ids[0] as string;
    // })
  }
}