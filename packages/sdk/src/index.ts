export class Agent { 
  private name: string;
  private baseUrl: string;
  private agentId: string | null = null;

  constructor(name: string, baseUrl: string = 'http://localhost:8000'){
    this.name = name;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async start(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/agent/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ name: this.name })
      })

      const data = await res.json();
      this.agentId = data.id ?? null;

    } catch {
      //fail silently
    }
  }

  async step(message: string, options? : { tokens: number, cost: number}): Promise<void> {
    if(!this.agentId) return;
    try{
      await fetch(`${this.baseUrl}/agent/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          agentId: this.agentId,
          message,
          ...options
        })
      })
    } catch {
      //fail silently
    }
  }

  async error(message: string): Promise<void> {
    if(!this.agentId) return;
    try{
      await fetch(`${this.baseUrl}/agent/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ agentId: this.agentId, message})
      })
    } catch {
      //fail silently
    }
  }
  
  async end(): Promise<void> {
    if(!this.agentId) return;
    try {
      await fetch(`${this.baseUrl}/agent/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ agentId: this.agentId })
      })
    } catch{
      //fail silently
    }
  }

}