import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: Server;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });
  return io;
}

export function getIo() {
  return io;
}
