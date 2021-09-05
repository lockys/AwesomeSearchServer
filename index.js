'use strict';

const Hapi = require('@hapi/hapi');
require('dotenv').config();
const { Octokit, App, Action } = require('octokit');
const octokit = new Octokit({ auth: process.env.PERSONAL_TOKEN });
const redis = require('redis');

const client = redis.createClient();

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
    handler: async (request, h) => {
      const { owner, repo } = request.params;

      let res = {};

      await client.get(`${owner}/${repo}`, async (err, val) => {
        if (!val) {
          const { status, headers, data } = await octokit.rest.repos.getReadme({
            owner,
            repo,
            mediaType: { format: 'html' },
          });

          if (status === 200) {
            client.set(
              `${owner}/${repo}`,
              data,
              'EX',
              60 * 60 * 3,
              redis.print
            );
          }

          res.status = status;
          res.headers = headers;
          res.data = data;
        } else {
          res.status = 200;
          res.headers = {};
          res.data = val;
        }
      });

      return res;
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
