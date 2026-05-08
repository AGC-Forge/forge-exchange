import type { H3Event } from "h3";
import type { Server as SocketIOServe } from "socket.io";
import type { Redis as RedisClient } from "ioredis";
import type { Server as HTTPServer } from "node:http";

declare module "#app" {
  interface NuxtApp {
    $redis: RedisClient;
  }
}
declare module "nitropack" {
  interface NitroApp {
    socket?: SocketIOServe;
    redis?: RedisClient;
  }
  interface NitroRuntimeHooks {
    listen: (server: HTTPServer) => void;
  }
}
declare module "h3" {
  interface H3EventContext {
    redis: RedisClient | null;
    socket: SocketIOServe | null;
  }
}
