export async function SendRequest(method: "POST"|"GET"|"PUT"|"DELETE"|"PATCH", url: string, data?: any): Promise<any> {
  return new Promise((resolve, reject)=>{
    const req = new XMLHttpRequest();
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
        resolve(response);
      }
    })

    req.open(method, url);
    req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    try {
      if (arguments.length === 2) {
        req.send();
      } else {
        req.send(JSON.stringify(data));
      }
    } catch (e) {
      reject(e);
    }
  })
}