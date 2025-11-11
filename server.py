import sys;
from http.server import SimpleHTTPRequestHandler, HTTPServer;
import json;
import os;

class SaveHandler(SimpleHTTPRequestHandler):
    def verifyPresent(self, data, field: str, defaultResponse: bool = True) -> bool:
        if (field in data): return True;
        if (defaultResponse):
            self.send_response(400);
            self.end_headers();
            self.wfile.write(f"Missing {field} field.\n");
        return False;
    def do_POST(self):
        content_length: int = int(self.headers.get("Content-Length", 0));
        body: str = self.rfile.read(content_length);
        data = json.loads(body);

        if (not self.verifyPresent(data, "filename")): return;
        if (not self.verifyPresent(data, "content")): return;

        filename: str = data["filename"];
        content:  str = data["content"];

        safe_name: str = os.path.basename(filename);
        with open(safe_name, "w", encoding="utf-8") as f:
            if isinstance(content, (list, dict)):
                json.dump(content, f);
            else:
                f.write(str(content));
            self.log_message("Wrote file: \"%s\"", safe_name);

        self.send_response(200);
        self.end_headers();
        self.wfile.write(b"File saved.\n");

if __name__ == "__main__":
    if (len(sys.argv) <= 1): raise ValueError("Port wasn't specified");
    port: int = int(sys.argv[1]);
    if (port < 1000 or port > 99999): raise ValueError("Bad port");
    server = HTTPServer(("0.0.0.0", port), SaveHandler)
    print(f"Serving on http://localhost:{port}");
    server.serve_forever()
