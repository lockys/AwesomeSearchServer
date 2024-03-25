'use strict';

const Hapi = require('@hapi/hapi');
require('dotenv').config();
const { Octokit } = require('octokit');
const octokit = new Octokit({ auth: process.env.PERSONAL_TOKEN });
const redis = require('async-redis');
const url = require('url');

let client;
if (process.env.REDIS_PRIVATE_URL) {
  const rtg = url.parse(process.env.REDIS_PRIVATE_URL);
  client = redis.createClient(rtg.port, rtg.hostname);
  client.auth(rtg.auth.split(':')[1]);
} else {
  client = redis.createClient();
}

client.on('connect', () => {
  console.log('Redis client connected');
});


const init = async () => {
  const server = Hapi.server({
    port: ~~process.env.PORT || 3000,
    host: '0.0.0.0',
  });

  server.route({
    method: 'GET',
    path: '/readme/{owner}/{repo}',
    config: {
      cors: {
        origin: [process.env.ALLOWED_CORS_DOMAIN],
      },
    },
    handler: async (request, h) => {
      const { owner, repo } = request.params;

      let res = {};
      let value = await client.get(`${owner}/${repo}`);

      if (!value) {
        try {
          const { status, headers, data } = await octokit.rest.repos.getReadme({
            owner,
            repo,
            mediaType: { format: 'html' },
          });

          if (status === 200) {
            client.set(`${owner}/${repo}`, data, 'EX', 60 * 60 * 3);
          }

          res = {
            status,
            headers,
            data,
          };
        } catch {
          res = {
            status: 404,
            headers: {},
            data: {},
          };
        }
      } else {
        res = {
          status: 200,
          headers: {},
          data: value,
        };
      }

      return h.response(res.data).code(res.status);
    },
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
