var log4js = require("log4js");
log4js.configure({
  appenders: { development: { type: 'file', filename: 'log_file.log' } },
  categories: { default: { appenders: ['development'], level: 'trace' } }
});
var dotenv = require('dotenv').config();

module.exports = {
  // App config
  "node_port": process.env.NODE_PORT,
  "logger": log4js.getLogger("development"),
  // Database config
  "database": process.env.DATABASE,

  // Stripe
  "STRIPE_KEY": process.env.STRIPE_KEY,
  "STRIPE_SECRET_KEY": process.env.STRIPE_SECRET_KEY,

  // Sendgrid
  "SENDGRID_API_KEY": process.env.SENDGRID_API_KEY,
  "SENDGRID_USER": process.env.SENDGRID_USER,
  "SENDGRID_PASSWORD": process.env.SENDGRID_PASSWORD,

  "BUCKET_NAME": process.env.BUCKET_NAME,
  "ACCESS_KEY_ID": process.env.ACCESS_KEY_ID,
  "SECRET_ACCESS_KEY": process.env.SECRET_ACCESS_KEY,

  // GMAIL
  "GMAIL_USER": process.env.GMAIL_USER,
  "GMAIL_PASSWORD": process.env.GMAIL_PASSWORD,

  //CAPTCHA KEY
  "CAPTCHA_SECRET_KEY": process.env.CAPTCHA_SECRET_KEY,

  // JWT
  "ACCESS_TOKEN_SECRET_KEY": "access_token_for_lamtech",
  "REFRESH_TOKEN_SECRET_KEY": "access_token_for_lamtech",
  "ACCESS_TOKEN_EXPIRE_TIME": 60 * 60 * 24 * 100, // 7 days

  // HTTP Status
  "OK_STATUS": 200,
  "BAD_REQUEST": 400,
  "UNAUTHORIZED": 401,
  "NOT_FOUND": 404,
  "MEDIA_ERROR_STATUS": 415,
  "VALIDATION_FAILURE_STATUS": 417,
  "DATABASE_ERROR_STATUS": 422,
  "INTERNAL_SERVER_ERROR": 500,
  "Host": process.env.host,
  // Other configuration
  "captcha_secret": process.env.CAPTCHA_SECRET_KEY,
  "WEBSITE_URL": process.env.WEBSITE_URL,
  "ASSETS_PATH": process.env.ASSETS_PATH,
  "base_url": process.env.BASE + ':' + process.env.NODE_PORT,
  "IS_HTTPS": process.env.IS_HTTPS,
  "SSL_CERT": process.env.SSL_CERT,
  "SSL_KEY": process.env.SSL_KEY,
  // "base_url": "http://13.55.64.183:3200"
};
