const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { getFields } = require('./requestContext');
const { AuditLogTransport } = require('./auditLogService');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (_) {
    /* ignore */
  }
}

/** Prioridad: número menor = más severo. */
const levels = {
  critical: 0,
  error: 1,
  security: 2,
  webhook: 3,
  warn: 4,
  info: 5,
};

winston.addColors({
  critical: 'inverse',
  error: 'red',
  security: 'magenta',
  webhook: 'cyan',
  warn: 'yellow',
  info: 'green',
});

const enrichFormat = winston.format((info) => {
  const ctx = getFields();
  if (ctx.ip !== undefined) info.ip = info.ip ?? ctx.ip;
  if (ctx.endpoint !== undefined) info.endpoint = info.endpoint ?? ctx.endpoint;
  if (ctx.userId !== undefined) info.userId = info.userId ?? ctx.userId;
  if (ctx.statusCode !== undefined) info.statusCode = info.statusCode ?? ctx.statusCode;
  return info;
});

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  enrichFormat(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const appRotate = new DailyRotateFile({
  dirname: logsDir,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxFiles: '14d',
  level: 'info',
  format: jsonFormat,
});

const criticalFile = new winston.transports.File({
  filename: path.join(logsDir, 'critical.log'),
  level: 'critical',
  maxsize: 10 * 1024 * 1024,
  maxFiles: 5,
  tailable: true,
  format: jsonFormat,
});

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  transports: [
    appRotate,
    criticalFile,
    new AuditLogTransport({ level: 'info' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => {
          const { timestamp, level, message, ...rest } = info;
          const tail = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp || ''} [${level}] ${message}${tail}`;
        })
      ),
    }),
  ],
});

module.exports = logger;
