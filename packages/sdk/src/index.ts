import http from 'http';

export type ControlEvent =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'modify_instruction'; payload: string };

export type AgentOptions = {
  baseUrl?: string;
  onControl?: (event: ControlEvent) => void | Promise<void>;
};

export class Agent {
  private name: string;
  private baseUrl: string;
  private agentId: string | null = null;
  private onControl?: (event: ControlEvent) => void | Promise<void>;
  private webhookServer: http.Server | null = null;
  private webhookUrl: string | null = null;

  constructor(name: string, options?: AgentOptions | string) {
    this.name = name;
    if (typeof options === 'string') {
      // backwards compat: new Agent(name, baseUrl)
      this.baseUrl = options.replace(/\/$/, '');
    } else {
      this.baseUrl = (options?.baseUrl ?? 'http://localhost:8000').replace(/\/$/, '');
      this.onControl = options?.onControl;
    }
  }

  async start(): Promise<void> {
    try {
      if (this.onControl) {
        this.webhookUrl = await this._startWebhookServer();
      }
      const res = await fetch(`${this.baseUrl}/agent/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.name, webhookUrl: this.webhookUrl }),
      });
      const data = await res.json();
      this.agentId = data.id ?? null;
    } catch {
      // fail silently
    }
  }

  async step(message: string, options?: { tokens?: number; cost?: number }): Promise<void> {
    if (!this.agentId) return;
    try {
      await fetch(`${this.baseUrl}/agent/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: this.agentId, message, ...options }),
      });
    } catch {
      // fail silently
    }
  }

  async warn(message: string): Promise<void> {
    if (!this.agentId) return;
    try {
      await fetch(`${this.baseUrl}/agent/warn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: this.agentId, message }),
      });
    } catch {
      // fail silently
    }
  }

  async error(message: string): Promise<void> {
    if (!this.agentId) return;
    try {
      await fetch(`${this.baseUrl}/agent/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: this.agentId, message }),
      });
    } catch {
      // fail silently
    }
  }

  async setGoal(goal: string): Promise<void> {
    if (!this.agentId) return;
    try {
      await fetch(`${this.baseUrl}/agent/${this.agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentGoal: goal }),
      });
    } catch {
      // fail silently
    }
  }

  async setTask(task: string): Promise<void> {
    if (!this.agentId) return;
    try {
      await fetch(`${this.baseUrl}/agent/${this.agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTask: task }),
      });
    } catch {
      // fail silently
    }
  }

  async end(): Promise<void> {
    if (!this.agentId) return;
    try {
      await fetch(`${this.baseUrl}/agent/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: this.agentId }),
      });
    } catch {
      // fail silently
    }
    this.close();
  }

  close(): void {
    if (this.webhookServer) {
      this.webhookServer.close();
      this.webhookServer = null;
    }
  }

  private _startWebhookServer(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return; }
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk; });
        req.on('end', () => {
          res.writeHead(200).end('ok');
          try {
            const event = JSON.parse(body) as ControlEvent;
            void Promise.resolve(this.onControl!(event)).catch(() => {});
          } catch { /* ignore malformed */ }
        });
      });

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') { reject(new Error('bad address')); return; }
        this.webhookServer = server;
        resolve(`http://127.0.0.1:${addr.port}`);
      });

      server.on('error', reject);
    });
  }
}
