const net = require('net');

const MAX_ATTEMPTS = 5;
const DEFAULT_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const failureCode = (error) => /^[A-Z\d_]{1,64}$/.test(error && error.code || '') ? error.code : 'CONNECTION_FAILED';

// One TCP handshake only. The deadline also covers DNS lookup, unlike a socket
// inactivity timeout. No application request or ICMP/UDP probe is performed.
const probeTcp = ({host, port, timeoutMs}, {connect = net.createConnection, now = Date.now} = {}) =>
  new Promise((resolve, reject) => {
    if (typeof host !== 'string' || !host || !Number.isInteger(port) || port < 1 || port > 65535) {
      reject(new Error('Invalid TCP monitoring target'));
      return;
    }
    const started = now();
    let settled = false;
    let timer;
    let socket;
    const finish = (online, reason = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve({online, latency: online ? Math.max(0, now() - started) : null, reason});
    };
    try {
      socket = connect({host, port});
      timer = setTimeout(() => finish(false, 'ETIMEDOUT'), timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('error', (error) => finish(false, failureCode(error)));
      socket.once('close', () => finish(false, 'CONNECTION_CLOSED'));
    } catch (error) {
      clearTimeout(timer);
      if (socket) socket.destroy();
      reject(error);
    }
  });

const checkTcpWithRetries = async (server, config = {}, {probe = probeTcp, pause = wait} = {}) => {
  const configured = Number(config.timeout);
  const timeoutMs = Number.isFinite(configured) && configured > 0 ? Math.min(10000, Math.max(100, Math.floor(configured))) : 1000;
  const configuredAttempts = Number(config.checkAttempts);
  const attempts = Number.isInteger(configuredAttempts) && configuredAttempts >= 1 && configuredAttempts <= MAX_ATTEMPTS ? configuredAttempts : DEFAULT_ATTEMPTS;
  let last;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Unexpected implementation/configuration failures propagate as unknown
    // monitoring errors, not fabricated Offline observations.
    last = await probe({host: server.host, port: Number(server.port), timeoutMs});
    if (last.online) return {available: 'Online', latency: last.latency, attemptsUsed: attempt, failureReason: null};
    if (attempt < attempts) await pause(RETRY_DELAY_MS);
  }
  return {available: 'Offline', latency: null, attemptsUsed: attempts, failureReason: last.reason || 'CONNECTION_FAILED'};
};

module.exports = {probeTcp, checkTcpWithRetries, MAX_ATTEMPTS, DEFAULT_ATTEMPTS, RETRY_DELAY_MS};
