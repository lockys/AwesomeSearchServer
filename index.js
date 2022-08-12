'use strict';

const Hapi = require('@hapi/hapi');
require('dotenv').config();
const { Octokit, App, Action } = require('octokit');
const octokit = new Octokit({ auth: process.env.PERSONAL_TOKEN });

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

      try {
        const { status, headers, data } = await octokit.rest.repos.getReadme({
          owner,
          repo,
          mediaType: { format: 'html' },
        });

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
