import { createConsoleSpy } from '@dogule/testing';

export const createGreeting = (name: string) => `Hello, ${name}!`;

export const logGreeting = (name: string) => {
  const spy = createConsoleSpy();
  const message = createGreeting(name);
  console.log(message);
  spy.restore();
  return { message, logs: spy.logs.slice() };
};
